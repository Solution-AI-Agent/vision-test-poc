import { z } from "zod";
export const catalog = [
  { id: "mug", name: "빨간 머그", cents: 1200, description: "매일의 시간을 밝히는 도자기 머그입니다." },
  { id: "notebook", name: "스튜디오 노트", cents: 3200, description: "다음 아이디어를 기록할 여유로운 공간입니다." },
  { id: "clips", name: "케이블 클립", cents: 800, description: "작업 공간의 케이블을 깔끔하게 정리합니다." },
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
