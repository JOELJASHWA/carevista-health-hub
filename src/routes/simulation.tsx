import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Heart,
  HeartPulse,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";
import {
  DemoNote,
  PageHeader,
  Panel,
  PatientAvatar,
  Pill,
  RiskBadge,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/store/store";
import { classify, isAbnormal, VITALS, VITAL_KEYS } from "@/data/vitals";
import { fmtNum } from "@/lib/format";
import type { Reading, VitalKey } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "What-If Clinical Simulation – CareVista" },
      { name: "description", content: "Interactive physiological parameter simulation and threshold violation testing (educational demo)." },
      { property: "og:title", content: "What-If Clinical Simulation – CareVista" },
      { property: "og:description", content: "Educational simulation of physiological thresholds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SimulationPage,
});

const PRESETS: { name: string; desc: string; values: Omit<Reading, "t"> }[] = [
  {
    name: "Normal Resting Baseline",
    desc: "Hemodynamically stable within normal physiological limits",
    values: { hr: 72, sys: 120, dia: 80, spo2: 98, temp: 36.8, rr: 16 },
  },
  {
    name: "Acute Tachycardia & Hypertensive Crisis",
    desc: "Elevated heart rate and dangerously high arterial pressure",
    values: { hr: 142, sys: 185, dia: 110, spo2: 95, temp: 37.4, rr: 24 },
  },
  {
    name: "Severe Hypoxemia / Respiratory Distress",
    desc: "Critical oxygen desaturation with tachypnea",
    values: { hr: 115, sys: 130, dia: 85, spo2: 82, temp: 37.1, rr: 32 },
  },
  {
    name: "Hyperpyrexia & Septic Profile",
    desc: "High fever, tachycardia, and early hypotension",
    values: { hr: 128, sys: 92, dia: 56, spo2: 93, temp: 39.8, rr: 28 },
  },
  {
    name: "Severe Bradycardia",
    desc: "Depressed cardiac pacing below acceptable threshold",
    values: { hr: 42, sys: 105, dia: 65, spo2: 96, temp: 36.2, rr: 12 },
  },
];

