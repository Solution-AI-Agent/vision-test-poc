import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ShoppingBag, PackageCheck, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@vision-qa/ui/components/card";
import { Button } from "@vision-qa/ui/components/button";
import { Input } from "@vision-qa/ui/components/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@vision-qa/ui/components/field";
import { ToggleGroup, ToggleGroupItem } from "@vision-qa/ui/components/toggle-group";
import { Alert, AlertTitle, AlertDescription } from "@vision-qa/ui/components/alert";
import { Separator } from "@vision-qa/ui/components/separator";
import { catalog, money, orderInput, type Order } from "./order";
import "@vision-qa/ui/theme.css";
import "./style.css";
import { directPresentation, type Presentation } from "./presentation";
import { cn } from "@vision-qa/ui/utils";
async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "잠시 후 다시 시도해주세요.");
  return data;
}
function Operator() {
  const [state, setState] = useState("normal"), [error, setError] = useState("");
  useEffect(() => { api("/api/operator").then(d => setState(d.state)).catch(e => setError(e.message)); }, []);
  async function select(value: string) {
    if (!value) return;
    try { const d = await api("/api/operator", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: value }) }); setState(d.state); setError(""); } catch (e: any) { setError(e.message); }
  }
  return <main className="sample-operator"><Card><CardHeader><CardTitle>샘플 매장 화면 설정</CardTitle><CardDescription>이 설정은 /order의 앱 소스 레이아웃을 선택합니다. 각 직접 매장 주소는 앱 소스에 고정되어 이 설정의 영향을 받지 않습니다.</CardDescription></CardHeader><CardContent><ToggleGroup type="single" value={state} onValueChange={select} className="flex-wrap">{[["normal", "정상"], ["misaligned", "정렬 틀어짐"], ["occluded", "겹침"], ["clipped", "안내 잘림"], ["product-image", "상품 이미지"], ["chart", "차트"]].map(([value, label]) => <ToggleGroupItem key={value} value={value}>{label}</ToggleGroupItem>)}</ToggleGroup>{error && <Alert variant="destructive"><AlertTitle>화면 설정을 변경하지 못했습니다.</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}<div className="sample-case-links">{[["a","정상 비교"],["b","복합 화면 · 기존 주소"],["c","크기·배치 뒤틀림"],["d","실제 차트와 주문 요약 겹침"],["e","필수 안내 잘림"],["f","상품 이미지 불일치"],["g","차트 표현 불일치"]].map(([path,label]) => <Button asChild variant="outline" key={path}><a href={`/store/${path}`} target="_blank">매장 {path.toUpperCase()} · {label}</a></Button>)}</div></CardContent><CardFooter className="gap-3 flex-wrap"><Button variant="outline" onClick={() => select("normal")}>정상으로 초기화</Button><Button asChild><a href="/order" target="_blank">주문 사이트 열기</a></Button><Button asChild variant="outline"><a href="/store/a" target="_blank">매장 A 열기</a></Button><Button asChild variant="outline"><a href="/store/b" target="_blank">매장 B 열기</a></Button></CardFooter></Card></main>;
}
function ProductVisual({ product, color }: { product: string; color: string }) {
  return product === "mug" ? <svg role="img" aria-label="빨간 머그" viewBox="0 0 240 160" className="sample-mug"><ellipse cx="112" cy="139" rx="77" ry="9" fill="var(--border)"/><path d="M155 48h25c35 0 35 64 0 64h-25" fill="none" stroke={color} strokeWidth="19"/><path d="M42 34h120v76c0 29-120 29-120 0Z" fill={color}/><ellipse cx="102" cy="34" rx="60" ry="13" fill={color}/><ellipse cx="102" cy="34" rx="48" ry="8" fill="var(--background)"/><path d="M56 49v54" stroke="var(--background)" strokeOpacity=".35" strokeWidth="9" strokeLinecap="round"/></svg> : <ShoppingBag size={64}/>;
}
function CollectionChart({ presentation, integrated = false }: { presentation?: Presentation; integrated?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c=ref.current?.getContext("2d"); if(!c||!presentation)return; c.clearRect(0,0,240,84); c.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim(); c.fillRect(4,6,presentation.firstBar*2.7,20); c.fillRect(4,48,presentation.secondBar*2.7,20); }, [presentation]);
  return <section className={cn("sample-chart", integrated && "sample-chart-integrated")}><h2>이번 달 인기 상품 비율</h2><div className="sample-chart-grid"><div><p data-testid="chart-first">노트 · 80%</p><p data-testid="chart-second">머그 · 20%</p></div><canvas ref={ref} width={240} height={84} role="img" aria-label="인기 상품 비율: 노트 80%, 머그 20%"/></div></section>;
}
function CollectionInstructions({ presentation }: { presentation?: Presentation }) {
  return <section className="sample-collection"><h2><PackageCheck size={20}/> 수령 안내</h2><div data-testid="instructions" style={{ height: presentation?.noticeHeight ?? 84, overflow: "hidden" }}><p>영업일 기준 2일 안에 배송됩니다.</p><p>수령 가능 시간은 48시간입니다.</p><p>수령할 때 사진이 있는 신분증이 필요합니다.</p></div></section>;
}
function Store() {
  const [presentation, setPresentation] = useState<Presentation | undefined>(() => directPresentation(location.pathname));
  const [product, setProduct] = useState<"mug" | "notebook" | "clips">("mug"), [quantity, setQuantity] = useState(1);
  const [name, setName] = useState(""), [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order>(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (!directPresentation(location.pathname)) api("/api/presentation").then(setPresentation).catch(e => setError(e.message)); }, []);
  const item = catalog.find(p => p.id === product)!;
  const emailInvalid = !!email && !orderInput.shape.email.safeParse(email).success;
  const valid = orderInput.safeParse({ product, quantity, name, email }).success;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!valid || busy) return;
    setBusy(true); setError("");
    try { setOrder(await api("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product, quantity, name, email }) })); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="sample-shell"><header className="sample-header"><span className="sample-brand"><ShoppingBag size={22}/> ATELIER / GOODS</span><span>일상을 위한 작은 도구들.</span></header><div className="sample-intro"><p className="text-muted-foreground">{order ? "주문 / 완료 안내" : "일상 도구 / 주문하기"}</p><h1>{order ? "주문이 완료되었습니다." : "작은 주문으로, 더 나은 일상."}</h1><p className="text-muted-foreground">{order ? "주문이 준비되었습니다. 영수증과 수령 안내를 확인해주세요." : "필요한 물건을 골라주세요. 정성껏 준비하겠습니다."}</p></div>{error && <Alert variant="destructive"><AlertTitle>요청을 처리하지 못했습니다.</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
  <div className="sample-grid"><Card><CardHeader><CardTitle>{order ? "주문 내역" : "나만의 물건 고르기"}</CardTitle><CardDescription>{order ? <span data-testid="recipient">{order.name} · {order.email}</span> : "모든 주문은 배송비가 무료입니다."}</CardDescription></CardHeader><CardContent>
  {!order ? <><form id="order-form" onSubmit={submit}><FieldGroup><Field><FieldLabel>상품 선택</FieldLabel><ToggleGroup type="single" value={product} onValueChange={v => { if (v === "mug" || v === "notebook" || v === "clips") setProduct(v); }} aria-label="상품">{catalog.map(p => <ToggleGroupItem key={p.id} value={p.id}>{p.name}</ToggleGroupItem>)}</ToggleGroup><p className="text-sm text-muted-foreground">{item.description} · {money(item.cents)} / 개</p></Field><Field data-invalid={(quantity < 1 || quantity > 5 || !Number.isInteger(quantity)) || undefined}><FieldLabel htmlFor="quantity">수량</FieldLabel><Input id="quantity" placeholder="1~5개" type="number" min={1} max={5} step={1} value={Number.isNaN(quantity) ? "" : quantity} onChange={e => setQuantity(e.target.valueAsNumber)} aria-invalid={quantity < 1 || quantity > 5 || !Number.isInteger(quantity)}/>{(quantity < 1 || quantity > 5 || !Number.isInteger(quantity)) && <FieldError>수량은 1~5개의 정수로 입력해주세요.</FieldError>}</Field><div className="sample-fields"><Field><FieldLabel htmlFor="name">받는 분</FieldLabel><Input id="name" placeholder="받는 분의 이름" maxLength={80} value={name} onChange={e => setName(e.target.value)}/></Field><Field data-invalid={(emailInvalid) || undefined}><FieldLabel htmlFor="email">이메일 주소</FieldLabel><Input id="email" placeholder="예: minsu@example.test" type="email" maxLength={120} value={email} onChange={e => setEmail(e.target.value)} aria-invalid={emailInvalid}/>{emailInvalid && <FieldError>올바른 이메일 주소를 입력해주세요.</FieldError>}</Field></div></FieldGroup></form><CollectionInstructions presentation={presentation}/></> : <div className="flex flex-col gap-5"><div className="sample-line" data-testid="item"><div className="sample-confirmed-product"><ProductVisual product={order.product} color={presentation?.mugColor ?? "#d92b2b"}/></div><span>{order.productName} × {order.quantity}</span><strong>{money(order.subtotalCents)}</strong></div><div className="sample-line"><span>배송비</span><strong>$0.00</strong></div><div className="sample-line" data-testid="order-total"><span>합계</span><strong>{money(order.totalCents)}</strong></div><CollectionInstructions presentation={presentation}/></div>}
  </CardContent><CardFooter>{!order ? <Button type="submit" form="order-form" disabled={!valid || busy || !presentation}>{busy ? "주문 준비 중…" : "주문 확정하기"}</Button> : <Button type="button" variant="outline" onClick={event => { event.preventDefault(); setOrder(undefined); setError(""); }}><Check data-icon="inline-start"/>다시 주문하기</Button>}</CardFooter></Card>
  <Card><CardHeader><CardTitle>{order ? "영수증" : "주문 요약"}</CardTitle><CardDescription>{order ? "주문 내용을 확인하고 보관해주세요." : "일상에 꼭 필요한 물건을 정성껏 준비합니다."}</CardDescription></CardHeader><CardContent className="sample-receipt-wrap">{order ? <><section aria-label="주문 영수증" className={cn("sample-receipt", presentation?.distorted && "sample-layout-distorted")} style={{ transform: `translateX(${presentation?.shift ?? 0}px) rotate(${presentation?.angle ?? 0}deg) scale(1,${presentation?.distorted ? 0.55 : 1})` }}><h2>주문 영수증</h2><div className="sample-line" data-testid="receipt-item"><span>{order.productName} × {order.quantity}</span><span>{money(order.subtotalCents)}</span></div><div className="sample-line"><span>배송비</span><span>$0.00</span></div><Separator/><div className="sample-line sample-receipt-total" data-testid="receipt-total"><span>합계</span><strong>{money(order.totalCents)}</strong></div><p>주문해주셔서 감사합니다.</p></section></> : <div className={cn("sample-preview", presentation?.distorted && "sample-layout-distorted")} style={presentation?.distorted ? {transform: "rotate(-16deg) scale(1,0.55)"} : undefined}><ProductVisual product={product} color={presentation?.mugColor ?? "#d92b2b"}/><p>{item.name} × {Number.isFinite(quantity) ? quantity : "—"}</p><strong data-testid="preview-total">{Number.isInteger(quantity) && quantity >= 1 && quantity <= 5 ? money(item.cents * quantity) : "—"}</strong><p className="text-muted-foreground">무료 배송 포함</p></div>}<CollectionChart presentation={presentation} integrated={presentation?.layout === "integrated"}/></CardContent><CardFooter><span className="text-muted-foreground">정성껏 포장해 일상으로 보내드립니다.</span></CardFooter></Card></div><footer className="sample-footer">ATELIER GOODS · 샘플 매장 · 모의 주문이며 실제 결제는 발생하지 않습니다.</footer></main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode>{location.pathname === "/operator" ? <Operator/> : <Store/>}</React.StrictMode>);
