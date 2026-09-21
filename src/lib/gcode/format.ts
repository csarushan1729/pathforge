export function fmtAxis(n: number): string {
  const v = Math.abs(n) < 5e-5 ? 0 : n;
  return v.toFixed(3);
}

export function fmtMm(n: number, digits = 1): string {
  return `${n.toFixed(digits)} mm`;
}

export function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtFeed(n: number): string {
  return Math.round(n).toString();
}
