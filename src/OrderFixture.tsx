import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PackageCheck, ShoppingBag } from "lucide-react";
import "./fixture.css";
type Presentation = {
  noticeHeight: number;
  receiptTotal: number;
  decoration: boolean;
};
export default function OrderFixture() {
  const [presentation, setPresentation] = useState<Presentation>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const operator = location.pathname === "/fixture/operator";
  const [state, setState] = useState("normal");
  useEffect(() => {
    if (!operator)
      fetch("/api/fixture/presentation")
        .then((r) => r.json())
        .then(setPresentation);
  }, [operator]);
  useEffect(() => {
    if (!confirmed || !presentation || !canvas.current) return;
    const c = canvas.current.getContext("2d")!;
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, 360, 340);
    c.fillStyle = "#152c29";
    c.font = "bold 22px sans-serif";
    c.fillText("ORDER RECEIPT", 24, 40);
    c.font = "16px sans-serif";
    c.fillText("Studio notebook", 24, 100);
    c.fillText("$32.00", 270, 100);
    c.fillText("Cable clips × 2", 24, 145);
    c.fillText("$16.00", 270, 145);
    c.fillText("Shipping", 24, 190);
    c.fillText("$0.00", 280, 190);
    c.strokeStyle = "#cad9d5";
    c.beginPath();
    c.moveTo(24, 220);
    c.lineTo(336, 220);
    c.stroke();
    c.font = "bold 24px sans-serif";
    c.fillText("Total", 24, 270);
    c.fillText(`$${presentation.receiptTotal.toFixed(2)}`, 252, 270);
    c.font = "13px sans-serif";
    c.fillText("Thank you for your order.", 24, 316);
  }, [confirmed, presentation]);
  if (operator)
    return (
      <main className="fixture-shell">
        <h1>Controlled experiment · operator</h1>
        <p>
          Injected states belong only to this operator view. Order screenshots
          do not disclose the state.
        </p>
        <ToggleGroup
          type="single"
          value={state}
          onValueChange={async (value) => {
            if (!value) return;
            const r = await fetch("/api/fixture/operator", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state: value }),
            });
            if (r.ok) setState(value);
          }}
        >
          {[
            ["normal", "Normal"],
            ["clipped", "Delivery layout"],
            ["total", "Receipt render"],
            ["decoration", "Decoration control"],
          ].map(([value, label]) => (
            <ToggleGroupItem key={value} value={value}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button asChild>
          <a href="/fixture/order" target="_blank">
            Open order site
          </a>
        </Button>
        <p>
          Same DOM suite and frozen criteria: evaluation/CRITERIA.json.
          Screenshot assertions can detect these rendering changes too.
        </p>
      </main>
    );
  if (!presentation)
    return <main className="fixture-shell">Loading order…</main>;
  return (
    <main
      className={`fixture-shell ${presentation.decoration ? "fixture-decoration" : ""}`}
    >
      <header className="fixture-header">
        <span className="fixture-brand">
          <ShoppingBag size={22} /> ATELIER / GOODS
        </span>
        <span>Thoughtful tools for your everyday.</span>
      </header>
      <div className="fixture-intro">
        <p className="text-muted-foreground">CHECKOUT / ORDER REVIEW</p>
        <h1>{confirmed ? "Order confirmed" : "Review your order"}</h1>
        <p className="text-muted-foreground">
          {confirmed
            ? "Your order is ready. Keep your receipt and collection details."
            : "A few essentials, carefully selected. Review your details below."}
        </p>
      </div>
      <div className="fixture-grid">
        <Card>
          <CardHeader>
            <CardTitle>
              {confirmed ? "Your order" : "Delivery details"}
            </CardTitle>
            <CardDescription>
              {confirmed ? (
                <span data-testid="recipient">
                  {name} · {email}
                </span>
              ) : (
                "Tell us who will collect your order."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5">
              {!confirmed && (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="recipient-name">
                      Recipient name
                    </FieldLabel>
                    <Input
                      id="recipient-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="recipient-email">
                      Email address
                    </FieldLabel>
                    <Input
                      id="recipient-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              )}
              <div className="fixture-item" data-testid="notebook">
                <span>Studio notebook × 1</span>
                <strong>$32.00</strong>
              </div>
              <div className="fixture-item" data-testid="clips">
                <span>Cable clips × 2</span>
                <strong>$16.00</strong>
              </div>
              <div className="fixture-item" data-testid="shipping">
                <span>Shipping</span>
                <strong>$0.00</strong>
              </div>
              <output
                data-testid="semantic-total"
                aria-label="Order total"
                className="sr-only"
              >
                $48.00
              </output>
              {confirmed && (
                <section className="fixture-delivery">
                  <h2>
                    <PackageCheck size={20} /> Collection details
                  </h2>
                  <div
                    data-testid="delivery"
                    style={{
                      height: presentation.noticeHeight,
                      overflow: "hidden",
                    }}
                  >
                    <p>Delivery in 2 business days.</p>
                    <p>Collection window: 48 hours.</p>
                    <p>Photo ID is required at pickup.</p>
                  </div>
                </section>
              )}
            </div>
          </CardContent>
          <CardFooter>
            {!confirmed ? (
              <Button
                disabled={!name.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)}
                onClick={() => setConfirmed(true)}
              >
                Confirm order
              </Button>
            ) : (
              <span className="text-muted-foreground">
                Order saved · Receipt available
              </span>
            )}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {confirmed ? "Your receipt" : "Order summary"}
            </CardTitle>
            <CardDescription>
              {confirmed
                ? "A copy for your records."
                : "3 items · Complimentary shipping"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {confirmed ? (
              <canvas
                ref={canvas}
                width={360}
                height={340}
                role="img"
                aria-label="Receipt: total $48.00"
              />
            ) : (
              <div className="fixture-preview">
                <ShoppingBag size={64} />
                <p>Studio essentials</p>
                <strong>$48.00</strong>
                <p className="text-muted-foreground">
                  Total, including shipping
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <span className="text-muted-foreground">
              Secure checkout · No payment required for this demo
            </span>
          </CardFooter>
        </Card>
      </div>
      <footer className="fixture-footer">
        ATELIER GOODS · Customer care · Order support
      </footer>
    </main>
  );
}
