import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  GitCompareArrows,
  Heart,
  HeartPulse,
  Info,
  Thermometer,
  Users,
  Wind,
} from "lucide-react";
import {
  ChartTooltipBox,
  DemoNote,
  PageHeader,
  Panel,
  PatientAvatar,
  RiskBadge,
  StatusBadge,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/store/store";
import { filterRange, getVitals, stats, VITALS, VITAL_KEYS } from "@/data/vitals";
import { fmtDate, fmtDateTime, fmtNum, fmtShortDate } from "@/lib/format";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VitalKey } from "@/data/types";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Patient Cohort Comparison – CareVista" },
      { name: "description", content: "Side-by-side patient vital-sign trend and clinical trajectory comparative analysis." },
      { property: "og:title", content: "Patient Comparison – CareVista" },
      { property: "og:description", content: "Compare vital-sign trends for two or three patients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientComparePage,
});

const PATIENT_COLORS = ["#14B8A6", "#38BDF8", "#F59E0B"];

function PatientComparePage() {
  const s = useAppState();

  const [p1Id, setP1Id] = useState<string>(s.patients[0]?.id ?? "");
  const [p2Id, setP2Id] = useState<string>(s.patients[1]?.id ?? "");
  const [p3Id, setP3Id] = useState<string>(""); // optional 3rd patient
  const [selectedVital, setSelectedVital] = useState<VitalKey>("hr");
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");

  const spanMs = range === "24h" ? 86400000 : range === "7d" ? 7 * 86400000 : 30 * 86400000;
  const startTime = s.anchor - spanMs;

  const p1 = useMemo(() => s.patients.find((p) => p.id === p1Id), [s.patients, p1Id]);
  const p2 = useMemo(() => s.patients.find((p) => p.id === p2Id), [s.patients, p2Id]);
  const p3 = useMemo(() => s.patients.find((p) => p.id === p3Id), [s.patients, p3Id]);

  const comparedPatients = [p1, p2, p3].filter(Boolean) as typeof s.patients;

  // Comparative chart data
  const chartData = useMemo(() => {
    if (!p1 || !p2) return [];

    const v1 = filterRange(getVitals(p1, s.anchor), startTime, s.anchor);
    const v2 = filterRange(getVitals(p2, s.anchor), startTime, s.anchor);
    const v3 = p3 ? filterRange(getVitals(p3, s.anchor), startTime, s.anchor) : [];

    const len = Math.min(v1.length, v2.length, p3 && v3.length ? v3.length : Infinity);
    const step = range === "30d" ? 4 : range === "7d" ? 2 : 1;

    const points: any[] = [];
    for (let i = 0; i < len; i += step) {
      const item: any = {
        t: v1[i].t,
        date: range === "24h" ? fmtDateTime(v1[i].t).split(", ")[1] : fmtShortDate(v1[i].t),
        [p1.name]: v1[i][selectedVital],
        [p2.name]: v2[i][selectedVital],
      };
      if (p3 && v3[i]) {
        item[p3.name] = v3[i][selectedVital];
      }
      points.push(item);
    }
    return points;
  }, [p1, p2, p3, s.anchor, startTime, selectedVital, range]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Cohort Comparison"
        description="Comparative analysis of hemodynamic trajectories, vital-sign trends, and acuity classifications for multiple patients."
        crumbs={[{ label: "Patient Comparison" }]}
      />
      <DemoNote />

      {/* Patient Selector Ribbon */}
      <div className="panel p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/60 pb-3">
          <GitCompareArrows className="size-4 text-primary" />
          Select Patients for Comparison (2 to 3 Patients)
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Patient 1 */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1 font-medium">Primary Patient (A)</label>
            <Select value={p1Id} onValueChange={setP1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select Patient 1" />
              </SelectTrigger>
              <SelectContent>
                {s.patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.id}) · {p.condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient 2 */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1 font-medium">Secondary Patient (B)</label>
            <Select value={p2Id} onValueChange={setP2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select Patient 2" />
              </SelectTrigger>
              <SelectContent>
                {s.patients
                  .filter((p) => p.id !== p1Id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.id}) · {p.condition}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient 3 (Optional) */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1 font-medium">Third Patient (C, Optional)</label>
            <Select value={p3Id} onValueChange={setP3Id}>
              <SelectTrigger>
                <SelectValue placeholder="None selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Compare 2)</SelectItem>
                {s.patients
                  .filter((p) => p.id !== p1Id && p.id !== p2Id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.id}) · {p.condition}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Side-by-Side Patient Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comparedPatients.map((p, idx) => {
          const doc = s.doctors.find((d) => d.id === p.doctorId);
          const color = PATIENT_COLORS[idx];
          const vitals = filterRange(getVitals(p, s.anchor), startTime, s.anchor);
          const vStat = stats(vitals, selectedVital, s.settings.thresholds);

          return (
            <div
              key={p.id}
              className="panel p-5 relative overflow-hidden"
              style={{ borderTop: `4px solid ${color}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PatientAvatar name={p.name} seed={p.seed} size="md" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      <Link to="/patients/$patientId" params={{ patientId: p.id }} className="hover:underline">
                        {p.name}
                      </Link>
                    </h3>
                    <p className="num text-xs text-muted-foreground">
                      {p.id} · {p.age}y {p.gender}
                    </p>
                  </div>
                </div>
                <RiskBadge risk={p.risk} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground rounded bg-surface/60 p-2.5">
                <div>
                  <span className="eyebrow !text-[9px]">Department</span>
                  <p className="font-medium text-foreground">{p.department}</p>
                </div>
                <div>
                  <span className="eyebrow !text-[9px]">Bed</span>
                  <p className="font-medium text-foreground">{p.room === "—" ? "Outpatient" : `${p.room}-${p.bed}`}</p>
                </div>
                <div className="col-span-2">
                  <span className="eyebrow !text-[9px]">Attending Physician</span>
                  <p className="font-medium text-foreground">{doc?.name}</p>
                </div>
              </div>

              {vStat && (
                <div className="mt-3 border-t border-border/60 pt-3 text-xs">
                  <span className="eyebrow !text-[9px]">
                    {VITALS[selectedVital].label} Mean ({range})
                  </span>
                  <p className="num text-lg font-bold text-foreground">
                    {fmtNum(vStat.avg, VITALS[selectedVital].decimals)} {VITALS[selectedVital].unit}
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      (min {fmtNum(vStat.min)} / max {fmtNum(vStat.max)})
                    </span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparative Trends Chart */}
      <Panel
        title={`Comparative Vital Trajectory: ${VITALS[selectedVital].label}`}
        description={`Interactive overlay comparison of ${comparedPatients.map((p) => p.name).join(" vs ")}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Vital selector */}
            <Select value={selectedVital} onValueChange={(v: VitalKey) => setSelectedVital(v)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Vital" />
              </SelectTrigger>
              <SelectContent>
                {VITAL_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {VITALS[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time range selector */}
            <div className="flex rounded-lg border border-border/80 p-0.5 bg-surface/50">
              {(["24h", "7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-0.5 rounded text-xs font-medium transition ${
                    range === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="h-80 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -10, right: 15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                unit={VITALS[selectedVital].unit}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<ChartTooltipBox />} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              {comparedPatients.map((p, idx) => (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.name}
                  name={`${p.name} (${p.id})`}
                  stroke={PATIENT_COLORS[idx]}
                  strokeWidth={2.2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Comparative Statistics Table */}
      <Panel title="Side-by-Side Vital Parameter Summary" description={`Metrics calculated across selected ${range} span`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-border/70">
            <thead className="bg-surface/80 text-muted-foreground border-b border-border/70">
              <tr>
                <th className="px-4 py-3 font-medium">Vital Metric</th>
                {comparedPatients.map((p, idx) => (
                  <th key={p.id} className="px-4 py-3 font-semibold" style={{ color: PATIENT_COLORS[idx] }}>
                    {p.name} ({p.id})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {VITAL_KEYS.map((k) => (
                <tr key={k}>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {VITALS[k].label} ({VITALS[k].unit})
                  </td>
                  {comparedPatients.map((p) => {
                    const v = filterRange(getVitals(p, s.anchor), startTime, s.anchor);
                    const st = stats(v, k, s.settings.thresholds);
                    return (
                      <td key={p.id} className="num px-4 py-2.5">
                        {st ? (
                          <span>
                            <strong>{fmtNum(st.avg, VITALS[k].decimals)}</strong>{" "}
                            <span className="text-muted-foreground text-[11px]">
                              ({fmtNum(st.min)}–{fmtNum(st.max)}) · {st.trend}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
