import { it, expect } from "vitest";
import { createServer } from "node:http";
import { createServer as createTlsServer } from "node:https";
import { connect } from "node:net";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { browserProxy, createNetworkFetch, proxyEnvironment } from "./network";

const exec = promisify(execFile);
async function listen(server: ReturnType<typeof createServer>) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as { port: number }).port;
}
async function close(server: ReturnType<typeof createServer>) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
it("uses env-only proxy for auth and real Midscene provider request without paid calls", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "vision-proxy-test-"));
  const sockets = new Set<import("node:stream").Duplex>();
  const requests: string[] = [];
  let tunnels = 0;
  let tls: ReturnType<typeof createTlsServer> | undefined;
  let proxy: ReturnType<typeof createServer> | undefined;
  try {
    // Public test-only self-signed identity, trusted solely by this isolated child.
    await writeFile(path.join(folder,"key.pem"), await readFile(new URL("./test-fixtures/proxy-key.pem",import.meta.url)));
    await writeFile(path.join(folder,"cert.pem"), await readFile(new URL("./test-fixtures/proxy-cert.pem",import.meta.url)));
    tls = createTlsServer({ key: await readFile(path.join(folder,"key.pem")), cert: await readFile(path.join(folder,"cert.pem")) }, (req, res) => {
      requests.push(req.url!);
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", () => {
        res.setHeader("content-type", "application/json");
        if (req.url === "/api/v1/auth/key") res.end('{"data":{}}');
        else {
          expect(body).toContain("image_url");
          res.end(JSON.stringify({id:"local-mock",choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:'<data-json>{"visible":"local probe"}</data-json>'}}]}));
        }
      });
    });
    const tlsPort = await listen(tls);
    proxy = createServer();
    proxy.on("connect", (req, client, head) => {
      tunnels++;
      expect(req.url).toBe("openrouter.ai:443");
      const upstream = connect(tlsPort,"127.0.0.1", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        client.pipe(upstream); upstream.pipe(client);
      });
      sockets.add(client); sockets.add(upstream);
      client.on("error",()=>{}); upstream.on("error",()=>{});
    });
    const port = await listen(proxy);
    // Startup CA trust; actual production modules read only the environment proxy.
    const worker = `
      import {networkFetch} from ${JSON.stringify(new URL("./network.ts",import.meta.url).href)};
      import {providerClient} from ${JSON.stringify(new URL("./runner.ts",import.meta.url).href)};
      import {defaults} from ${JSON.stringify(new URL("./domain.ts",import.meta.url).href)};
      import {chromium} from 'playwright';
      import {PlaywrightAgent} from '@midscene/web/playwright';
      if (!(await networkFetch('https://openrouter.ai/api/v1/auth/key')).ok) throw new Error('auth probe failed');
      const browser=await chromium.launch({headless:true});
      try {
        const page=await browser.newPage(); await page.setContent('<h1>local probe</h1>');
        const agent=new PlaywrightAgent(page,{generateReport:false,persistExecutionDump:false,autoPrintReportMsg:false,
          modelConfig:{MIDSCENE_MODEL_API_KEY:'local-test-only',MIDSCENE_MODEL_BASE_URL:'https://openrouter.ai/api/v1',MIDSCENE_MODEL_NAME:'qwen-test',MIDSCENE_MODEL_FAMILY:'qwen3-vl',MIDSCENE_MODEL_RETRY_COUNT:0},
          createOpenAIClient:async()=>providerClient({...defaults,apiKey:'local-test-only'})});
        const result=await agent.aiQuery('Return JSON with a visible string containing the visible title',{domIncluded:false,screenshotIncluded:true});
        if(result.visible!=='local probe') throw new Error('wrong local response');
      } finally {await browser.close();}
      console.log('local proxy auth and Midscene PASS'); process.exit(0);
    `;
    const { stdout } = await exec(process.execPath,["--import","tsx","--input-type=module","-e",worker],{
      cwd: fileURLToPath(new URL("../../../",import.meta.url)),
      env:{...process.env,HTTP_PROXY:`http://127.0.0.1:${port}`,HTTPS_PROXY:`http://127.0.0.1:${port}`,http_proxy:"",https_proxy:`http://127.0.0.1:${port}`,NO_PROXY:"",no_proxy:"",NODE_EXTRA_CA_CERTS:path.join(folder,"cert.pem")},timeout:15000,
    });
    expect(stdout).toContain("PASS"); expect(tunnels).toBeGreaterThan(0);
    expect(requests).toEqual(["/api/v1/auth/key","/api/v1/chat/completions"]);
  } finally {
    for(const socket of sockets) socket.destroy();
    if(proxy) await close(proxy); if(tls) await close(tls);
    await rm(folder,{recursive:true,force:true});
  }
},20000);
it("Node and Chromium respect env proxy, loopback/NO_PROXY, and do not silently fall back", async () => {
  let proxyHits=0, directHits=0;
  const sockets=new Set<import('node:stream').Duplex>();
  const direct=createServer((_req,res)=>{directHits++;res.end('direct');});
  const directPort=await listen(direct);
  const proxy=createServer((_req,res)=>{proxyHits++;res.end('proxied');});
  proxy.on('connect',(_req,client)=>{
    proxyHits++; sockets.add(client); client.on('error',()=>{});
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    client.once('data',()=>client.end('HTTP/1.1 200 OK\r\nContent-Length: 7\r\nConnection: close\r\n\r\nproxied'));
  });
  const port=await listen(proxy);
  const env={HTTP_PROXY:`http://127.0.0.1:${port}`,HTTPS_PROXY:`http://127.0.0.1:${port}`,NO_PROXY:'localhost,*.internal.test'};
  const network=createNetworkFetch(env);
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    expect(await (await network.fetch('http://external.test/probe')).text()).toBe('proxied');
    const before=proxyHits;
    expect(await (await network.fetch(`http://127.0.0.1:${directPort}`)).text()).toBe('direct');
    expect(proxyHits).toBe(before);
    expect(browserProxy('http://127.0.0.1:4311/store/a',env)).toBeUndefined();
    browser=await chromium.launch({headless:true,args:["--host-resolver-rules=MAP bypass.internal.test 127.0.0.1"],proxy:browserProxy('http://external.test',env)});
    const page=await browser.newPage(); await page.goto('http://external.test/probe');
    expect(await page.textContent('body')).toBe('proxied');
    await page.goto(`http://127.0.0.1:${directPort}`); expect(await page.textContent('body')).toBe('direct');
    await page.goto(`http://bypass.internal.test:${directPort}`); expect(await page.textContent("body")).toBe("direct");
    expect(directHits).toBeGreaterThanOrEqual(3);
    await expect(network.fetch('http://bypass.internal.test',{signal:AbortSignal.timeout(2000)})).rejects.toThrow();
    // NO_PROXY host is unresolvable, so successful proxy fallback would fail this assertion.
    const proxyBefore = proxyHits;
    await expect(network.fetch("http://another.internal.test",{signal:AbortSignal.timeout(2000)})).rejects.toThrow();
    expect(proxyHits).toBe(proxyBefore);
    const badBrowser = await chromium.launch({headless:true,proxy:{server:"http://127.0.0.1:1"}});
    try { const badPage = await badBrowser.newPage(); await expect(badPage.goto("http://external.test",{timeout:2000})).rejects.toThrow(/ERR_PROXY_CONNECTION_FAILED/); }
    finally {await badBrowser.close();}
    const broken=createNetworkFetch({http_proxy:'http://127.0.0.1:1'});
    try { await expect(broken.fetch(`http://external.test:${directPort}`,{signal:AbortSignal.timeout(2000)})).rejects.toMatchObject({code:'PROXY_NETWORK_FAILED'}); }
    finally{await broken.close();}
    expect(proxyEnvironment({http_proxy:'http://proxy.test:1',HTTP_PROXY:'http://ignored.test:2'}).httpProxy).toBe('http://proxy.test:1');
    expect(()=>proxyEnvironment({HTTPS_PROXY:'secret-invalid-url'})).toThrow('PROXY_CONFIGURATION_INVALID');
  } finally {
    await browser?.close(); await network.close(); for(const socket of sockets) socket.destroy(); await close(proxy);await close(direct);
  }
},15000);
