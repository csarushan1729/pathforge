import { poseAt } from "@/lib/gcode/compile";
import { fmtAxis, fmtMm, fmtTime } from "@/lib/gcode/format";
import { useMill } from "@/lib/store";

function Axis({ axis, value }: { axis: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="font-micro text-faint">{axis}</p>
      <p className="dro-digit text-xl text-fg md:text-2xl">{fmtAxis(value)}</p>
    </div>
  );
}

export function DroPanel() {
  const toolpath = useMill((s) => s.toolpath);
  const simTime = useMill((s) => s.simTime);
  const pose = poseAt(toolpath, simTime);
  const { stock, feedLength, rapidLength, totalTime } = toolpath;
  const sx = stock.max.x - stock.min.x;
  const sy = stock.max.y - stock.min.y;
  const sz = stock.max.z - stock.min.z;

  return (
    <div className="pointer-events-none max-w-full rounded-lg bg-surface/90 p-3 shadow-panel backdrop-blur-sm md:p-4">
      <p className="font-micro text-faint">Work offset G54</p>
      <div className="mt-2 grid grid-cols-3 gap-4">
        <Axis axis="X" value={pose.x} />
        <Axis axis="Y" value={pose.y} />
        <Axis axis="Z" value={pose.z} />
      </div>
      <div className="mt-3 hidden gap-4 border-t border-border pt-3 text-micro text-muted md:flex">
        <span>
          Cut {fmtMm(feedLength, 0)}
        </span>
        <span>
          Rapid {fmtMm(rapidLength, 0)}
        </span>
        <span>{fmtTime(totalTime)} @1×</span>
      </div>
      <p className="mt-2 hidden font-mono text-xs text-faint md:block">
        Stock {sx.toFixed(0)} × {sy.toFixed(0)} × {sz.toFixed(0)} mm
      </p>
    </div>
  );
}
