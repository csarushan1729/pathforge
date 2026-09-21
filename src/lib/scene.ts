export const SCENE = {
  background: "#09090b",
  table: "#1c1c22",
  slot: "#0c0c10",
  stock: "#8b9199",
  stockEdge: "#c5c9d1",
  feed: "#8fb8b4",
  rapid: "#6a7080",
  flute: "#3e424a",
  shank: "#9aa0a8",
  collet: "#2e3138",
  holder: "#1c1e24",
  axisX: "#c07070",
  axisY: "#70a878",
  axisZ: "#6a8ec8",
  traveled: "#d5dbe3",
} as const;

export function heightColor(z: number, zMin: number, zMax: number): [number, number, number] {
  const span = Math.max(1e-6, zMax - zMin);
  const t = Math.min(1, Math.max(0, (z - zMin) / span));
  const lo = { r: 0.22, g: 0.38, b: 0.4 };
  const hi = { r: 0.78, g: 0.82, b: 0.84 };
  return [lo.r + (hi.r - lo.r) * t, lo.g + (hi.g - lo.g) * t, lo.b + (hi.b - lo.b) * t];
}
