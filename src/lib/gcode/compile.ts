import { clone3, dist3, emptyBBox, ORIGIN } from "./coords";
import type { BBox, MotionKind, PathVertex, Polyline, Pose, Toolpath, Vec3 } from "./types";

const RAPID_MM_MIN = 12000;
const EPS = 1e-6;
const WORD_RE = /([A-Za-z])\s*([+-]?(?:\d+\.?\d*|\.\d+))/g;

type Plane = 17 | 18 | 19;

type Modal = {
  motion: 0 | 1 | 2 | 3;
  plane: Plane;
  abs: boolean;
  unit: number;
  feed: number;
  spindle: number;
  spindleOn: boolean;
};

function stripLine(raw: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "(") {
      depth += 1;
      continue;
    }
    if (c === ")" && depth > 0) {
      depth -= 1;
      continue;
    }
    if (depth > 0) continue;
    if (c === ";" || c === "%") break;
    out += c;
  }
  return out.replace(/\*\d+\s*$/, "").trim();
}

function emptyToolpath(lineCount: number, warnings: string[]): Toolpath {
  return {
    vertices: [{ ...ORIGIN, kind: "rapid", feed: RAPID_MM_MIN, spindle: 0, line: 0, dist: 0, time: 0 }],
    polylines: [],
    bbox: emptyBBox(),
    stock: emptyBBox(),
    feedLength: 0,
    rapidLength: 0,
    totalTime: 0,
    lineCount,
    lineTimes: Array.from({ length: lineCount }, () => -1),
    warnings,
  };
}

function growBox(box: BBox, p: Vec3) {
  box.min.x = Math.min(box.min.x, p.x);
  box.min.y = Math.min(box.min.y, p.y);
  box.min.z = Math.min(box.min.z, p.z);
  box.max.x = Math.max(box.max.x, p.x);
  box.max.y = Math.max(box.max.y, p.y);
  box.max.z = Math.max(box.max.z, p.z);
}

function pushPoly(polylines: Polyline[], kind: MotionKind, start: Vec3, end: Vec3) {
  const last = polylines[polylines.length - 1];
  if (last && last.kind === kind && last.points.length > 0) {
    const tail = last.points[last.points.length - 1];
    if (dist3(tail, start) < 1e-4) {
      last.points.push(clone3(end));
      return;
    }
  }
  polylines.push({ kind, points: [clone3(start), clone3(end)] });
}

function axisPair(plane: Plane, p: Vec3): { u: number; v: number; w: number } {
  if (plane === 18) return { u: p.x, v: p.z, w: p.y };
  if (plane === 19) return { u: p.y, v: p.z, w: p.x };
  return { u: p.x, v: p.y, w: p.z };
}

function fromAxisPair(plane: Plane, u: number, v: number, w: number): Vec3 {
  if (plane === 18) return { x: u, y: w, z: v };
  if (plane === 19) return { x: w, y: u, z: v };
  return { x: u, y: v, z: w };
}

function offsetsForPlane(plane: Plane, i: number, j: number, k: number) {
  if (plane === 18) return { du: i, dv: k };
  if (plane === 19) return { du: j, dv: k };
  return { du: i, dv: j };
}

function tessellateArc(
  start: Vec3,
  end: Vec3,
  i: number,
  j: number,
  k: number,
  clockwise: boolean,
  plane: Plane,
): Vec3[] {
  const s = axisPair(plane, start);
  const e = axisPair(plane, end);
  const { du, dv } = offsetsForPlane(plane, i, j, k);
  const cu = s.u + du;
  const cv = s.v + dv;
  const r = Math.hypot(s.u - cu, s.v - cv);
  if (r < EPS) return [clone3(end)];

  const a0 = Math.atan2(s.v - cv, s.u - cu);
  let a1 = Math.atan2(e.v - cv, e.u - cu);
  const same = Math.hypot(e.u - s.u, e.v - s.v) < 1e-4;

  if (same) {
    a1 = a0 + (clockwise ? -Math.PI * 2 : Math.PI * 2);
  } else if (clockwise) {
    if (a1 >= a0 - 1e-10) a1 -= Math.PI * 2;
  } else if (a1 <= a0 + 1e-10) {
    a1 += Math.PI * 2;
  }

  const sweep = a1 - a0;
  const chord = 0.7;
  const steps = Math.max(12, Math.min(360, Math.ceil(Math.abs(sweep) * r / chord)));
  const pts: Vec3[] = [];
  for (let n = 1; n <= steps; n++) {
    const t = n / steps;
    const a = a0 + sweep * t;
    const w = s.w + (e.w - s.w) * t;
    pts.push(fromAxisPair(plane, cu + Math.cos(a) * r, cv + Math.sin(a) * r, w));
  }
  pts[pts.length - 1] = clone3(end);
  return pts;
}

