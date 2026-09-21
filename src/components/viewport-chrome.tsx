import { Box, Eye, EyeOff, Minus } from "lucide-react";
import { useMill, type ColorMode, type ViewPreset } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const VIEWS: { id: ViewPreset; label: string }[] = [
  { id: "iso", label: "Iso" },
  { id: "top", label: "Top" },
  { id: "front", label: "Front" },
  { id: "right", label: "Right" },
];

export function ViewportChrome() {
  const setViewPreset = useMill((s) => s.setViewPreset);
  const showRapids = useMill((s) => s.showRapids);
  const showStock = useMill((s) => s.showStock);
  const colorMode = useMill((s) => s.colorMode);
  const toolDiameter = useMill((s) => s.toolDiameter);
  const setShowRapids = useMill((s) => s.setShowRapids);
  const setShowStock = useMill((s) => s.setShowStock);
  const setColorMode = useMill((s) => s.setColorMode);
  const setToolDiameter = useMill((s) => s.setToolDiameter);

  return (
    <div className="pointer-events-auto flex flex-col items-start gap-2">
      <div className="flex rounded-sm bg-surface/90 p-0.5 shadow-panel backdrop-blur-sm">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setViewPreset(v.id)}
            className="h-9 min-w-11 rounded-xs px-2.5 font-micro text-muted transition-colors duration-quick ease-smooth hover:text-fg"
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-md bg-surface/90 p-1 shadow-panel backdrop-blur-sm">
        <Tooltip label={showRapids ? "Hide rapids" : "Show rapids"}>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label={showRapids ? "Hide rapids" : "Show rapids"}
            onClick={() => setShowRapids(!showRapids)}
            className={cn(!showRapids && "text-faint")}
          >
            {showRapids ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
        </Tooltip>
        <Tooltip label={showStock ? "Hide stock" : "Show stock"}>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label={showStock ? "Hide stock" : "Show stock"}
            onClick={() => setShowStock(!showStock)}
            className={cn(!showStock && "text-faint")}
          >
            <Box className="size-4" />
          </Button>
        </Tooltip>
        <Tooltip label={colorMode === "motion" ? "Color by height" : "Color by motion"}>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Toggle path coloring"
            onClick={() => setColorMode((colorMode === "motion" ? "height" : "motion") as ColorMode)}
          >
            <Minus className="size-4" />
          </Button>
        </Tooltip>
        <div className="mx-1 h-5 w-px bg-border" />
        {[3, 6, 8, 10].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setToolDiameter(d)}
            className={cn(
              "h-8 min-w-9 rounded-xs px-1.5 font-micro text-faint transition-colors duration-quick ease-smooth",
              toolDiameter === d && "bg-surface-2 text-fg",
            )}
          >
            Ø{d}
          </button>
        ))}
      </div>
    </div>
  );
}
