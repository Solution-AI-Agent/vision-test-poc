import { it, expect } from "vitest";
import { prepareOrder } from "./order";
it("calculates authoritative totals across products and quantities", () => {
 expect(prepareOrder({product:"mug",quantity:2,name:" Alex Morgan ",email:"alex@example.test"})).toMatchObject({name:"Alex Morgan",productName:"Red mug",unitCents:1200,totalCents:2400});
 expect(prepareOrder({product:"notebook",quantity:2,name:"Alex",email:"alex@example.test"}).totalCents).toBe(6400);
});
it("rejects invalid input and supplied prices or presentation flags", () => {
 const input={product:"mug",quantity:1,name:"Alex",email:"alex@example.test"};
 for(const bad of [{...input,quantity:0},{...input,quantity:1.5},{...input,email:"invalid"},{...input,totalCents:1},{...input,state:"occluded"}])expect(()=>prepareOrder(bad)).toThrow();
});