function SimulationPage() {
  const s = useAppState();
  const th = s.settings.thresholds;

  const [activePreset, setActivePreset] = useState<string>("Normal Resting Baseline");
  const [baseline, setBaseline] = useState<Omit<Reading, "t">>(PRESETS[0].values);
  const [simValues, setSimValues] = useState<Omit<Reading, "t">>(PRESETS[0].values);

  // Classification for simulated values
  const simResult = useMemo(() => classify(simValues, th), [simValues, th]);
  const baselineResult = useMemo(() => classify(baseline, th), [baseline, th]);

  const applyPreset = (presetName: string) => {
    const found = PRESETS.find((p) => p.name === presetName);
    if (!found) return;
    setActivePreset(presetName);
    setBaseline(found.values);
    setSimValues(found.values);
  };

  const resetToBaseline = () => {
    setSimValues(baseline);
  };

  const updateVital = (key: VitalKey, val: number) => {
    setSimValues((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="What-If Clinical Simulation"
        description="Interactive physiological parameter modeling and threshold violation simulator for educational exploration."
        crumbs={[{ label: "What-if Simulation" }]}
        actions={
          <Button variant="outline" size="sm" onClick={resetToBaseline}>
            <RotateCcw className="size-3.5 mr-1" />
            Reset to Baseline
          </Button>
        }
      />

      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-xs text-warning-foreground space-y-1">
        <p className="font-semibold flex items-center gap-1.5 text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          Educational Simulation Disclaimer
        </p>
        <p className="text-muted-foreground leading-relaxed">
          This module is designed strictly for demonstration of algorithm scoring and hemodynamic threshold triggers using synthetic variables. It does not provide medical diagnostic output, clinical decision support, or therapeutic advice.
        </p>
      </div>

      {/* Preset Selector */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Clinical Scenario Presets:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.name}
              variant={activePreset === p.name ? "secondary" : "ghost"}
              size="sm"
              className="text-xs h-7"
              onClick={() => applyPreset(p.name)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Simulation Workspace */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sliders Panel */}
        <Panel
          title="Interactive Physiological Sliders"
          description="Adjust vital parameters to simulate acute hemodynamic transitions"
          className="lg:col-span-2"
        >
          <div className="space-y-6 pt-3">
            {/* Heart Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Heart className="size-3.5 text-critical" /> Heart Rate (BPM)
                </span>
                <span className="num font-bold text-sm text-foreground">
                  {fmtNum(simValues.hr)} bpm{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Normal: {th.hr[0]}–{th.hr[1]})
                  </span>
                </span>
              </div>
              <Slider
                value={[simValues.hr]}
                min={30}
                max={200}
                step={1}
                onValueChange={([val]) => updateVital("hr", val)}
              />
            </div>

            {/* Systolic BP */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Activity className="size-3.5 text-primary" /> Systolic Blood Pressure (mmHg)
                </span>
                <span className="num font-bold text-sm text-foreground">
                  {fmtNum(simValues.sys)} mmHg{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Normal: {th.sys[0]}–{th.sys[1]})
                  </span>
                </span>
              </div>
              <Slider
                value={[simValues.sys]}
                min={60}
                max={240}
                step={1}
                onValueChange={([val]) => updateVital("sys", val)}
              />
            </div>

            {/* Diastolic BP */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Activity className="size-3.5 text-primary" /> Diastolic Blood Pressure (mmHg)
                </span>
                <span className="num font-bold text-sm text-foreground">
                  {fmtNum(simValues.dia)} mmHg{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Normal: {th.dia[0]}–{th.dia[1]})
                  </span>
                </span>
              </div>
              <Slider
                value={[simValues.dia]}
                min={35}
                max={140}
                step={1}
                onValueChange={([val]) => updateVital("dia", val)}
              />
            </div>

            {/* Oxygen Saturation SpO2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <HeartPulse className="size-3.5 text-info" /> Oxygen Saturation (SpO₂ %)
                </span>
                <span className="num font-bold text-sm text-foreground">
                  {fmtNum(simValues.spo2)}%{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Normal: {th.spo2[0]}–{th.spo2[1]}%)
                  </span>
                </span>
              </div>
              <Slider
                value={[simValues.spo2]}
                min={70}
                max={100}
                step={1}
                onValueChange={([val]) => updateVital("spo2", val)}
              />
            </div>

            {/* Body Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Thermometer className="size-3.5 text-warning" /> Body Temperature (°C)
                </span>
                <span className="num font-bold text-sm text-foreground">
                  {fmtNum(simValues.temp, 1)}°C{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Normal: {th.temp[0]}–{th.temp[1]}°C)
                  </span>
                </span>
              </div>
              <Slider
                value={[simValues.temp]}
                min={34}
                max={42}
                step={0.1}
                onValueChange={([val]) => updateVital("temp", val)}
              />
            </div>

            {/* Respiratory Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Wind className="size-3.5 text-chart-3" /> Respiratory Rate (bpm)
                </span>
                <span className="num font-bold text-sm text-foreground">
                  {fmtNum(simValues.rr)} bpm{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Normal: {th.rr[0]}–{th.rr[1]})
                  </span>
                </span>
              </div>
              <Slider
                value={[simValues.rr]}
                min={6}
                max={48}
                step={1}
                onValueChange={([val]) => updateVital("rr", val)}
              />
            </div>
          </div>
        </Panel>

        {/* Dynamic Simulated Acuity & Assessment Output */}
        <div className="space-y-4">
          <Panel title="Simulated Acuity Outcome" description="Dynamically recalculated algorithm risk">
            <div className="space-y-4 pt-1">
              {/* Risk Badge Output */}
              <div
                className={cn(
                  "rounded-lg border p-4 text-center transition",
                  simResult.risk === "Critical" && "border-critical bg-critical/15 text-critical",
                  simResult.risk === "Warning" && "border-warning bg-warning/15 text-warning",
                  simResult.risk === "Stable" && "border-success bg-success/15 text-success"
                )}
              >
                <span className="eyebrow !text-[10px]">Predicted Acuity Tier</span>
                <p className="text-2xl font-bold mt-1 tracking-tight">{simResult.risk} Status</p>
                <p className="text-xs mt-1 opacity-80">
                  Calculated Demonstration Severity Score: <strong>{simResult.score} pts</strong>
                </p>
              </div>

              {/* Baseline vs Current Delta */}
              <div className="rounded-lg border border-border/70 bg-surface/60 p-3.5 space-y-2 text-xs">
                <span className="eyebrow !text-[9px]">Variance Against Initial Baseline</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-muted-foreground">Heart Rate: </span>
                    <span className="font-semibold text-foreground">
                      {simValues.hr - baseline.hr > 0 ? `+${simValues.hr - baseline.hr}` : simValues.hr - baseline.hr} bpm
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Blood Press: </span>
                    <span className="font-semibold text-foreground">
                      {simValues.sys - baseline.sys > 0 ? `+${simValues.sys - baseline.sys}` : simValues.sys - baseline.sys} mmHg
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SpO₂: </span>
                    <span className="font-semibold text-foreground">
                      {simValues.spo2 - baseline.spo2 > 0 ? `+${simValues.spo2 - baseline.spo2}` : simValues.spo2 - baseline.spo2}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Temp: </span>
                    <span className="font-semibold text-foreground">
                      {(simValues.temp - baseline.temp).toFixed(1)}°C
                    </span>
                  </div>
                </div>
              </div>

              {/* Threshold Violations List */}
              <div className="space-y-2">
                <span className="eyebrow !text-[9px]">Active Threshold Flags</span>
                {VITAL_KEYS.some((k) => isAbnormal(k, simValues[k], th)) ? (
                  <ul className="space-y-1.5 text-xs">
                    {VITAL_KEYS.filter((k) => isAbnormal(k, simValues[k], th)).map((k) => (
                      <li
                        key={k}
                        className="flex items-center justify-between rounded bg-critical/10 border border-critical/30 p-2 text-critical"
                      >
                        <span className="font-medium">{VITALS[k].label}</span>
                        <span className="num font-bold">
                          {fmtNum(simValues[k], VITALS[k].decimals)} {VITALS[k].unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded bg-success/10 border border-success/30 p-3 text-xs text-success flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    All physiological variables are within configured safe bounds.
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
