import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { poseAt } from "@/lib/gcode/compile";
import { cncToThree } from "@/lib/gcode/coords";
import type { Polyline, Toolpath, Vec3 } from "@/lib/gcode/types";
import { heightColor, SCENE } from "@/lib/scene";
import { useMill } from "@/lib/store";

const FIXED = 1 / 60;

function SimTicker() {
  const acc = useRef(0);
  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    const s = useMill.getState();
    if (!s.playing) return;
    acc.current += d;
    let stepped = false;
    while (acc.current >= FIXED) {
      acc.current -= FIXED;
      stepped = true;
      const next = s.simTime + FIXED * s.speed;
      if (next >= s.toolpath.totalTime) {
        s.setSimTime(s.toolpath.totalTime);
        s.setPlaying(false);
        acc.current = 0;
        return;
      }
      s.setSimTime(next);
    }
    if (!stepped && s.playing) {
      /* keep cutter smooth between fixed steps via pose interpolation */
    }
  });
  return null;
}

function InvalidateOnScrub() {
  const simTime = useMill((s) => s.simTime);
  const playing = useMill((s) => s.playing);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!playing) invalidate();
  }, [simTime, playing, invalidate]);
  return null;
}

function stockCenter(path: Toolpath): [number, number, number] {
  const { min, max } = path.stock;
  return cncToThree((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
}

function CameraRig() {
  const preset = useMill((s) => s.viewPreset);
  const fitToken = useMill((s) => s.fitToken);
  const path = useMill((s) => s.toolpath);
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!preset) return;
    const c = stockCenter(path);
    const span = Math.max(
      40,
      path.stock.max.x - path.stock.min.x,
      path.stock.max.y - path.stock.min.y,
      24,
    );
    const dist = span * 1.8;
    const views = {
      iso: { pos: [c[0] + dist * 0.7, c[1] + dist * 0.85, c[2] + dist * 0.75] as const, up: [0, 1, 0] as const },
      top: { pos: [c[0], c[1] + dist * 1.6, c[2]] as const, up: [0, 0, -1] as const },
      front: {
        pos: cncToThree(
          (path.stock.min.x + path.stock.max.x) / 2,
          path.stock.min.y - dist * 1.3,
          (path.stock.min.z + path.stock.max.z) / 2 + span * 0.25,
        ),
        up: [0, 1, 0] as const,
      },
      right: {
        pos: cncToThree(
          path.stock.max.x + dist * 1.3,
          (path.stock.min.y + path.stock.max.y) / 2,
          (path.stock.min.z + path.stock.max.z) / 2 + span * 0.25,
        ),
        up: [0, 1, 0] as const,
      },
    };
    const view = views[preset];
    camera.up.set(view.up[0], view.up[1], view.up[2]);
    camera.position.set(view.pos[0], view.pos[1], view.pos[2]);
    camera.lookAt(c[0], c[1], c[2]);
    const orbit = controls as { target: { set: (x: number, y: number, z: number) => void }; update: () => void } | null;
    if (orbit?.target) {
      orbit.target.set(c[0], c[1], c[2]);
      orbit.update();
    }
    camera.updateProjectionMatrix();
    useMill.getState().clearViewPreset();
  }, [preset, fitToken, path, camera, controls]);

  return null;
}

function toPts(points: Vec3[]): [number, number, number][] {
  return points.map((p) => cncToThree(p.x, p.y, p.z));
}

function PathLines({ polylines, path }: { polylines: Polyline[]; path: Toolpath }) {
  const showRapids = useMill((s) => s.showRapids);
  const colorMode = useMill((s) => s.colorMode);
  const zMin = path.bbox.min.z;
  const zMax = path.bbox.max.z;

  return (
    <>
      {polylines.map((pl, i) => {
        if (pl.kind === "rapid" && !showRapids) return null;
        if (pl.points.length < 2) return null;
        const pts = toPts(pl.points);
        if (colorMode === "height" && pl.kind === "feed") {
          const colors = pl.points.map((p) => heightColor(p.z, zMin, zMax));
          return (
            <Line
              key={i}
              points={pts}
              vertexColors={colors}
              lineWidth={2.2}
              transparent
              opacity={0.95}
            />
          );
        }
        return (
          <Line
            key={i}
            points={pts}
            color={pl.kind === "rapid" ? SCENE.rapid : SCENE.feed}
            lineWidth={pl.kind === "rapid" ? 1.1 : 2.2}
            dashed={pl.kind === "rapid"}
            dashSize={2.2}
            gapSize={1.4}
            transparent
            opacity={pl.kind === "rapid" ? 0.65 : 0.95}
          />
        );
      })}
    </>
  );
}

