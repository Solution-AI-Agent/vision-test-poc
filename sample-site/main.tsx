import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ShoppingBag, PackageCheck, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { catalog, money, orderInput, type Order } from "./order";
import "../src/index.css";
import "./style.css";
type Presentation = { angle: number; shift: number; cover: boolean; noticeHeight: number; mugColor: string; firstBar: number; secondBar: number };
async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Please try again.");
  return data;
}
function Operator() {
  const [state, setState] = useState("normal"), [error, setError] = useState("");
  useEffect(() => { api("/api/operator").then(d => setState(d.state)).catch(e => setError(e.message)); }, []);
  async function select(value: string) {
    if (!value) return;
    try { const d = await api("/api/operator", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: value }) }); setState(d.state); setError(""); } catch (e: any) { setError(e.message); }
  }
  return <main className="sample-operator"><Card><CardHeader><CardTitle>Sample presentation controls</CardTitle><CardDescription>Only this operator page identifies injected rendering states. Changes apply to newly opened order pages; order data and validation stay the same.</CardDescription></CardHeader><CardContent><ToggleGroup type="single" value={state} onValueChange={select} className="flex-wrap">{[["normal", "Normal"], ["misaligned", "Misalignment"], ["occluded", "Occlusion"], ["clipped", "Clipping"], ["product-image", "Product image"], ["chart", "Chart"]].map(([value, label]) => <ToggleGroupItem key={value} value={value}>{label}</ToggleGroupItem>)}</ToggleGroup>{error && <Alert variant="destructive"><AlertTitle>Could not change presentation</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}</CardContent><CardFooter className="gap-3 flex-wrap"><Button variant="outline" onClick={() => select("normal")}>Reset to normal</Button><Button asChild><a href="/order" target="_blank">Open order site</a></Button></CardFooter></Card></main>;
}
function ProductVisual({ product, color }: { product: string; color: string }) {
  return product === "mug" ? <svg role="img" aria-label="Red mug" viewBox="0 0 240 160" className="sample-mug"><ellipse cx="112" cy="139" rx="77" ry="9" fill="var(--border)"/><path d="M155 48h25c35 0 35 64 0 64h-25" fill="none" stroke={color} strokeWidth="19"/><path d="M42 34h120v76c0 29-120 29-120 0Z" fill={color}/><ellipse cx="102" cy="34" rx="60" ry="13" fill={color}/><ellipse cx="102" cy="34" rx="48" ry="8" fill="var(--background)"/><path d="M56 49v54" stroke="var(--background)" strokeOpacity=".35" strokeWidth="9" strokeLinecap="round"/></svg> : <ShoppingBag size={64}/>;
}
function CollectionChart({ presentation }: { presentation?: Presentation }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c=ref.current?.getContext("2d"); if(!c||!presentation)return; c.clearRect(0,0,240,84); c.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim(); c.fillRect(4,6,presentation.firstBar*2.7,20); c.fillRect(4,48,presentation.secondBar*2.7,20); }, [presentation]);
  return <section className="sample-chart"><h2>This month’s community favourites</h2><div className="sample-chart-grid"><div><p data-testid="chart-first">Notebooks · 80%</p><p data-testid="chart-second">Mugs · 20%</p></div><canvas ref={ref} width={240} height={84} role="img" aria-label="Community favourites: notebooks 80%, mugs 20%"/></div></section>;
}
function Store() {
  const [presentation, setPresentation] = useState<Presentation>();
  const [product, setProduct] = useState<"mug" | "notebook" | "clips">("mug"), [quantity, setQuantity] = useState(1);
  const [name, setName] = useState(""), [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order>(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { api("/api/presentation").then(setPresentation).catch(e => setError(e.message)); }, []);
  const item = catalog.find(p => p.id === product)!;
  const valid = orderInput.safeParse({ product, quantity, name, email }).success;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!valid || busy) return;
    setBusy(true); setError("");
    try { setOrder(await api("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product, quantity, name, email }) })); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="sample-shell"><header className="sample-header"><span className="sample-brand"><ShoppingBag size={22}/> ATELIER / GOODS</span><span>Thoughtful tools for your everyday.</span></header><div className="sample-intro"><p className="text-muted-foreground">{order ? "ORDER / CONFIRMATION" : "STUDIO ESSENTIALS / CHECKOUT"}</p><h1>{order ? "Order confirmed" : "A little order. A better everyday."}</h1><p className="text-muted-foreground">{order ? "Your order is ready. Keep your receipt and collection details." : "Choose something useful. We’ll take care of the details."}</p></div>{error && <Alert variant="destructive"><AlertTitle>Could not complete request</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
  <div className="sample-grid"><Card><CardHeader><CardTitle>{order ? "Your order" : "Make it yours"}</CardTitle><CardDescription>{order ? <span data-testid="recipient">{order.name} · {order.email}</span> : "Complimentary shipping on every order."}</CardDescription></CardHeader><CardContent>
  {!order ? <form id="order-form" onSubmit={submit}><FieldGroup><Field><FieldLabel>Choose your essential</FieldLabel><ToggleGroup type="single" value={product} onValueChange={v => { if (v === "mug" || v === "notebook" || v === "clips") setProduct(v); }} aria-label="Product">{catalog.map(p => <ToggleGroupItem key={p.id} value={p.id}>{p.name}</ToggleGroupItem>)}</ToggleGroup><p className="text-sm text-muted-foreground">{item.description} · {money(item.cents)} each</p></Field><Field data-invalid={(quantity < 1 || quantity > 5 || !Number.isInteger(quantity)) || undefined}><FieldLabel htmlFor="quantity">Quantity</FieldLabel><Input id="quantity" type="number" min={1} max={5} step={1} value={Number.isNaN(quantity) ? "" : quantity} onChange={e => setQuantity(e.target.valueAsNumber)} aria-invalid={quantity < 1 || quantity > 5 || !Number.isInteger(quantity)}/></Field><div className="sample-fields"><Field><FieldLabel htmlFor="name">Recipient name</FieldLabel><Input id="name" maxLength={80} value={name} onChange={e => setName(e.target.value)}/></Field><Field data-invalid={(!!email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) || undefined}><FieldLabel htmlFor="email">Email address</FieldLabel><Input id="email" type="email" maxLength={120} value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)}/></Field></div></FieldGroup></form> : <div className="flex flex-col gap-5"><div className="sample-line" data-testid="item"><div className="sample-confirmed-product"><ProductVisual product={order.product} color={presentation?.mugColor ?? "#d92b2b"}/></div><span>{order.productName} × {order.quantity}</span><strong>{money(order.subtotalCents)}</strong></div><div className="sample-line"><span>Shipping</span><strong>$0.00</strong></div><div className="sample-line" data-testid="order-total"><span>Total</span><strong>{money(order.totalCents)}</strong></div><section className="sample-collection"><h2><PackageCheck size={20}/> Collection details</h2><div data-testid="instructions" style={{ height: presentation?.noticeHeight ?? 84, overflow: "hidden" }}><p>Delivery in 2 business days.</p><p>Collection window: 48 hours.</p><p>Photo ID is required at pickup.</p></div></section></div>}
  </CardContent><CardFooter>{!order ? <Button type="submit" form="order-form" disabled={!valid || busy || !presentation}>{busy ? "Preparing order…" : "Confirm order"}</Button> : <Button type="button" variant="outline" onClick={event => { event.preventDefault(); setOrder(undefined); setError(""); }}><Check data-icon="inline-start"/>Start another order</Button>}</CardFooter></Card>
  <Card><CardHeader><CardTitle>{order ? "Your receipt" : "Order summary"}</CardTitle><CardDescription>{order ? "A copy for your records." : "Simple essentials, thoughtfully made."}</CardDescription></CardHeader><CardContent className="sample-receipt-wrap">{order ? <><section aria-label="Order receipt" className="sample-receipt" style={{ transform: `translateX(${presentation?.shift ?? 0}px) rotate(${presentation?.angle ?? 0}deg)` }}><h2>ORDER RECEIPT</h2><div className="sample-line" data-testid="receipt-item"><span>{order.productName} × {order.quantity}</span><span>{money(order.subtotalCents)}</span></div><div className="sample-line"><span>Shipping</span><span>$0.00</span></div><Separator/><div className="sample-line sample-receipt-total" data-testid="receipt-total"><span>Total</span><strong>{money(order.totalCents)}</strong></div><p>Thank you for your order.</p></section>{presentation?.cover && <div className="sample-render-panel" aria-hidden="true"/>}</> : <div className="sample-preview"><ProductVisual product={product} color={presentation?.mugColor ?? "#d92b2b"}/><p>{item.name} × {Number.isFinite(quantity) ? quantity : "—"}</p><strong data-testid="preview-total">{Number.isInteger(quantity) && quantity >= 1 && quantity <= 5 ? money(item.cents * quantity) : "—"}</strong><p className="text-muted-foreground">Including complimentary shipping</p></div>}<CollectionChart presentation={presentation}/></CardContent><CardFooter><span className="text-muted-foreground">Carefully packed. Ready for your everyday.</span></CardFooter></Card></div><footer className="sample-footer">ATELIER GOODS · Sample store · Orders are simulated. No payment is collected.</footer></main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode>{location.pathname === "/operator" ? <Operator/> : <Store/>}</React.StrictMode>);
