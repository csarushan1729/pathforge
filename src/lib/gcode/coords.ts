import type { Vec3 } from "./types";

/** CNC (Z-up) → three.js (Y-up): X right, Z up, Y into the table. */
export function cncToThree(x: number, y: number, z: number): [number, number, number] {
  return [x, z, -y];
}

export function vec(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function dist3(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.hypot(dx, dy, dz);
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function clone3(p: Vec3): Vec3 {
  return { x: p.x, y: p.y, z: p.z };
}

export const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

export function emptyBBox() {
  return {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
  };
}
