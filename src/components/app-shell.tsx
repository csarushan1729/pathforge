import { Code2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { GcodePanel } from "@/components/gcode-panel";
import { PlaybackBar } from "@/components/playback-bar";
import { DroPanel } from "@/components/dro-panel";
import { Viewport } from "@/components/viewport";
import { ViewportChrome } from "@/components/viewport-chrome";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SAMPLES } from "@/lib/gcode/samples";
import { useMill } from "@/lib/store";
import { cn } from "@/lib/utils";

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 text-fg" aria-hidden>
      <path
        d="M3.5 17.5 H9.5 V11.5 H15 V6 H20.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="20.5" cy="6" r="1.6" fill="currentColor" />
    </svg>
  );
}

function SampleRow() {
  const sampleId = useMill((s) => s.sampleId);
  const loadSample = useMill((s) => s.loadSample);
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {SAMPLES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => loadSample(s.id)}
          title={s.blurb}
          className={cn(
            "h-9 shrink-0 rounded-sm px-2.5 font-micro text-faint transition-colors duration-quick ease-smooth hover:text-fg",
            sampleId === s.id && "bg-surface-2 text-fg shadow-border",
          )}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}

export function AppShell() {
  const hydrate = useMill((s) => s.hydrate);
  const togglePlay = useMill((s) => s.togglePlay);
  const stop = useMill((s) => s.stop);
  const loadSample = useMill((s) => s.loadSample);
  const sampleId = useMill((s) => s.sampleId);
  const [codeOpen, setCodeOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "Escape") {
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, stop]);

  return (
    <TooltipProvider>
      <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-bg">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 md:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Mark />
            <div className="min-w-0">
              <p className="text-sm font-medium tracking-tight text-fg">PathForge</p>
              <p className="hidden font-micro text-faint sm:block">CNC toolpath simulator</p>
            </div>
          </div>
          <div className="hidden min-w-0 flex-1 md:block">
            <SampleRow />
          </div>
          <div className="ml-auto flex items-center gap-1">
            {sampleId === "custom" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadSample(SAMPLES[0].id)}
                className="hidden sm:inline-flex"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            ) : null}
            <Button
              variant={codeOpen ? "secondary" : "ghost"}
              size="sm"
              className="md:hidden"
              onClick={() => setCodeOpen((v) => !v)}
            >
              <Code2 className="size-4" />
              Code
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 shrink-0 overflow-x-auto border-b border-border px-2 py-1 md:hidden">
          <SampleRow />
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden min-h-0 w-80 shrink-0 border-r border-border lg:block xl:w-96">
            <GcodePanel />
          </aside>
          <section className="relative min-h-0 min-w-0 flex-1">
            <Viewport />
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 md:p-4">
              <div className="flex items-start justify-between gap-3">
                <ViewportChrome />
                <div className="hidden sm:block">
                  <DroPanel />
                </div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <p className="hidden font-micro text-faint md:block">
                  Drag to orbit · scroll to zoom · space to play
                </p>
                <div className="sm:hidden">
                  <DroPanel />
                </div>
              </div>
            </div>
          </section>
        </div>

        {codeOpen ? (
          <div className="absolute inset-x-0 top-14 bottom-16 z-20 border-t border-border bg-surface lg:hidden">
            <GcodePanel />
          </div>
        ) : null}

        <PlaybackBar />
      </div>
    </TooltipProvider>
  );
}
