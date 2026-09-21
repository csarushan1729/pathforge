import { Pause, Play, Square } from "lucide-react";
import { poseAt } from "@/lib/gcode/compile";
import { fmtAxis, fmtTime } from "@/lib/gcode/format";
import { SPEEDS, useMill } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function PlaybackBar() {
  const playing = useMill((s) => s.playing);
  const speed = useMill((s) => s.speed);
  const simTime = useMill((s) => s.simTime);
  const toolpath = useMill((s) => s.toolpath);
  const togglePlay = useMill((s) => s.togglePlay);
  const stop = useMill((s) => s.stop);
  const setSpeed = useMill((s) => s.setSpeed);
  const setSimTime = useMill((s) => s.setSimTime);
  const setPlaying = useMill((s) => s.setPlaying);
  const pose = poseAt(toolpath, simTime);
  const total = Math.max(toolpath.totalTime, 0.001);
  const idle = toolpath.totalTime <= 0;

  return (
    <div className="flex flex-col gap-1.5 border-t border-border bg-surface px-3 py-2 md:flex-row md:items-center md:gap-4 md:px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="primary"
          size="icon"
          aria-label={playing ? "Pause" : "Play"}
          disabled={idle}
          onClick={togglePlay}
          className="shrink-0"
        >
          {playing ? <Pause className="size-4" /> : <Play className="ml-px size-4" />}
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Stop" disabled={idle} onClick={stop}>
          <Square className="size-3.5" />
        </Button>
        <p className="dro-digit ml-2 text-sm text-fg">
          {fmtTime(simTime)}
          <span className="text-faint"> / {fmtTime(toolpath.totalTime)}</span>
        </p>
        <p className="dro-digit ml-auto text-xs text-muted lg:hidden">
          X {fmtAxis(pose.x)}&nbsp;&nbsp;Y {fmtAxis(pose.y)}&nbsp;&nbsp;Z {fmtAxis(pose.z)}
        </p>
      </div>

      <Slider
        className="min-w-0 flex-1"
        value={Math.min(simTime, total)}
        max={total}
        onValueChange={(v) => {
          setPlaying(false);
          setSimTime(v);
        }}
        ariaLabel="Simulation time"
      />

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <div className="flex rounded-sm bg-bg p-0.5 shadow-border">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                "h-8 min-w-11 rounded-xs px-2 font-micro text-faint transition-colors duration-quick ease-smooth",
                speed === s && "bg-surface-2 text-fg shadow-border",
              )}
            >
              {s}×
            </button>
          ))}
        </div>
        <p className="font-micro text-faint">
          {pose.kind === "rapid" ? "Rapid" : "Feed"}
          <span className="ml-2 text-muted">{Math.round(pose.feed)}</span>
        </p>
      </div>
    </div>
  );
}
