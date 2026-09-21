export type Vec3 = { x: number; y: number; z: number };

export type MotionKind = "rapid" | "feed";

export type Polyline = {
  kind: MotionKind;
  points: Vec3[];
};

export type PathVertex = {
  x: number;
  y: number;
  z: number;
  kind: MotionKind;
  feed: number;
  spindle: number;
  line: number;
  dist: number;
  time: number;
};

export type BBox = { min: Vec3; max: Vec3 };

export type Toolpath = {
  vertices: PathVertex[];
  polylines: Polyline[];
  bbox: BBox;
  stock: BBox;
  feedLength: number;
  rapidLength: number;
  totalTime: number;
  lineCount: number;
  /** First sim-time for each source line; -1 if the line has no motion. */
  lineTimes: number[];
  warnings: string[];
};

export type Pose = {
  x: number;
  y: number;
  z: number;
  kind: MotionKind;
  feed: number;
  spindle: number;
  line: number;
  dist: number;
};
