import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Pencil, Upload, X } from "lucide-react";
import { poseAt } from "@/lib/gcode/compile";
import { useMill } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function tintLine(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith(";") || trimmed.startsWith("(")) {
    return <span className="text-faint">{text || " "}</span>;
  }
  const nodes: ReactNode[] = [];
  const re = /(\([^)]*\)|;.*$|[GMgm]\d+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      nodes.push(<span key={k++}>{text.slice(last, match.index)}</span>);
    }
    const token = match[0];
    const comment = token.startsWith(";") || token.startsWith("(");
    nodes.push(
      <span key={k++} className={comment ? "text-faint" : "text-feed"}>
        {token}
      </span>,
    );
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(<span key={k++}>{text.slice(last)}</span>);
  return <>{nodes.length ? nodes : " "}</>;
}

export function GcodePanel() {
  const source = useMill((s) => s.source);
  const toolpath = useMill((s) => s.toolpath);
  const simTime = useMill((s) => s.simTime);
  const setSource = useMill((s) => s.setSource);
  const seekToLine = useMill((s) => s.seekToLine);
  const pose = poseAt(toolpath, simTime);
  const lines = useMemo(() => source.split("\n"), [source]);
  const current = pose.line;
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(source);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setDraft(source);
  }, [source, editing]);

  useEffect(() => {
    if (editing) return;
    const el = rowRefs.current[current];
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const er = el.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    if (er.top < pr.top + 8 || er.bottom > pr.bottom - 8) {
      el.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [current, editing]);

  const apply = () => {
    setSource(draft);
    setEditing(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="min-w-0">
          <p className="font-micro text-faint">Program</p>
          <p className="truncate font-mono text-xs text-muted">
            {lines.length} lines
            {toolpath.warnings.length > 0 ? ` · ${toolpath.warnings.length} ignored` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept=".nc,.gcode,.ngc,.tap,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void file.text().then((text) => {
                setSource(text);
                setEditing(false);
              });
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Load G-code file"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
          </Button>
          {editing ? (
            <>
              <Button variant="ghost" size="iconSm" aria-label="Cancel edit" onClick={() => setEditing(false)}>
                <X className="size-4" />
              </Button>
              <Button variant="primary" size="iconSm" aria-label="Apply G-code" onClick={apply}>
                <Check className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Edit G-code"
              onClick={() => {
                setDraft(source);
                setEditing(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-bg px-3 py-2 font-mono text-xs leading-5 text-fg outline-none"
          aria-label="G-code source"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto" role="list">
          {lines.map((line, i) => (
            <button
              key={i}
              type="button"
              role="listitem"
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              onClick={() => seekToLine(i)}
              className={cn(
                "flex w-full items-start gap-3 px-3 py-0.5 text-left font-mono text-xs leading-5",
                i === current ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60",
              )}
            >
              <span
                className={cn(
                  "w-8 shrink-0 pt-px text-right text-micro tracking-normal text-faint",
                  i === current && "text-feed",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">{tintLine(line)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
