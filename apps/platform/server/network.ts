import { EnvHttpProxyAgent, fetch as undiciFetch } from "undici";
import { SafeExecutionError } from "./diagnostics";
import type { LaunchOptions } from "playwright";

const loopback = "localhost,127.0.0.1,::1,[::1]";
export function proxyEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const httpProxy = (env.http_proxy ?? env.HTTP_PROXY ?? "").trim();
  const httpsProxy = (env.https_proxy ?? env.HTTPS_PROXY ?? "").trim() || httpProxy;
  const noProxy = [loopback, env.no_proxy ?? env.NO_PROXY ?? ""].filter(Boolean).join(",");
  for (const value of [httpProxy, httpsProxy]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      decodeURIComponent(url.username); decodeURIComponent(url.password);
      if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash) throw new Error();
    } catch { throw new SafeExecutionError("PROXY_CONFIGURATION_INVALID"); }
  }
  return { httpProxy, httpsProxy, noProxy };
}
// Explicit dispatcher works on Node 24.0 too; no startup-only environment flag is needed.
export function createNetworkFetch(env: NodeJS.ProcessEnv = process.env) {
  const config = proxyEnvironment(env);
  const dispatcher = new EnvHttpProxyAgent(config);
  const request: typeof globalThis.fetch = async (input, init) => {
    try { return await undiciFetch(input as any, { ...init, dispatcher } as any) as unknown as Response; }
    catch { throw new SafeExecutionError(config.httpProxy || config.httpsProxy ? "PROXY_NETWORK_FAILED" : "MODEL_NETWORK_FAILED"); }
  };
  return { fetch: request, close: () => dispatcher.close() };
}
let network: ReturnType<typeof createNetworkFetch> | undefined;
export const networkFetch: typeof globalThis.fetch = (input, init) => (network ??= createNetworkFetch()).fetch(input, init);

export function browserProxy(target: string, env: NodeJS.ProcessEnv = process.env): LaunchOptions["proxy"] {
  const config = proxyEnvironment(env);
  const url = new URL(target);
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return undefined;
  const value = url.protocol === "https:" ? config.httpsProxy : config.httpProxy;
  if (!value) return undefined;
  const proxy = new URL(value);
  return {
    server: `${proxy.protocol}//${proxy.host}`,
    bypass: config.noProxy.split(",").map((entry) => entry.trim()).filter(Boolean).join(","),
    ...(proxy.username ? { username: decodeURIComponent(proxy.username) } : {}),
    ...(proxy.password ? { password: decodeURIComponent(proxy.password) } : {}),
  };
}