function centerFromR(
  start: Vec3,
  end: Vec3,
  rWord: number,
  clockwise: boolean,
  plane: Plane,
): { i: number; j: number; k: number } | null {
  const s = axisPair(plane, start);
  const e = axisPair(plane, end);
  const du = e.u - s.u;
  const dv = e.v - s.v;
  const d = Math.hypot(du, dv);
  if (d < EPS) return null;
  let absR = Math.abs(rWord);
  if (d > 2 * absR) absR = d / 2;
  const h = Math.sqrt(Math.max(0, absR * absR - (d / 2) * (d / 2)));
  const inv = 1 / d;
  const nx = -dv * inv;
  const ny = du * inv;
  let sign = clockwise ? -1 : 1;
  if (rWord < 0) sign *= -1;
  const cu = (s.u + e.u) / 2 + nx * h * sign;
  const cv = (s.v + e.v) / 2 + ny * h * sign;
  const ou = cu - s.u;
  const ov = cv - s.v;
  if (plane === 18) return { i: ou, j: 0, k: ov };
  if (plane === 19) return { i: 0, j: ou, k: ov };
  return { i: ou, j: ov, k: 0 };
}

/**
 * Compile RS-274-ish G-code into a timed toolpath.
 * Supports G0/G1/G2/G3, G17–G19, G20/G21, G90/G91, F, S, M3/M4/M5.
 */
export function compileGcode(source: string): Toolpath {
  const rawLines = source.replace(/\r\n/g, "\n").split("\n");
  const warnings: string[] = [];
  const warn = (line: number, msg: string) => {
    if (warnings.length < 24) warnings.push(`N${line + 1}: ${msg}`);
  };

  const modal: Modal = {
    motion: 0,
    plane: 17,
    abs: true,
    unit: 1,
    feed: 300,
    spindle: 0,
    spindleOn: false,
  };

  const pos = clone3(ORIGIN);
  const vertices: PathVertex[] = [
    { ...ORIGIN, kind: "rapid", feed: RAPID_MM_MIN, spindle: 0, line: 0, dist: 0, time: 0 },
  ];
  const polylines: Polyline[] = [];
  const lineTimes = Array.from({ length: rawLines.length }, () => -1);
  let feedLength = 0;
  let rapidLength = 0;

  const markLine = (line: number) => {
    if (line >= 0 && line < lineTimes.length && lineTimes[line] < 0) {
      lineTimes[line] = vertices[vertices.length - 1]?.time ?? 0;
    }
  };

  const emitPoints = (pts: Vec3[], kind: MotionKind, line: number) => {
    const feed = kind === "rapid" ? RAPID_MM_MIN : Math.max(modal.feed, 1);
    const spindle = modal.spindleOn ? modal.spindle : 0;
    markLine(line);
    for (const p of pts) {
      const prev = vertices[vertices.length - 1];
      const start = { x: prev.x, y: prev.y, z: prev.z };
      const length = dist3(start, p);
      if (length < EPS) {
        pos.x = p.x;
        pos.y = p.y;
        pos.z = p.z;
        continue;
      }
      const dt = (length / feed) * 60;
      vertices.push({
        x: p.x,
        y: p.y,
        z: p.z,
        kind,
        feed,
        spindle,
        line,
        dist: prev.dist + length,
        time: prev.time + dt,
      });
      pushPoly(polylines, kind, start, p);
      if (kind === "rapid") rapidLength += length;
      else feedLength += length;
      pos.x = p.x;
      pos.y = p.y;
      pos.z = p.z;
    }
  };

  for (let li = 0; li < rawLines.length; li++) {
    const stripped = stripLine(rawLines[li]);
    if (!stripped) continue;

    WORD_RE.lastIndex = 0;
    const words: { letter: string; value: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = WORD_RE.exec(stripped))) {
      words.push({ letter: m[1].toUpperCase(), value: parseFloat(m[2]) });
    }
    if (words.length === 0) continue;

    let x: number | undefined;
    let y: number | undefined;
    let z: number | undefined;
    let i = 0;
    let j = 0;
    let k = 0;
    let r: number | undefined;
    let hasIjk = false;
    let motionOverride: number | undefined;

    for (const w of words) {
      switch (w.letter) {
        case "G": {
          const g = Math.round(w.value);
          if (g === 0 || g === 1 || g === 2 || g === 3) {
            motionOverride = g;
            modal.motion = g;
          } else if (g === 17 || g === 18 || g === 19) {
            modal.plane = g;
          } else if (g === 20) {
            modal.unit = 25.4;
          } else if (g === 21) {
            modal.unit = 1;
          } else if (g === 90) {
            modal.abs = true;
          } else if (g === 91) {
            modal.abs = false;
          } else if (g === 94) {
            /* units/min — default */
          } else if (g === 28) {
            emitPoints([clone3(ORIGIN)], "rapid", li);
          } else if (
            g === 40 ||
            g === 49 ||
            g === 54 ||
            g === 55 ||
            g === 64 ||
            g === 80 ||
            g === 17
          ) {
            /* known no-ops */
          } else if (g !== 4) {
            warn(li, `ignored G${g}`);
          }
          break;
        }
        case "M": {
          const mv = Math.round(w.value);
          if (mv === 3 || mv === 4) modal.spindleOn = true;
          else if (mv === 5) modal.spindleOn = false;
          else if (mv === 2 || mv === 30) {
            /* program end */
          } else if (mv === 6 || mv === 8 || mv === 9 || mv === 0 || mv === 1) {
            /* tool change / coolant / stop */
          } else {
            warn(li, `ignored M${mv}`);
          }
          break;
        }
        case "X":
          x = w.value * modal.unit;
          break;
        case "Y":
          y = w.value * modal.unit;
          break;
        case "Z":
          z = w.value * modal.unit;
          break;
        case "I":
          i = w.value * modal.unit;
          hasIjk = true;
          break;
        case "J":
          j = w.value * modal.unit;
          hasIjk = true;
          break;
        case "K":
          k = w.value * modal.unit;
          hasIjk = true;
          break;
        case "R":
          r = w.value * modal.unit;
          break;
        case "F":
          modal.feed = Math.abs(w.value) * modal.unit;
          break;
        case "S":
          modal.spindle = Math.abs(w.value);
          break;
        case "N":
        case "T":
        case "P":
        case "D":
        case "H":
        case "L":
        case "Q":
          break;
        default:
          break;
      }
    }

    if (x === undefined && y === undefined && z === undefined) continue;

    const dest: Vec3 = {
      x: x === undefined ? pos.x : modal.abs ? x : pos.x + x,
      y: y === undefined ? pos.y : modal.abs ? y : pos.y + y,
      z: z === undefined ? pos.z : modal.abs ? z : pos.z + z,
    };

    const motion = motionOverride ?? modal.motion;
    if (motion === 2 || motion === 3) {
      const clockwise = motion === 2;
      let ii = i;
      let jj = j;
      let kk = k;
      if (!hasIjk && r !== undefined) {
        const c = centerFromR(pos, dest, r, clockwise, modal.plane);
        if (!c) {
          warn(li, "arc radius invalid; using linear");
          emitPoints([dest], "feed", li);
          continue;
        }
        ii = c.i;
        jj = c.j;
        kk = c.k;
      }
      const pts = tessellateArc(pos, dest, ii, jj, kk, clockwise, modal.plane);
      emitPoints(pts, "feed", li);
    } else {
      const kind: MotionKind = motion === 0 ? "rapid" : "feed";
      emitPoints([dest], kind, li);
    }
  }

  const bbox = emptyBBox();
  const feedBox = emptyBBox();
  let feedHits = 0;
  if (vertices.length > 1) {
    bbox.min = { x: Infinity, y: Infinity, z: Infinity };
    bbox.max = { x: -Infinity, y: -Infinity, z: -Infinity };
    feedBox.min = { x: Infinity, y: Infinity, z: Infinity };
    feedBox.max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const v of vertices) {
      growBox(bbox, v);
      if (v.kind === "feed") {
        growBox(feedBox, v);
        feedHits += 1;
      }
    }
  }

  const cut = feedHits > 0 ? feedBox : bbox;
  const pad = 5;
  const stock: BBox = {
    min: {
      x: cut.min.x - pad,
      y: cut.min.y - pad,
      z: Math.min(cut.min.z, 0) - 1,
    },
    max: {
      x: cut.max.x + pad,
      y: cut.max.y + pad,
      z: Math.max(0, cut.max.z),
    },
  };

  return {
    vertices,
    polylines,
    bbox,
    stock,
    feedLength,
    rapidLength,
    totalTime: vertices[vertices.length - 1]?.time ?? 0,
    lineCount: rawLines.length,
    lineTimes,
    warnings,
  };
}

