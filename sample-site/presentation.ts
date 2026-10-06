// Store revisions live in the application source. They never affect order business rules.
export type Presentation = {
  angle: number;
  shift: number;
  layout: "regular" | "integrated";
  noticeHeight: number;
  mugColor: string;
  firstBar: number;
  secondBar: number;
};
const standard: Presentation = { angle: 0, shift: 0, layout: "regular", noticeHeight: 84, mugColor: "#d92b2b", firstBar: 80, secondBar: 20 };
export function presentationFor(state: string): Presentation {
  return {
    ...standard,
    ...(state === "misaligned" ? { angle: -8, shift: 36 } : {}),
    ...(state === "occluded" ? { layout: "integrated" as const } : {}),
    ...(state === "clipped" ? { noticeHeight: 26 } : {}),
    ...(state === "product-image" ? { mugColor: "#1467e8" } : {}),
    ...(state === "chart" ? { firstBar: 20, secondBar: 80 } : {}),
  };
}
// Neutral, stable URLs: direct visits do not fetch presentation/operator state.
export function directPresentation(pathname: string): Presentation | undefined {
  if (pathname === "/store/a") return { ...standard };
  if (pathname === "/store/b") return {
    ...standard,
    layout: "integrated", noticeHeight: 26, mugColor: "#1467e8", firstBar: 20, secondBar: 80,
  };
}
