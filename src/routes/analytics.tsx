import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  Download,
  Filter,
  PieChart as PieIcon,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  ChartTooltipBox,
  DemoNote,
  KpiCard,
  PageHeader,
  Panel,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/store/store";
import { DEPARTMENTS } from "@/data/conditions";
import { downloadCsv } from "@/lib/csv";
import { fmtDate, fmtShortDate, pct } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Risk } from "@/data/types";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Enterprise Healthcare Analytics – CareVista" },
      { name: "description", content: "Executive analytics, clinical admissions, physician workload, and demographic intelligence." },
      { property: "og:title", content: "Analytics – CareVista" },
      { property: "og:description", content: "Admissions, discharges, workload and occupancy analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const RISK_COLORS: Record<Risk, string> = {
  Critical: "var(--critical)",
  Warning: "var(--warning)",
  Stable: "var(--success)",
};

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function AnalyticsPage() {
  const s = useAppState();
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [timeSpan, setTimeSpan] = useState<"7d" | "30d" | "90d">("30d");

  const spanDays = timeSpan === "7d" ? 7 : timeSpan === "30d" ? 30 : 90;
  const timeLimit = s.anchor - spanDays * 86400000;

  // Filtered patients
  const cohort = useMemo(() => {
    return s.patients.filter((p) => {
      const matchDept = departmentFilter === "All" || p.department === departmentFilter;
      return matchDept;
    });
  }, [s.patients, departmentFilter]);

  // Overall metrics
  const totalEncounters = s.encounters.length;
  const activeCensus = cohort.filter((p) => p.status === "Admitted" || p.status === "Under Observation").length;
  const criticalCensus = cohort.filter((p) => p.risk === "Critical").length;
  const bedOccupancy = pct(s.beds.filter((b) => b.status === "Occupied").length, s.beds.length);

  // 1. Department Census Bar Chart
  const deptData = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const pts = s.patients.filter((p) => p.department === dept);
      const admitted = pts.filter((p) => p.status === "Admitted" || p.status === "Under Observation").length;
      const critical = pts.filter((p) => p.risk === "Critical").length;
      return { department: dept, total: pts.length, admitted, critical };
    });
  }, [s.patients]);

  // 2. Doctor Workload Analysis
  const doctorWorkload = useMemo(() => {
    return s.doctors.map((d) => {
      const assigned = s.patients.filter((p) => p.doctorId === d.id).length;
      const appts = s.appointments.filter((a) => a.doctorId === d.id && a.status !== "Cancelled").length;
      return {
        name: d.name.replace("Dr. ", ""),
        specialization: d.specialization,
        patients: assigned,
        appointments: appts,
      };
    });
  }, [s.doctors, s.patients, s.appointments]);

  // 3. Risk Distribution Pie Chart
  const riskData = useMemo(() => {
    const counts: Record<Risk, number> = { Critical: 0, Warning: 0, Stable: 0 };
    cohort.forEach((p) => {
      counts[p.risk] = (counts[p.risk] || 0) + 1;
    });
    return [
      { name: "Critical Acuity", value: counts.Critical, color: RISK_COLORS.Critical },
      { name: "Warning Telemetry", value: counts.Warning, color: RISK_COLORS.Warning },
      { name: "Stable Cohort", value: counts.Stable, color: RISK_COLORS.Stable },
    ].filter((x) => x.value > 0);
  }, [cohort]);

  // 4. Admission / Discharge Trajectory (synthetic daily curve)
  const trajectoryData = useMemo(() => {
    const points: { date: string; admissions: number; discharges: number }[] = [];
    const days = spanDays;
    const step = Math.max(1, Math.floor(days / 12));

    for (let i = days; i >= 0; i -= step) {
      const t = s.anchor - i * 86400000;
      const dateLabel = fmtShortDate(t);
      // count synthetic admissions / discharges up to this date
      const admits = s.patients.filter((p) => p.admissionDate <= t && p.admissionDate >= t - step * 86400000).length;
      const disch = s.patients.filter((p) => p.dischargeDate && p.dischargeDate <= t && p.dischargeDate >= t - step * 86400000).length;
      points.push({ date: dateLabel, admissions: Math.max(1, admits), discharges: disch });
    }
    return points;
  }, [s.patients, s.anchor, spanDays]);

  // 5. Age Demographic Distribution
  const demographicsData = useMemo(() => {
    const brackets = [
      { label: "< 18", count: 0 },
      { label: "18 - 35", count: 0 },
      { label: "36 - 50", count: 0 },
      { label: "51 - 65", count: 0 },
      { label: "65+", count: 0 },
    ];
    cohort.forEach((p) => {
      if (p.age < 18) brackets[0].count++;
      else if (p.age <= 35) brackets[1].count++;
      else if (p.age <= 50) brackets[2].count++;
      else if (p.age <= 65) brackets[3].count++;
      else brackets[4].count++;
    });
    return brackets;
  }, [cohort]);

  // Export Analytics CSV
  const handleExportCsv = () => {
    const rows = s.patients.map((p) => {
      const doc = s.doctors.find((d) => d.id === p.doctorId);
      return {
        "Patient ID": p.id,
        "Patient Name": p.name,
        Age: p.age,
        Gender: p.gender,
        "Blood Group": p.bloodGroup,
        Department: p.department,
        Condition: p.condition,
        Status: p.status,
        "Risk Level": p.risk,
        "Attending Doctor": doc?.name ?? "—",
        "Admission Date": fmtDate(p.admissionDate),
        "Room / Bed": `${p.room}-${p.bed}`,
      };
    });
    downloadCsv(`CareVista_Healthcare_Analytics_${timeSpan}`, rows);
    toast.success("Analytics CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Healthcare Analytics"
        description="Comprehensive clinical throughput, attending physician workload, department census, and demographic intelligence."
        crumbs={[{ label: "Analytics" }]}
        actions={
          <Button onClick={handleExportCsv} variant="outline">
            <Download className="size-4 mr-1.5" />
            Export Analytics CSV
          </Button>
        }
      />
      <DemoNote />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Active Inpatient Census" value={activeCensus} sub="Inpatient beds occupied" icon={Users} />
        <KpiCard label="Critical Acuity Ratio" value={`${pct(criticalCensus, activeCensus)}%`} sub={`${criticalCensus} patients at risk`} icon={Activity} tone="critical" />
        <KpiCard label="Hospital Bed Occupancy" value={`${bedOccupancy}%`} sub={`${s.beds.filter((b) => b.status === "Occupied").length} of ${s.beds.length} beds`} icon={Building2} tone="warning" />
        <KpiCard label="Scheduled Consults" value={s.appointments.length} sub="Consultations recorded" icon={CalendarDays} tone="primary" />
      </div>

      {/* Control Bar */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-foreground">Filter Department:</span>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48 text-xs">
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Timespan:</span>
          <div className="flex rounded-lg border border-border/80 p-0.5 bg-surface/50">
            {(["7d", "30d", "90d"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeSpan(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  timeSpan === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Last {t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Admission vs Discharge Trajectory */}
        <Panel
          title="Patient Admission & Discharge Trajectory"
          description={`Trends across selected ${timeSpan} window`}
          expandable
        >
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ left: -16, right: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAdmit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDisch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                <Tooltip content={<ChartTooltipBox />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Area
                  type="monotone"
                  dataKey="admissions"
                  name="Admissions"
                  stroke="var(--primary)"
                  fillOpacity={1}
                  fill="url(#colorAdmit)"
                />
                <Area
                  type="monotone"
                  dataKey="discharges"
                  name="Discharges"
                  stroke="var(--chart-2)"
                  fillOpacity={1}
                  fill="url(#colorDisch)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Department Census Distribution */}
        <Panel
          title="Department-wise Patient Distribution"
          description="Total active cohort and critical cases by specialty"
          expandable
        >
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ left: -16, right: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                <Tooltip content={<ChartTooltipBox />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="admitted" name="Inpatient Census" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="critical" name="Critical Acuity" fill="var(--critical)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Doctor Workload Comparison */}
        <Panel
          title="Physician Workload & Case Distribution"
          description="Patients and scheduled appointments per attending doctor"
          expandable
        >
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={doctorWorkload}
                margin={{ left: 10, right: 15, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  width={90}
                />
                <Tooltip content={<ChartTooltipBox />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="patients" name="Assigned Patients" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="appointments" name="Appointments" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Patient Risk Acuity Distribution */}
        <Panel
          title="Patient Risk Acuity Composition"
          description="Clinical cohort segmented by physiological threshold scoring"
          expandable
        >
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-64 pt-2">
            <div className="h-52 w-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 text-xs">
              {riskData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="w-32 font-medium text-foreground">{item.name}</span>
                  <span className="num font-bold">{item.value}</span>
                  <span className="text-muted-foreground">({Math.round((item.value / cohort.length) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Patient Age Demographics */}
        <Panel
          title="Patient Demographic Cohort Breakdown"
          description="Age distribution across registered patient population"
          className="lg:col-span-2"
          expandable
        >
          <div className="h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographicsData} margin={{ left: -16, right: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                <Tooltip content={<ChartTooltipBox />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="count" name="Patient Count" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