export function poseAt(path: Toolpath, t: number): Pose {
  const v = path.vertices;
  const first = v[0] ?? {
    ...ORIGIN,
    kind: "rapid" as const,
    feed: RAPID_MM_MIN,
    spindle: 0,
    line: 0,
    dist: 0,
    time: 0,
  };
  if (v.length < 2 || t <= 0) {
    return {
      x: first.x,
      y: first.y,
      z: first.z,
      kind: first.kind,
      feed: first.feed,
      spindle: first.spindle,
      line: first.line,
      dist: first.dist,
    };
  }
  const last = v[v.length - 1];
  if (t >= last.time) {
    return {
      x: last.x,
      y: last.y,
      z: last.z,
      kind: last.kind,
      feed: last.feed,
      spindle: last.spindle,
      line: last.line,
      dist: last.dist,
    };
  }
  let lo = 0;
  let hi = v.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (v[mid].time <= t) lo = mid;
    else hi = mid;
  }
  const a = v[lo];
  const b = v[hi];
  const span = b.time - a.time;
  const u = span > 1e-9 ? (t - a.time) / span : 1;
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
    kind: b.kind,
    feed: b.feed,
    spindle: b.spindle,
    line: b.line,
    dist: a.dist + (b.dist - a.dist) * u,
  };
}

export function emptyPath(): Toolpath {
  return emptyToolpath(0, []);
}
