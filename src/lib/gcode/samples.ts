export type Sample = {
  id: string;
  name: string;
  blurb: string;
  source: string;
};

function header(title: string, extra: string[]): string[] {
  return [
    `; PathForge — ${title}`,
    ...extra.map((e) => `; ${e}`),
    "G21 G90 G17 G94",
    "G54",
    "T1 M6",
    "M3 S8200",
    "G0 Z15",
  ];
}

function squarePocket(): string {
  const L = header("square pocket", [
    "Stock 50 × 50 × 12 mm  6061-T6",
    "T1  Ø6.0 mm  3-flute EM",
    "Origin: front-left corner, Z on top of stock",
  ]);
  const xs = 7;
  const xe = 43;
  const ys = 7;
  const ye = 43;
  const step = 3.2;
  for (const z of [-2, -4, -6]) {
    L.push(`G0 X${xs.toFixed(3)} Y${ys.toFixed(3)}`);
    L.push("G0 Z2");
    L.push(`G1 Z${z.toFixed(1)} F170`);
    for (let inset = 0; inset <= 16; inset += step) {
      const a = xs + inset;
      const b = xe - inset;
      const c = ys + inset;
      const d = ye - inset;
      if (b - a < 1.5 || d - c < 1.5) break;
      L.push(`G1 X${b.toFixed(3)} F460`);
      L.push(`G1 Y${d.toFixed(3)}`);
      L.push(`G1 X${a.toFixed(3)}`);
      L.push(`G1 Y${c.toFixed(3)}`);
      if (inset + step <= 16) {
        L.push(`G1 X${(a + step).toFixed(3)} Y${(c + step).toFixed(3)}`);
      }
    }
    L.push("G0 Z2");
  }
  L.push("G0 Z15");
  L.push("G0 X0 Y0");
  L.push("M5");
  L.push("M30");
  return L.join("\n");
}

function helicalBore(): string {
  const L = header("helical bore", [
    "18 mm through-hole · 6 mm EM (tool-center r=6)",
    "Helical interpolation G2 with Z step per turn",
  ]);
  L.push("G0 X6 Y0");
  L.push("G0 Z2");
  L.push("G1 Z0 F200");
  L.push("G2 X6 Y0 Z-3 I-6 J0 F280");
  L.push("G2 X6 Y0 Z-6 I-6 J0");
  L.push("G2 X6 Y0 Z-9 I-6 J0");
  L.push("G2 X6 Y0 Z-12 I-6 J0");
  L.push("G3 X6 Y0 I-6 J0 F240");
  L.push("G0 Z15");
  L.push("; four locating drills");
  for (const [x, y] of [
    [16, 16],
    [-16, 16],
    [-16, -16],
    [16, -16],
  ] as const) {
    L.push(`G0 X${x} Y${y}`);
    L.push("G0 Z2");
    L.push("G1 Z-8 F110");
    L.push("G0 Z2");
  }
  L.push("G0 Z15");
  L.push("G0 X0 Y0");
  L.push("M5");
  L.push("M30");
  return L.join("\n");
}

function roundedContour(): string {
  const L = header("rounded contour", [
    "60 × 40 mm plate, R8 corners, two depths",
    "G2 radius corners on G17",
  ]);
  const pass = (z: number, f: number) => {
    L.push("G0 X10 Y8");
    L.push("G0 Z2");
    L.push(`G1 Z${z.toFixed(1)} F${Math.round(f * 0.45)}`);
    L.push(`G1 X52 F${f}`);
    L.push("G2 X60 Y16 I0 J8");
    L.push("G1 Y32");
    L.push("G2 X52 Y40 I-8 J0");
    L.push("G1 X10");
    L.push("G2 X2 Y32 I0 J-8");
    L.push("G1 Y16");
    L.push("G2 X10 Y8 I8 J0");
    L.push("G0 Z2");
  };
  pass(-2.5, 380);
  pass(-5.0, 320);
  L.push("G0 Z15");
  L.push("G0 X0 Y0");
  L.push("M5");
  L.push("M30");
  return L.join("\n");
}

function faceMill(): string {
  const L = header("face mill", [
    "80 × 50 mm facing, 6 mm EM, 4 mm stepover",
    "Two depths: 0.4 mm then 0.4 mm",
  ]);
  const x0 = 3;
  const x1 = 77;
  const y0 = 3;
  const y1 = 47;
  const step = 4;
  for (const z of [-0.4, -0.8]) {
    L.push(`G0 X${x0} Y${y0}`);
    L.push("G0 Z2");
    L.push(`G1 Z${z.toFixed(1)} F220`);
    let y = y0;
    let dir = 1;
    while (y <= y1 + 0.01) {
      const xEnd = dir > 0 ? x1 : x0;
      L.push(`G1 X${xEnd.toFixed(3)} F720`);
      y += step;
      if (y <= y1 + 0.01) {
        L.push(`G1 Y${Math.min(y, y1).toFixed(3)}`);
        dir *= -1;
      }
    }
    L.push("G0 Z2");
  }
  L.push("G0 Z15");
  L.push("G0 X0 Y0");
  L.push("M5");
  L.push("M30");
  return L.join("\n");
}

function spiralPocket(): string {
  const L = header("spiral pocket", [
    "Ø36 mm pocket, helical entry then Archimedean spiral",
    "Tool-center path, 6 mm EM",
  ]);
  L.push("G0 X8 Y0");
  L.push("G0 Z2");
  L.push("G1 Z0 F180");
  L.push("G2 X8 Y0 Z-2.5 I-8 J0 F260");
  L.push("G2 X8 Y0 Z-5.0 I-8 J0");
  const r0 = 8;
  const r1 = 15;
  const revs = 4.5;
  const steps = Math.round(64 * revs);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const r = r0 + (r1 - r0) * t;
    const a = t * revs * Math.PI * 2;
    L.push(`G1 X${(Math.cos(a) * r).toFixed(3)} Y${(Math.sin(a) * r).toFixed(3)} F520`);
  }
  L.push("G2 X15 Y0 I-15 J0 F300");
  L.push("G0 Z15");
  L.push("G0 X0 Y0");
  L.push("M5");
  L.push("M30");
  return L.join("\n");
}

export const SAMPLES: Sample[] = [
  { id: "pocket", name: "Pocket", blurb: "50 mm square · 6 mm EM", source: squarePocket() },
  { id: "bore", name: "Bore", blurb: "Helical 18 mm hole", source: helicalBore() },
  { id: "contour", name: "Contour", blurb: "R8 plate outline", source: roundedContour() },
  { id: "face", name: "Face", blurb: "80 × 50 mm raster", source: faceMill() },
  { id: "spiral", name: "Spiral", blurb: "Adaptive-style pocket", source: spiralPocket() },
];

export const DEFAULT_SAMPLE = SAMPLES[0];

export function sampleById(id: string): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
