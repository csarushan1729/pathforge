import { create } from "zustand";
import { compileGcode, emptyPath, poseAt } from "@/lib/gcode/compile";
import { DEFAULT_SAMPLE, sampleById } from "@/lib/gcode/samples";
import type { Pose, Toolpath } from "@/lib/gcode/types";

export type ViewPreset = "iso" | "top" | "front" | "right";
export type ColorMode = "motion" | "height";

const STORAGE_KEY = "pathforge:v1";
const SPEEDS = [5, 10, 20, 50, 100] as const;
export { SPEEDS };

type Persisted = {
  v: 1;
  source: string;
  sampleId: string;
};

type MillState = {
  source: string;
  sampleId: string;
  toolpath: Toolpath;
  playing: boolean;
  speed: number;
  simTime: number;
  toolDiameter: number;
  showRapids: boolean;
  showStock: boolean;
  colorMode: ColorMode;
  viewPreset: ViewPreset | null;
  fitToken: number;
  hydrated: boolean;
  setSource: (source: string) => void;
  loadSample: (id: string) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  setSimTime: (simTime: number) => void;
  seekToLine: (line: number) => void;
  setToolDiameter: (n: number) => void;
  setShowRapids: (v: boolean) => void;
  setShowStock: (v: boolean) => void;
  setColorMode: (m: ColorMode) => void;
  setViewPreset: (v: ViewPreset) => void;
  clearViewPreset: () => void;
  hydrate: () => void;
};

function rebuild(source: string): Toolpath {
  try {
    return compileGcode(source);
  } catch {
    return emptyPath();
  }
}

function persist(source: string, sampleId: string) {
  try {
    const payload: Persisted = { v: 1, source, sampleId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export const useMill = create<MillState>((set, get) => ({
  source: DEFAULT_SAMPLE.source,
  sampleId: DEFAULT_SAMPLE.id,
  toolpath: rebuild(DEFAULT_SAMPLE.source),
  playing: false,
  speed: 20,
  simTime: 0,
  toolDiameter: 6,
  showRapids: true,
  showStock: true,
  colorMode: "motion",
  viewPreset: "iso",
  fitToken: 1,
  hydrated: false,

  setSource: (source) => {
    const toolpath = rebuild(source);
    set({ source, sampleId: "custom", toolpath, simTime: 0, playing: false });
    persist(source, "custom");
  },
  loadSample: (id) => {
    const sample = sampleById(id);
    if (!sample) return;
    const toolpath = rebuild(sample.source);
    set({
      source: sample.source,
      sampleId: sample.id,
      toolpath,
      simTime: 0,
      playing: false,
      viewPreset: "iso",
      fitToken: get().fitToken + 1,
    });
    persist(sample.source, sample.id);
  },
  setPlaying: (playing) => {
    const { simTime, toolpath } = get();
    if (playing && toolpath.totalTime > 0 && simTime >= toolpath.totalTime - 1e-4) {
      set({ playing: true, simTime: 0 });
      return;
    }
    set({ playing });
  },
  togglePlay: () => get().setPlaying(!get().playing),
  stop: () => set({ playing: false, simTime: 0 }),
  setSpeed: (speed) => set({ speed }),
  setSimTime: (simTime) => set({ simTime }),
  seekToLine: (line) => {
    const { toolpath } = get();
    const times = toolpath.lineTimes;
    for (let i = line; i < times.length; i++) {
      if (times[i] >= 0) {
        set({ simTime: times[i], playing: false });
        return;
      }
    }
  },
  setToolDiameter: (toolDiameter) => set({ toolDiameter }),
  setShowRapids: (showRapids) => set({ showRapids }),
  setShowStock: (showStock) => set({ showStock }),
  setColorMode: (colorMode) => set({ colorMode }),
  setViewPreset: (viewPreset) => set({ viewPreset }),
  clearViewPreset: () => set({ viewPreset: null }),
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ hydrated: true });
        return;
      }
      const parsed = JSON.parse(raw) as Persisted;
      if (parsed?.v !== 1 || typeof parsed.source !== "string") {
        set({ hydrated: true });
        return;
      }
      const toolpath = rebuild(parsed.source);
      set({
        source: parsed.source,
        sampleId: typeof parsed.sampleId === "string" ? parsed.sampleId : "custom",
        toolpath,
        simTime: 0,
        playing: false,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));

export function currentPose(): Pose {
  const { toolpath, simTime } = useMill.getState();
  return poseAt(toolpath, simTime);
}
