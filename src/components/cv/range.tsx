import { CalendarRange } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAY } from "@/data/rng";
import { startOfDay } from "@/data/seed";
import { fmtShortDate, fromInputs, toInputDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RangePreset = "today" | "24h" | "7d" | "30d" | "90d" | "custom";
export interface RangeValue {
  preset: RangePreset;
  from: number;
  to: number;
}

const MS: Record<Exclude<RangePreset, "custom" | "today">, number> = { "24h": DAY, "7d": 7 * DAY, "30d": 30 * DAY, "90d": 90 * DAY };

export function resolveRange(preset: RangePreset, anchor: number, custom?: { from: number; to: number }): RangeValue {
  if (preset === "custom" && custom) return { preset, ...custom };
  if (preset === "today") return { preset, from: startOfDay(anchor), to: anchor };
  const ms = MS[preset as keyof typeof MS] ?? 7 * DAY;
  return { preset, from: anchor - ms, to: anchor };
}

export function useRange(anchor: number, initial: RangePreset = "7d") {
  const [preset, setPreset] = useState<RangePreset>(initial);
  const [custom, setCustom] = useState<{ from: number; to: number }>({ from: anchor - 14 * DAY, to: anchor });
  const value = useMemo(() => resolveRange(preset, anchor, custom), [preset, anchor, custom]);
  return { value, preset, setPreset, custom, setCustom };
}

export function RangePicker({
  state,
  presets = ["24h", "7d", "30d", "90d"],
  anchor,
  minDate,
}: {
  state: ReturnType<typeof useRange>;
  presets?: RangePreset[];
  anchor: number;
  minDate?: number;
}) {
  const labels: Record<RangePreset, string> = { today: "Today", "24h": "24H", "7d": "7D", "30d": "30D", "90d": "90D", custom: "Custom" };
  const [draft, setDraft] = useState({ from: toInputDate(state.custom.from), to: toInputDate(state.custom.to) });
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
      {presets.map((p) => (
        <button
          key={p}
          onClick={() => state.setPreset(p)}
          aria-pressed={state.preset === p}
          className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition", state.preset === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {labels[p]}
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-pressed={state.preset === "custom"}
            className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition", state.preset === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <CalendarRange className="size-3.5" />
            {state.preset === "custom" ? `${fmtShortDate(state.custom.from)} – ${fmtShortDate(state.custom.to)}` : labels.custom}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Custom date range</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rf">From</Label>
                <Input id="rf" type="date" value={draft.from} min={minDate ? toInputDate(minDate) : undefined} max={toInputDate(anchor)} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rt">To</Label>
                <Input id="rt" type="date" value={draft.to} max={toInputDate(anchor + 30 * DAY)} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                let from = fromInputs(draft.from);
                let to = fromInputs(draft.to, "23:59");
                if (from > to) [from, to] = [to, from];
                state.setCustom({ from, to: Math.min(to, Math.max(anchor, to)) });
                state.setPreset("custom");
                setOpen(false);
              }}
            >
              Apply range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
