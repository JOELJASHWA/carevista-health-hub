
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarDays,
  Filter,
  LogOut,
  Stethoscope,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ChartTooltipBox,
  DemoNote,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
  RiskBadge,
  StatusBadge,
} from "@/components/cv/common";
import { CareVistaAIOverview } from "@/components/cv/CareVistaAIOverview";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/store/store";
import { isActiveStatus } from "@/data/seed";
import { DEPARTMENTS } from "@/data/conditions";
import {
  fmtDateTime,
  fmtRelative,
  fmtShortDate,
  pct,
} from "@/lib/format";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hospital Overview & Executive Command – CareVista" },
      {
        name: "description",
        content:
          "Hospital command-centre overview with dynamic KPIs, admission trends, physician rosters, and telemetry surveillance.",
      },
      { property: "og:title", content: "Hospital Overview – CareVista" },
      {
        property: "og:description",
        content:
          "Hospital command-centre KPIs, admissions and appointments (synthetic demo data).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

const RISK_COLORS: Record<Risk, string> = {
  Critical: "var(--critical)",
  Warning: "var(--warning)",
  Stable: "var(--success)",
};

const AXIS_COLOR = "var(--muted-foreground)";
const GRID_COLOR = "var(--border)";

function Overview() {
  const s = useAppState();
  const navigate = useNavigate();

  const [timeFilter, setTimeFilter] = useState<
    "today" | "7d" | "30d" | "90d" | "all"
  >("30d");

  const [departmentFilter, setDepartmentFilter] = useState("All");

  const spanDays =
    timeFilter === "today"
      ? 1
      : timeFilter === "7d"
        ? 7
        : timeFilter === "30d"
          ? 30
          : timeFilter === "90d"
            ? 90
            : 365;

  const timeLimit = s.anchor - spanDays * 86400000;

  // Filtered patient cohort
  const cohort = useMemo(() => {
    return s.patients.filter((p) => {
      const matchDept =
        departmentFilter === "All" ||
        p.department === departmentFilter;

      const inTime =
        timeFilter === "all" ||
        p.admissionDate >= timeLimit;

      return matchDept && inTime;
    });
  }, [
    s.patients,
    departmentFilter,
    timeFilter,
    timeLimit,
  ]);

  // Dashboard KPIs
  const k = useMemo(() => {
    const totalPatients = cohort.length;

    const admitted = cohort.filter((p) =>
      isActiveStatus(p.status),
    ).length;

    const discharged = cohort.filter(
      (p) => p.status === "Discharged",
    ).length;

    const critical = cohort.filter(
      (p) => p.risk === "Critical",
    ).length;

    const availableDocs = s.doctors.filter(
      (d) => d.availability === "Available",
    ).length;

    const occupiedBeds = s.beds.filter(
      (b) => b.status === "Occupied",
    ).length;

    const upcomingAppts = s.appointments.filter(
      (a) =>
        a.start >= s.anchor &&
        a.status !== "Cancelled",
    );

    return {
      totalPatients,
      admitted,
      discharged,
      critical,
      availableDocs,
      occupiedBeds,
      upcomingAppts: upcomingAppts.length,
    };
  }, [
    cohort,
    s.doctors,
    s.beds,
    s.appointments,
    s.anchor,
  ]);

  // Admission and discharge trends
  const admissionTrends = useMemo(() => {
    const points: {
      date: string;
      admissions: number;
      discharges: number;
    }[] = [];

    const step = Math.max(
      1,
      Math.floor(spanDays / 10),
    );

    for (let i = spanDays; i >= 0; i -= step) {
      const t = s.anchor - i * 86400000;

      const admits = cohort.filter(
        (p) =>
          p.admissionDate <= t &&
          p.admissionDate > t - step * 86400000,
      ).length;

      const disch = cohort.filter(
        (p) =>
          p.dischargeDate &&
          p.dischargeDate <= t &&
          p.dischargeDate > t - step * 86400000,
      ).length;

      points.push({
        date: fmtShortDate(t),
        admissions: admits,
        discharges: disch,
      });
    }

    return points;
  }, [cohort, s.anchor, spanDays]);

  // Department distribution
  const deptData = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const patients = cohort.filter(
        (p) => p.department === dept,
      );

      return {
        department: dept,
        count: patients.length,
        critical: patients.filter(
          (p) => p.risk === "Critical",
        ).length,
      };
    }).sort((a, b) => b.count - a.count);
  }, [cohort]);

  // Patient risk distribution
  const riskPieData = useMemo(() => {
    const critical = cohort.filter(
      (p) => p.risk === "Critical",
    ).length;

    const warning = cohort.filter(
      (p) => p.risk === "Warning",
    ).length;

    const stable = cohort.filter(
      (p) => p.risk === "Stable",
    ).length;

    return [
      {
        name: "Critical",
        value: critical,
        color: RISK_COLORS.Critical,
      },
      {
        name: "Warning",
        value: warning,
        color: RISK_COLORS.Warning,
      },
      {
        name: "Stable",
        value: stable,
        color: RISK_COLORS.Stable,
      },
    ].filter((item) => item.value > 0);
  }, [cohort]);

  // Doctor workload comparison
  const doctorWorkloadData = useMemo(() => {
    return s.doctors.slice(0, 6).map((doctor) => ({
      name: doctor.name.replace("Dr. ", ""),
      patients: s.patients.filter(
        (p) => p.doctorId === doctor.id,
      ).length,
      appointments: s.appointments.filter(
        (a) =>
          a.doctorId === doctor.id &&
          a.status !== "Cancelled",
      ).length,
    }));
  }, [
    s.doctors,
    s.patients,
    s.appointments,
  ]);

  // Recent admissions
  const recent = useMemo(() => {
    return [...cohort]
      .sort(
        (a, b) =>
          b.admissionDate - a.admissionDate,
      )
      .slice(0, 6);
  }, [cohort]);

  // Critical patients
  const criticalList = useMemo(() => {
    return cohort.filter(
      (p) => p.risk === "Critical",
    );
  }, [cohort]);

  // Upcoming appointments
  const upcomingApptsList = useMemo(() => {
    return s.appointments
      .filter(
        (a) =>
          a.start >= s.anchor &&
          a.status !== "Cancelled",
      )
      .sort((a, b) => a.start - b.start)
      .slice(0, 5);
  }, [s.appointments, s.anchor]);

  const doc = (id: string) =>
    s.doctors.find((d) => d.id === id);

  const pat = (id: string) =>
    s.patients.find((p) => p.id === id);

  const riskTotal = riskPieData.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const chartTooltipStyle = {
    fontSize: 12,
    borderRadius: 12,
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <PageHeader
        title="Hospital Overview"
        description="Patient care, hospital activity, and operational intelligence."
        crumbs={[{ label: "Overview" }]}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/present">
              Presentation Mode
            </Link>
          </Button>
        }
      />

      {/* CareVista AI Assistant */}
      <CareVistaAIOverview />

      <DemoNote />


      {/* Filters */}
      <div className="panel flex flex-col justify-between gap-4 rounded-xl p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Filter className="size-4 text-primary" />
            Department
          </span>

          <Select
            value={departmentFilter}
            onValueChange={setDepartmentFilter}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="All">
                All Departments
              </SelectItem>

              {DEPARTMENTS.map((department) => (
                <SelectItem
                  key={department}
                  value={department}
                >
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <span className="text-xs font-medium text-muted-foreground">
            Analytics Period
          </span>

          <div className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
            {(
              [
                "today",
                "7d",
                "30d",
                "90d",
                "all",
              ] as const
            ).map((period) => (
              <Button
                variant="ghost"
                key={period}
                onClick={() => setTimeFilter(period)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  timeFilter === period
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                }`}
              >
                {period === "today"
                  ? "Today"
                  : period === "7d"
                    ? "7 Days"
                    : period === "30d"
                      ? "30 Days"
                      : period === "90d"
                        ? "90 Days"
                        : "All Time"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Hospital Performance Indicators
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Key operational metrics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Patients"
            value={k.totalPatients}
            sub="Registered in selected cohort"
            icon={Users}
            onClick={() => navigate({ to: "/patients" })}
          />

          <KpiCard
            label="Admitted Inpatients"
            value={k.admitted}
            sub="Inpatient + observation"
            icon={Activity}
            tone="info"
            onClick={() =>
              navigate({
                to: "/patients",
                search: {
                  department:
                    departmentFilter !== "All"
                      ? departmentFilter
                      : undefined,
                },
              })
            }
          />

          <KpiCard
            label="Discharged Patients"
            value={k.discharged}
            sub="Historical encounters"
            icon={LogOut}
            tone="muted"
            onClick={() =>
              navigate({ to: "/patients" })
            }
          />

          <KpiCard
            label="Critical Patients"
            value={k.critical}
            sub="Requires immediate attention"
            icon={AlertTriangle}
            tone="critical"
            onClick={() =>
              navigate({ to: "/monitoring" })
            }
          />

          <KpiCard
            label="Available Doctors"
            value={`${k.availableDocs}/${s.doctors.length}`}
            sub="Currently available"
            icon={Stethoscope}
            tone="success"
            onClick={() =>
              navigate({ to: "/doctors" })
            }
          />

          <KpiCard
            label="Total Appointments"
            value={s.appointments.length}
            sub={`${k.upcomingAppts} upcoming`}
            icon={CalendarDays}
            tone="primary"
            onClick={() =>
              navigate({ to: "/appointments" })
            }
          />

          <KpiCard
            label="Hospital Departments"
            value={DEPARTMENTS.length}
            sub="Across 5 Indian cities"
            icon={Building2}
            tone="info"
            onClick={() =>
              navigate({ to: "/locations" })
            }
          />

          <KpiCard
            label="Bed Occupancy"
            value={`${pct(k.occupiedBeds, s.beds.length)}%`}
            sub={`${k.occupiedBeds} of ${s.beds.length} beds occupied`}
            icon={BedDouble}
            tone="warning"
            onClick={() => navigate({ to: "/beds" })}
          />
        </div>
      </section>

      {/* Main analytics */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            Clinical Analytics
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Visual insights into admissions, departments, doctors and patient risk
          </p>
        </div>

        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          {/* Admission trends */}
          <Panel
            title="Admission & Discharge Trends"
            description="Patient movement during the selected period"
            expandable
          >
            <div className="h-[300px] min-w-0 pt-4">
              {cohort.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No patient data available for this selection.
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={admissionTrends}
                    margin={{
                      top: 10,
                      right: 15,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="cvAdmissionGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--primary)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--primary)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>

                      <linearGradient
                        id="cvDischargeGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--chart-2)"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--chart-2)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke={GRID_COLOR}
                      strokeDasharray="4 5"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                      minTickGap={20}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                      width={30}
                    />

                    <Tooltip
                      content={<ChartTooltipBox />}
                      cursor={{
                        stroke: "var(--primary)",
                        strokeDasharray: "4 4",
                      }}
                      wrapperStyle={chartTooltipStyle}
                    />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: "11px",
                        paddingBottom: "16px",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="admissions"
                      name="Admissions"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      fill="url(#cvAdmissionGradient)"
                      activeDot={{ r: 5 }}
                    />

                    <Area
                      type="monotone"
                      dataKey="discharges"
                      name="Discharges"
                      stroke="var(--chart-2)"
                      strokeWidth={3}
                      fill="url(#cvDischargeGradient)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          {/* Department distribution */}
          <Panel
            title="Department Patient Distribution"
            description="Patient census and critical cases by specialty"
            expandable
          >
            <div className="h-[300px] min-w-0 pt-3">
              {cohort.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No department data available.
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={deptData}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 20,
                      left: 10,
                      bottom: 5,
                    }}
                    barGap={5}
                  >
                    <CartesianGrid
                      stroke={GRID_COLOR}
                      strokeDasharray="4 5"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                    />

                    <YAxis
                      type="category"
                      dataKey="department"
                      tickLine={false}
                      axisLine={false}
                      width={115}
                      tick={{
                        fill: AXIS_COLOR,
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      content={<ChartTooltipBox />}
                      wrapperStyle={chartTooltipStyle}
                    />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: "11px",
                        paddingBottom: "14px",
                      }}
                    />

                    <Bar
                      dataKey="count"
                      name="Total Patients"
                      fill="var(--primary)"
                      radius={[0, 6, 6, 0]}
                      barSize={12}
                    />

                    <Bar
                      dataKey="critical"
                      name="Critical Cases"
                      fill="var(--critical)"
                      radius={[0, 6, 6, 0]}
                      barSize={12}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          {/* Doctor workload */}
          <Panel
            title="Physician Workload Analysis"
            description="Comparison of assigned patients and consultations"
            expandable
          >
            <div className="h-[300px] min-w-0 pt-3">
              {doctorWorkloadData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No physician data available.
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={doctorWorkloadData}
                    margin={{
                      top: 10,
                      right: 15,
                      left: 0,
                      bottom: 5,
                    }}
                    barGap={7}
                  >
                    <CartesianGrid
                      stroke={GRID_COLOR}
                      strokeDasharray="4 5"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: AXIS_COLOR,
                        fontSize: 10,
                      }}
                      interval={0}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{
                        fill: AXIS_COLOR,
                        fontSize: 11,
                      }}
                    />

                    <Tooltip
                      content={<ChartTooltipBox />}
                      wrapperStyle={chartTooltipStyle}
                    />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: "11px",
                        paddingBottom: "14px",
                      }}
                    />

                    <Bar
                      dataKey="patients"
                      name="Assigned Patients"
                      fill="var(--chart-1)"
                      radius={[6, 6, 0, 0]}
                      barSize={18}
                    />

                    <Bar
                      dataKey="appointments"
                      name="Consultations"
                      fill="var(--chart-3)"
                      radius={[6, 6, 0, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          {/* Risk distribution */}
          <Panel
            title="Patient Risk Stratification"
            description="Distribution of patient clinical risk categories"
            expandable
          >
            {cohort.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No risk data available.
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-5 py-4 sm:flex-row sm:gap-8">
                <div className="relative h-[220px] w-full max-w-[240px] shrink-0">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={riskPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={92}
                        paddingAngle={4}
                        stroke="none"
                      >
                        {riskPieData.map((item) => (
                          <Cell
                            key={item.name}
                            fill={item.color}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        content={<ChartTooltipBox />}
                        wrapperStyle={chartTooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold tracking-tight text-foreground">
                      {riskTotal}
                    </span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Patients
                    </span>
                  </div>
                </div>

                <div className="w-full max-w-[240px] space-y-4">
                  {riskPieData.map((item) => {
                    const percentage =
                      riskTotal > 0
                        ? Math.round(
                            (item.value / riskTotal) * 100,
                          )
                        : 0;

                    return (
                      <div
                        key={item.name}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full"
                              style={{
                                backgroundColor: item.color,
                              }}
                            />

                            <span className="text-xs font-semibold text-foreground">
                              {item.name}
                            </span>
                          </div>

                          <span className="text-xs font-bold tabular-nums text-foreground">
                            {item.value} ({percentage}%)
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </section>

      {/* Recent admissions and critical alerts */}
      <section className="grid min-w-0 gap-5 xl:grid-cols-3">
        <Panel
          title="Recent Admissions"
          description="Latest patients registered in the selected cohort"
          className="min-w-0 xl:col-span-2"
          bodyClassName="p-0"
          actions={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
            >
              <Link to="/patients">
                View All →
              </Link>
            </Button>
          }
        >
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No recent admissions found.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: p.id }}
                    className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <PatientAvatar
                      name={p.name}
                      seed={p.seed}
                      size="sm"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {p.name}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          · {p.id}
                        </span>
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {p.condition} · {doc(p.doctorId)?.name}
                      </p>
                    </div>

                    <div className="hidden sm:block">
                      <StatusBadge status={p.status} />
                    </div>

                    <RiskBadge risk={p.risk} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Critical alerts */}
        <Panel
          title="Critical Acuity Alerts"
          description="Patients requiring physician attention"
          bodyClassName="p-0"
          actions={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
            >
              <Link to="/monitoring">
                Monitoring →
              </Link>
            </Button>
          }
        >
          {criticalList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-success/10">
                <Activity className="size-5 text-success" />
              </div>

              <p className="text-sm font-semibold text-foreground">
                No critical alerts
              </p>

              <p className="text-xs text-muted-foreground">
                No critical-risk patients in this cohort.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {criticalList.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: p.id }}
                    className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="size-2 shrink-0 rounded-full bg-critical" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {p.name}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {p.department} · Bed {p.room}-{p.bed}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {fmtRelative(p.lastUpdated)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Appointments and activity */}
      <section className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Panel
          title="Upcoming Consultations"
          description="Scheduled specialist visits"
          bodyClassName="p-0"
          actions={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
            >
              <Link to="/appointments">
                All Appointments →
              </Link>
            </Button>
          }
        >
          {upcomingApptsList.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No upcoming consultations.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {upcomingApptsList.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                >
                  <span className="w-full shrink-0 text-xs font-medium text-primary sm:w-32">
                    {fmtDateTime(a.start)}
                  </span>

                  <span className="text-xs font-semibold text-foreground">
                    {pat(a.patientId)?.name}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    with {doc(a.doctorId)?.name}
                  </span>

                  <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                    {a.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Activity feed */}
        <Panel
          title="Recent Activity Feed"
          description="Administrative and clinical activity log"
          bodyClassName="p-0"
          actions={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
            >
              <Link to="/activity">
                Full Audit Log →
              </Link>
            </Button>
          }
        >
          {s.activity.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No recent activity recorded.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {s.activity.slice(0, 5).map((act) => (
                <li
                  key={act.id}
                  className="flex min-w-0 items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {act.type}
                    </p>

                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {act.description}
                    </p>
                  </div>

                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {fmtRelative(act.time)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Demo data note */}
      <p className="pb-2 text-center text-[10px] text-muted-foreground">
        CareVista demonstration environment · Synthetic healthcare data · Not for clinical decision-making
      </p>
    </div>
  );
}
