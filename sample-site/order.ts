import { z } from "zod";
export const catalog = [
  { id: "mug", name: "Red mug", cents: 1200, description: "A bright ceramic companion for your daily ritual." },
  { id: "notebook", name: "Studio notebook", cents: 3200, description: "A considered space for your next idea." },
  { id: "clips", name: "Cable clips", cents: 800, description: "Small details for a quieter workspace." },
] as const;
export const orderInput = z.object({
  product: z.enum(["mug", "notebook", "clips"]),
  quantity: z.number().int().min(1).max(5),
  name: z.string().trim().min(1).max(80),
  email: z.email().max(120),
}).strict();
export function prepareOrder(input: unknown) {
  const data = orderInput.parse(input);
  const product = catalog.find(p => p.id === data.product)!;
  return { ...data, productName: product.name, unitCents: product.cents, subtotalCents: product.cents * data.quantity, shippingCents: 0, totalCents: product.cents * data.quantity };
}
export type Order = ReturnType<typeof prepareOrder>;
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