function Stock() {
  const path = useMill((s) => s.toolpath);
  const show = useMill((s) => s.showStock);
  if (!show) return null;
  const { min, max } = path.stock;
  const sx = Math.max(2, max.x - min.x);
  const sy = Math.max(2, max.y - min.y);
  const sz = Math.max(1, max.z - min.z);
  const center = cncToThree((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
  return (
    <group position={center}>
      <mesh>
        <boxGeometry args={[sx, sz, sy]} />
        <meshStandardMaterial
          color={SCENE.stock}
          metalness={0.72}
          roughness={0.38}
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function StockEdges() {
  const path = useMill((s) => s.toolpath);
  const show = useMill((s) => s.showStock);
  if (!show) return null;
  const { min, max } = path.stock;
  const p = (x: number, y: number, z: number) => cncToThree(x, y, z);
  const corners: [number, number, number][][] = [
    [p(min.x, min.y, min.z), p(max.x, min.y, min.z)],
    [p(max.x, min.y, min.z), p(max.x, max.y, min.z)],
    [p(max.x, max.y, min.z), p(min.x, max.y, min.z)],
    [p(min.x, max.y, min.z), p(min.x, min.y, min.z)],
    [p(min.x, min.y, max.z), p(max.x, min.y, max.z)],
    [p(max.x, min.y, max.z), p(max.x, max.y, max.z)],
    [p(max.x, max.y, max.z), p(min.x, max.y, max.z)],
    [p(min.x, max.y, max.z), p(min.x, min.y, max.z)],
    [p(min.x, min.y, min.z), p(min.x, min.y, max.z)],
    [p(max.x, min.y, min.z), p(max.x, min.y, max.z)],
    [p(max.x, max.y, min.z), p(max.x, max.y, max.z)],
    [p(min.x, max.y, min.z), p(min.x, max.y, max.z)],
  ];
  return (
    <>
      {corners.map((pts, i) => (
        <Line key={i} points={pts} color={SCENE.stockEdge} lineWidth={1} transparent opacity={0.4} />
      ))}
    </>
  );
}

function Table() {
  const path = useMill((s) => s.toolpath);
  const { min, max } = path.stock;
  const cx = (min.x + max.x) / 2;
  const cy = (min.y + max.y) / 2;
  const tw = Math.max(120, max.x - min.x + 50);
  const td = Math.max(90, max.y - min.y + 40);
  const tableY = min.z - 2.5;
  const center = cncToThree(cx, cy, tableY);
  const slots = [-24, -8, 8, 24];
  return (
    <group>
      <mesh position={center}>
        <boxGeometry args={[tw, 5, td]} />
        <meshStandardMaterial color={SCENE.table} metalness={0.45} roughness={0.62} />
      </mesh>
      {slots.map((off) => {
        const p = cncToThree(cx, cy + off, tableY + 2.55);
        return (
          <mesh key={off} position={p}>
            <boxGeometry args={[tw * 0.86, 0.4, 3.2]} />
            <meshStandardMaterial color={SCENE.slot} metalness={0.3} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

function WcsTriad() {
  const len = 14;
  return (
    <group>
      <Line points={[cncToThree(0, 0, 0), cncToThree(len, 0, 0)]} color={SCENE.axisX} lineWidth={2.4} />
      <Line points={[cncToThree(0, 0, 0), cncToThree(0, len, 0)]} color={SCENE.axisY} lineWidth={2.4} />
      <Line points={[cncToThree(0, 0, 0), cncToThree(0, 0, len)]} color={SCENE.axisZ} lineWidth={2.4} />
    </group>
  );
}

function Cutter() {
  const group = useRef<Group>(null);
  const bit = useRef<Mesh>(null);
  const diameter = useMill((s) => s.toolDiameter);
  const r = diameter / 2;

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    const { toolpath, simTime, playing } = useMill.getState();
    const pose = poseAt(toolpath, simTime);
    if (group.current) {
      const [x, y, z] = cncToThree(pose.x, pose.y, pose.z);
      group.current.position.set(x, y, z);
    }
    if (bit.current && playing && pose.spindle > 0) {
      bit.current.rotation.y += d * 18;
    }
  });

  return (
    <group ref={group}>
      <mesh position={[0, 14.5, 0]}>
        <cylinderGeometry args={[r * 1.55, r * 1.25, 5, 20]} />
        <meshStandardMaterial color={SCENE.holder} metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 10.5, 0]}>
        <cylinderGeometry args={[r * 1.2, r * 1.05, 3.2, 16]} />
        <meshStandardMaterial color={SCENE.collet} metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 7.2, 0]}>
        <cylinderGeometry args={[r * 0.72, r * 0.72, 4, 12]} />
        <meshStandardMaterial color={SCENE.shank} metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh ref={bit} position={[0, 4, 0]}>
        <cylinderGeometry args={[r, r * 0.88, 8, 24]} />
        <meshStandardMaterial color={SCENE.flute} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[r * 1.05, r * 0.2, 0.3, 20]} />
        <meshStandardMaterial color={SCENE.shank} metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.48} />
      <hemisphereLight args={["#9aa2ae", "#18181c", 0.9]} />
      <directionalLight position={[90, 140, 50]} intensity={1.45} />
    </>
  );
}

export function MachineCanvas() {
  const playing = useMill((s) => s.playing);
  const path = useMill((s) => s.toolpath);
  const center = useMemo(() => stockCenter(path), [path]);

  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={[1, 2]}
      frameloop={playing ? "always" : "demand"}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [70, 85, 90], fov: 42, near: 0.5, far: 800 }}
      onPointerMissed={() => undefined}
    >
      <color attach="background" args={[SCENE.background]} />
      <fog attach="fog" args={[SCENE.background, 160, 420]} />
      <Lights />
      <Grid
        position={[center[0], path.stock.min.z - 5.02, center[2]]}
        args={[240, 240]}
        cellSize={10}
        cellThickness={0.55}
        cellColor="#1c1c24"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#2a2a34"
        fadeDistance={220}
        fadeStrength={1.4}
        infiniteGrid
      />
      <Table />
      <Stock />
      <StockEdges />
      <WcsTriad />
      <PathLines polylines={path.polylines} path={path} />
      <Cutter />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={18}
        maxDistance={420}
        target={center}
      />
      <CameraRig />
      <SimTicker />
      <InvalidateOnScrub />
    </Canvas>
  );
}
