import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Heart,
  HeartPulse,
  Radio,
  Search,
  ShieldAlert,
  Thermometer,
  Wind,
} from "lucide-react";
import {
  DemoNote,
  EmptyState,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
  Pill,
  RiskBadge,
  StatusBadge,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/store/store";
import { DEPARTMENTS } from "@/data/conditions";
import { classify, getVitals, isAbnormal, VITALS, VITAL_KEYS } from "@/data/vitals";
import { fmtDate, fmtDateTime, fmtNum, fmtRelative } from "@/lib/format";
import type { Risk, VitalKey } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monitoring")({
  head: () => ({
    meta: [
      { title: "Clinical Monitoring Command Centre – CareVista" },
      { name: "description", content: "Simulated patient telemetry, hemodynamic risk surveillance and clinical alerts (demonstration data)." },
      { property: "og:title", content: "Clinical Monitoring – CareVista" },
      { property: "og:description", content: "Simulated telemetry surveillance and inpatient risk heatmap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClinicalMonitoringPage,
});

function ClinicalMonitoringPage() {
  const s = useAppState();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [doctorFilter, setDoctorFilter] = useState("All");
  const [selectedDeptForHeatmap, setSelectedDeptForHeatmap] = useState<string | null>(null);

  const th = s.settings.thresholds;

  // Compute latest vitals and demonstration classifications for all patients
  const patientMonitoringData = useMemo(() => {
    return s.patients.map((p) => {
      const readings = getVitals(p, s.anchor);
      const latest = readings[readings.length - 1];
      const classification = classify(latest, th);
      const abnormalKeys = VITAL_KEYS.filter((k) => isAbnormal(k, latest[k], th));
      return {
        patient: p,
        latest,
        classification,
        abnormalKeys,
      };
    });
  }, [s.patients, s.anchor, th]);

  const docMap = useMemo(() => new Map(s.doctors.map((d) => [d.id, d])), [s.doctors]);

  // Overall counts
  const criticalCohort = useMemo(
    () => patientMonitoringData.filter((d) => d.patient.risk === "Critical"),
    [patientMonitoringData]
  );
  const warningCohort = useMemo(
    () => patientMonitoringData.filter((d) => d.patient.risk === "Warning"),
    [patientMonitoringData]
  );
  const stableCohort = useMemo(
    () => patientMonitoringData.filter((d) => d.patient.risk === "Stable"),
    [patientMonitoringData]
  );
  const abnormalVitalsCount = useMemo(
    () => patientMonitoringData.filter((d) => d.abnormalKeys.length > 0).length,
    [patientMonitoringData]
  );

  // Department Risk Heatmap matrix
  const deptMatrix = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const cohort = patientMonitoringData.filter((d) => d.patient.department === dept);
      const critical = cohort.filter((d) => d.patient.risk === "Critical").length;
      const warning = cohort.filter((d) => d.patient.risk === "Warning").length;
      const stable = cohort.filter((d) => d.patient.risk === "Stable").length;
      const total = cohort.length;
      return { dept, total, critical, warning, stable };
    });
  }, [patientMonitoringData]);

  // Filtered patients for list
  const filteredData = useMemo(() => {
    return patientMonitoringData.filter(({ patient }) => {
      const q = search.trim().toLowerCase();
      const matchQuery =
        !q ||
        patient.name.toLowerCase().includes(q) ||
        patient.id.toLowerCase().includes(q) ||
        patient.condition.toLowerCase().includes(q);
      const matchDept = department === "All" || patient.department === department;
      const matchRisk = riskFilter === "All" || patient.risk === riskFilter;
      const matchDoc = doctorFilter === "All" || patient.doctorId === doctorFilter;
      const matchHeatmap = !selectedDeptForHeatmap || patient.department === selectedDeptForHeatmap;
      return matchQuery && matchDept && matchRisk && matchDoc && matchHeatmap;
    });
  }, [patientMonitoringData, search, department, riskFilter, doctorFilter, selectedDeptForHeatmap]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Monitoring Command Centre"
        description="Simulated continuous patient telemetry, hemodynamic surveillance, and clinical risk acuity tracking."
        crumbs={[{ label: "Clinical Monitoring" }]}
      />
      <DemoNote />

      {/* Top Telemetry KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Critical Acuity"
          value={criticalCohort.length}
          sub="Requires immediate rounds"
          icon={AlertOctagon}
          tone="critical"
          onClick={() => setRiskFilter("Critical")}
        />
        <KpiCard
          label="Telemetry Warnings"
          value={warningCohort.length}
          sub="Elevated risk trajectory"
          icon={AlertTriangle}
          tone="warning"
          onClick={() => setRiskFilter("Warning")}
        />
        <KpiCard
          label="Stable Cohort"
          value={stableCohort.length}
          sub="Parameters within range"
          icon={CheckCircle2}
          tone="success"
          onClick={() => setRiskFilter("Stable")}
        />
        <KpiCard
          label="Out-of-Range Vitals"
          value={abnormalVitalsCount}
          sub="Patients exceeding threshold"
          icon={Radio}
          tone="info"
        />
      </div>

      {/* Interactive Patient Risk Heatmap */}
      <Panel
        title="Department Risk Matrix & Acuity Heatmap"
        description="Click any department to filter telemetry streams below"
        actions={
          selectedDeptForHeatmap ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedDeptForHeatmap(null)}
              className="text-xs h-7"
            >
              Clear Heatmap Selection
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {deptMatrix.map((m) => {
            const isSelected = selectedDeptForHeatmap === m.dept;
            const hasCritical = m.critical > 0;
            return (
              <button
                key={m.dept}
                onClick={() => setSelectedDeptForHeatmap(isSelected ? null : m.dept)}
                className={cn(
                  "flex flex-col justify-between rounded-lg border p-3 text-left transition hover:border-primary/50",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border/70 bg-surface/60",
                  hasCritical && !isSelected && "border-critical/40"
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs text-foreground truncate">{m.dept}</span>
                  <span className="num text-[11px] text-muted-foreground">{m.total} pts</span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  {m.critical > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-critical/15 px-1.5 py-0.5 text-[11px] font-semibold text-critical">
                      <span className="size-1.5 rounded-full bg-critical" />
                      {m.critical} Crit
                    </span>
                  )}
                  {m.warning > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold text-warning">
                      <span className="size-1.5 rounded-full bg-warning" />
                      {m.warning} Warn
                    </span>
                  )}
                  {m.stable > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[11px] font-semibold text-success">
                      {m.stable} Stb
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Filter Toolbar */}
      <div className="panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search patient telemetry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Departments</SelectItem>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Risk Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Risk Levels</SelectItem>
                <SelectItem value="Critical">Critical Risk Only</SelectItem>
                <SelectItem value="Warning">Warning Risk Only</SelectItem>
                <SelectItem value="Stable">Stable Cohort Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Physician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Physicians</SelectItem>
                {s.doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Telemetry Grid: Detailed Patient Cards */}
      {filteredData.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Filter}
            title="No telemetry records match filters"
            description="Clear search or adjust filters to view patient monitoring streams."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setDepartment("All");
                  setRiskFilter("All");
                  setDoctorFilter("All");
                  setSelectedDeptForHeatmap(null);
                }}
              >
                Reset Filters
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredData.map(({ patient: p, latest, classification, abnormalKeys }) => {
            const doc = docMap.get(p.doctorId);
            const isCrit = p.risk === "Critical";
            const isWarn = p.risk === "Warning";

            return (
              <div
                key={p.id}
                className={cn(
                  "panel p-5 flex flex-col justify-between transition hover:shadow-lg",
                  isCrit && "border-critical/50 bg-critical/5",
                  isWarn && "border-warning/50 bg-warning/5"
                )}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <PatientAvatar name={p.name} seed={p.seed} size="md" />
                        {isCrit && (
                          <span className="pulse-dot absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-critical text-critical" />
                        )}
                      </div>
                      <div>
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: p.id }}
                          className="font-semibold text-base text-foreground hover:text-primary transition-colors block"
                        >
                          {p.name}
                        </Link>
                        <p className="num text-xs text-muted-foreground">
                          {p.id} · {p.age}y {p.gender} · Bed {p.room}-{p.bed}
                        </p>
                      </div>
                    </div>
                    <RiskBadge risk={p.risk} />
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                    <span className="truncate">{p.condition}</span>
                    <span className="text-foreground/80 font-medium">{p.department}</span>
                  </div>

                  {/* Vitals Telemetry Ribbon */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {/* HR */}
                    <div
                      className={cn(
                        "rounded-md border p-2 text-center",
                        abnormalKeys.includes("hr")
                          ? "border-critical/60 bg-critical/15 text-critical"
                          : "border-border/60 bg-surface/70"
                      )}
                    >
                      <span className="eyebrow !text-[9px] flex items-center justify-center gap-0.5">
                        <Heart className="size-2.5" /> HR
                      </span>
                      <p className="num font-bold text-sm mt-0.5">{fmtNum(latest.hr)}</p>
                      <span className="text-[10px] text-muted-foreground">bpm</span>
                    </div>

                    {/* BP */}
                    <div
                      className={cn(
                        "rounded-md border p-2 text-center",
                        abnormalKeys.includes("sys") || abnormalKeys.includes("dia")
                          ? "border-critical/60 bg-critical/15 text-critical"
                          : "border-border/60 bg-surface/70"
                      )}
                    >
                      <span className="eyebrow !text-[9px] flex items-center justify-center gap-0.5">
                        <Activity className="size-2.5" /> BP
                      </span>
                      <p className="num font-bold text-sm mt-0.5">
                        {fmtNum(latest.sys)}/{fmtNum(latest.dia)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">mmHg</span>
                    </div>

                    {/* SpO2 */}
                    <div
                      className={cn(
                        "rounded-md border p-2 text-center",
                        abnormalKeys.includes("spo2")
                          ? "border-critical/60 bg-critical/15 text-critical"
                          : "border-border/60 bg-surface/70"
                      )}
                    >
                      <span className="eyebrow !text-[9px] flex items-center justify-center gap-0.5">
                        <HeartPulse className="size-2.5" /> SpO₂
                      </span>
                      <p className="num font-bold text-sm mt-0.5">{fmtNum(latest.spo2)}%</p>
                      <span className="text-[10px] text-muted-foreground">sat</span>
                    </div>

                    {/* Temp */}
                    <div
                      className={cn(
                        "rounded-md border p-2 text-center",
                        abnormalKeys.includes("temp")
                          ? "border-critical/60 bg-critical/15 text-critical"
                          : "border-border/60 bg-surface/70"
                      )}
                    >
                      <span className="eyebrow !text-[9px] flex items-center justify-center gap-0.5">
                        <Thermometer className="size-2.5" /> Temp
                      </span>
                      <p className="num font-bold text-sm mt-0.5">{fmtNum(latest.temp, 1)}°C</p>
                      <span className="text-[10px] text-muted-foreground">body</span>
                    </div>

                    {/* RR */}
                    <div
                      className={cn(
                        "rounded-md border p-2 text-center",
                        abnormalKeys.includes("rr")
                          ? "border-critical/60 bg-critical/15 text-critical"
                          : "border-border/60 bg-surface/70"
                      )}
                    >
                      <span className="eyebrow !text-[9px] flex items-center justify-center gap-0.5">
                        <Wind className="size-2.5" /> Resp
                      </span>
                      <p className="num font-bold text-sm mt-0.5">{fmtNum(latest.rr)}</p>
                      <span className="text-[10px] text-muted-foreground">bpm</span>
                    </div>

                    {/* Demo Score */}
                    <div className="rounded-md border border-border/60 bg-surface/70 p-2 text-center">
                      <span className="eyebrow !text-[9px]">Acuity</span>
                      <p className="num font-bold text-sm mt-0.5 text-primary">
                        {classification.score}
                      </p>
                      <span className="text-[10px] text-muted-foreground">score</span>
                    </div>
                  </div>

                  {abnormalKeys.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-critical bg-critical/10 rounded px-2.5 py-1">
                      <AlertOctagon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        Threshold breach: {abnormalKeys.map((k) => VITALS[k].label).join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="text-muted-foreground truncate">
                    Dr: {doc?.name.replace("Dr. ", "")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                      <Link to="/patients/$patientId" params={{ patientId: p.id }} search={{ tab: "ecg" }}>
                        ECG
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="h-7 px-2.5 text-xs">
                      <Link to="/patients/$patientId" params={{ patientId: p.id }} search={{ tab: "vitals" }}>
                        Full Vitals →
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
