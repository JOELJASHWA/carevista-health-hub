import { useMemo, useState } from "react";
import { Brush, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChartTooltipBox, EmptyState, Panel, StatTile, Trend } from "@/components/cv/common";
import { VITALS, VITAL_KEYS, downsample, filterRange, isAbnormal, stats } from "@/data/vitals";
import type { Reading, Thresholds, VitalKey } from "@/data/types";
import { fmtAxis, fmtDateTime, fmtNum } from "@/lib/format";

interface Props {
  title: string;
  keys: VitalKey[];
  readings: Reading[];
  from: number;
  to: number;
  thresholds: Thresholds;
}

/** Interactive per-patient vital chart: legend toggling, zoom (brush), compare vital, previous period, abnormal markers. */
export function VitalChart({ title, keys, readings, from, to, thresholds }: Props) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [compare, setCompare] = useState<VitalKey | "none">("none");
  const [prev, setPrev] = useState(false);
  const [brushKey, setBrushKey] = useState(0);

  const span = to - from;
  const inRange = useMemo(() => filterRange(readings, from, to), [readings, from, to]);
  const prevRange = useMemo(() => filterRange(readings, from - span, from), [readings, from, span]);

  const data = useMemo(() => {
    const cur = downsample(inRange, 200);
    const p = prev ? downsample(prevRange, cur.length) : [];
    return cur.map((r, i) => {
      const row: Record<string, number> = { ...r };
      if (prev && p.length) {
        const pr = p[Math.min(p.length - 1, Math.floor((i / cur.length) * p.length))];
        for (const k of keys) row[`prev_${k}`] = pr[k];
      }
      return row;
    });
  }, [inRange, prevRange, prev, keys]);

  const st = keys.map((k) => ({ k, s: stats(inRange, k, thresholds), ps: stats(prevRange, k, thresholds) }));
  const abnormalTotal = st.reduce((a, x) => a + (x.s?.abnormal ?? 0), 0);
  const unitMap: Record<string, string> = {};
  for (const k of VITAL_KEYS) {
    unitMap[k] = VITALS[k].unit;
    unitMap[`prev_${k}`] = VITALS[k].unit;
  }

  const toggle = (dataKey: string) => setHidden((h) => (h.includes(dataKey) ? h.filter((x) => x !== dataKey) : [...h, dataKey]));
  const reset = () => {
    setHidden([]);
    setCompare("none");
    setPrev(false);
    setBrushKey((k) => k + 1);
  };

  const dot = (k: VitalKey) =>
    function AbnormalDot(props: { cx?: number; cy?: number; payload?: Record<string, number>; index?: number }) {
      const { cx, cy, payload, index } = props;
      if (cx === undefined || cy === undefined || !payload || !isAbnormal(k, payload[k], thresholds)) return <g key={`d-${k}-${index}`} />;
      return <circle key={`d-${k}-${index}`} cx={cx} cy={cy} r={3.5} fill="var(--critical)" stroke="var(--card)" strokeWidth={1.5} />;
    };

  const primary = keys[0];
  const unit = VITALS[primary].unit;

  return (
    <Panel
      expandable
      title={
        <span className="flex items-center gap-2">
          {title}
          <span className="text-xs font-normal text-muted-foreground">({unit})</span>
          {abnormalTotal > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-critical/12 px-2 py-0.5 text-[10px] font-semibold text-critical">
              <AlertTriangle className="size-3" /> {abnormalTotal} flagged
            </span>
          )}
        </span>
      }
      description={st[0].s ? `${st[0].s.count} simulated readings in range` : "No readings in range"}
      actions={
        <Button variant="ghost" size="icon" className="size-7" onClick={reset} aria-label={`Reset ${title} chart`}>
          <RotateCcw className="size-3.5" />
        </Button>
      }
    >
      {!inRange.length ? (
        <EmptyState title="No readings in this period" description="Choose a wider date range to see this patient's simulated history." />
      ) : (
        <div className="flex h-full flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {st.map(({ k, s, ps }) =>
              s ? (
                <div key={k} className="contents">
                  {keys.length > 1 ? (
                    <>
                      <StatTile label={`Avg ${VITALS[k].short}`} value={fmtNum(s.avg, VITALS[k].decimals)} unit={VITALS[k].unit} />
                      <StatTile label={`${VITALS[k].short} min–max`} value={`${fmtNum(s.min, VITALS[k].decimals)}–${fmtNum(s.max, VITALS[k].decimals)}`} tone={s.abnormal ? "warning" : "default"} />
                    </>
                  ) : (
                    <>
                      <StatTile label="Average" value={fmtNum(s.avg, VITALS[k].decimals)} unit={VITALS[k].unit} />
                      <StatTile label="Minimum" value={fmtNum(s.min, VITALS[k].decimals)} unit={VITALS[k].unit} tone={isAbnormal(k, s.min, thresholds) ? "critical" : "default"} />
                      <StatTile label="Maximum" value={fmtNum(s.max, VITALS[k].decimals)} unit={VITALS[k].unit} tone={isAbnormal(k, s.max, thresholds) ? "critical" : "default"} />
                      <div className="rounded-lg border border-border/70 bg-surface px-3 py-2">
                        <div className="eyebrow !text-[10px]">Trend</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Trend change={s.change} />
                          {prev && ps && <span className="num text-[10px] text-muted-foreground">prev avg {fmtNum(ps.avg, VITALS[k].decimals)}</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null,
            )}
          </div>

          <div className="chart-box h-64 min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: compare !== "none" ? 4 : 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={(t) => fmtAxis(t, span)} minTickGap={40} tickLine={false} axisLine={false} />
                <YAxis yAxisId="l" domain={["auto", "auto"]} tickLine={false} axisLine={false} width={44} />
                {compare !== "none" && <YAxis yAxisId="r" orientation="right" domain={["auto", "auto"]} tickLine={false} axisLine={false} width={40} />}
                <Tooltip content={<ChartTooltipBox labelFormatter={(l) => fmtDateTime(Number(l))} unitMap={unitMap} />} />
                <Legend verticalAlign="top" height={26} iconType="circle" iconSize={8} onClick={(e) => toggle(String((e as { dataKey?: unknown }).dataKey))} formatter={(v, e) => <span style={{ opacity: hidden.includes(String((e as { dataKey?: unknown }).dataKey)) ? 0.4 : 1 }}>{v}</span>} />
                {keys.length === 1 && (
                  <>
                    <ReferenceLine yAxisId="l" y={thresholds[primary][0]} stroke="var(--warning)" strokeDasharray="4 4" strokeOpacity={0.7} />
                    {primary !== "spo2" && <ReferenceLine yAxisId="l" y={thresholds[primary][1]} stroke="var(--warning)" strokeDasharray="4 4" strokeOpacity={0.7} />}
                  </>
                )}
                {keys.map((k) => (
                  <Line key={k} yAxisId="l" dataKey={k} name={VITALS[k].label} type="monotone" stroke={VITALS[k].color} strokeWidth={2} dot={dot(k)} activeDot={{ r: 4 }} hide={hidden.includes(k)} isAnimationActive={false} />
                ))}
                {prev &&
                  keys.map((k) => (
                    <Line key={`prev_${k}`} yAxisId="l" dataKey={`prev_${k}`} name={`${VITALS[k].short} (previous period)`} type="monotone" stroke={VITALS[k].color} strokeOpacity={0.45} strokeDasharray="5 4" strokeWidth={1.5} dot={false} hide={hidden.includes(`prev_${k}`)} isAnimationActive={false} />
                  ))}
                {compare !== "none" && (
                  <Line yAxisId="r" dataKey={compare} name={`${VITALS[compare].label} (compare)`} type="monotone" stroke={VITALS[compare].color} strokeWidth={1.5} strokeDasharray="2 3" dot={false} hide={hidden.includes(compare)} isAnimationActive={false} />
                )}
                {data.length > 20 && <Brush key={brushKey} dataKey="t" height={22} travellerWidth={8} stroke="var(--primary)" fill="var(--surface)" tickFormatter={(t) => fmtAxis(t, span)} />}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="no-print flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Compare with</span>
              <Select value={compare} onValueChange={(v) => setCompare(v as VitalKey | "none")}>
                <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No comparison</SelectItem>
                  {VITAL_KEYS.filter((k) => !keys.includes(k)).map((k) => (
                    <SelectItem key={k} value={k}>{VITALS[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id={`prev-${title}`} checked={prev} onCheckedChange={setPrev} />
              <Label htmlFor={`prev-${title}`} className="text-xs text-muted-foreground">Previous period</Label>
            </div>
            <span className="ml-auto text-muted-foreground">Drag the slider below the chart to zoom · click legend to hide series</span>
          </div>
        </div>
      )}
    </Panel>
  );
}
