import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  MonitorPlay,
  Pause,
  Play,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/store/store";
import { DEPARTMENTS } from "@/data/conditions";
import { fmtDate, fmtDateTime, fmtNum, pct } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltipBox } from "@/components/cv/common";

export const Route = createFileRoute("/present")({
  head: () => ({
    meta: [
      { title: "Presentation Mode – CareVista Executive Command" },
      { name: "description", content: "Executive management presentation carousel with automated telemetry and capacity rotation." },
      { property: "og:title", content: "Presentation Mode – CareVista" },
      { property: "og:description", content: "Full-screen management presentation of key dashboards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PresentationPage,
});

const SLIDES = [
  { id: "overview", title: "Hospital Command & Clinical Overview", subtitle: "Operational KPIs, Inpatient Trajectory & Occupancy" },
  { id: "telemetry", title: "Clinical Monitoring & Telemetry Surveillance", subtitle: "Acuity Stratification & Vital Sign Outlier Metrics" },
  { id: "workload", title: "Attending Physician & Specialty Distribution", subtitle: "Department Census & Physician Case Allocations" },
  { id: "beds", title: "Facility Bed Census & Capacity Distribution", subtitle: "Department Ward Occupancy Ratios & Ready Capacity" },
];

function PresentationPage() {
  const s = useAppState();
  const [slideIdx, setSlideIdx] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-rotation timer
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setSlideIdx((curr) => (curr + 1) % SLIDES.length);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const nextSlide = () => {
    setSlideIdx((prev) => (prev + 1) % SLIDES.length);
    setSecondsLeft(10);
  };

  const prevSlide = () => {
    setSlideIdx((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    setSecondsLeft(10);
  };

  // Metrics
  const activeInpatients = s.patients.filter((p) => p.status === "Admitted" || p.status === "Under Observation");
  const criticalPatients = s.patients.filter((p) => p.risk === "Critical");
  const occupiedBeds = s.beds.filter((b) => b.status === "Occupied").length;
  const availableBeds = s.beds.filter((b) => b.status === "Available").length;
  const occupancyRate = pct(occupiedBeds, s.beds.length);

  // Department census
  const deptData = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const pts = s.patients.filter((p) => p.department === dept);
      const crit = pts.filter((p) => p.risk === "Critical").length;
      return { dept, count: pts.length, critical: crit };
    });
  }, [s.patients]);

  // Doctor workload
  const doctorWorkload = useMemo(() => {
    return s.doctors.slice(0, 8).map((d) => ({
      name: d.name.replace("Dr. ", ""),
      specialty: d.specialization,
      patients: s.patients.filter((p) => p.doctorId === d.id).length,
      appts: s.appointments.filter((a) => a.doctorId === d.id).length,
    }));
  }, [s.doctors, s.patients, s.appointments]);

  // Risk distribution
  const riskPie = useMemo(() => {
    const c = s.patients.filter((p) => p.risk === "Critical").length;
    const w = s.patients.filter((p) => p.risk === "Warning").length;
    const st = s.patients.filter((p) => p.risk === "Stable").length;
    return [
      { name: "Critical Acuity", value: c, color: "var(--critical)" },
      { name: "Warning Telemetry", value: w, color: "var(--warning)" },
      { name: "Stable Cohort", value: st, color: "var(--success)" },
    ];
  }, [s.patients]);

  const currentSlide = SLIDES[slideIdx];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B1220] text-foreground overflow-hidden">
      {/* Presentation Top Bar */}
      <header className="flex h-16 items-center justify-between border-b border-border/60 bg-[#111C2E]/90 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Link to="/">
              <ArrowLeft className="size-3.5" />
              Exit Presentation
            </Link>
          </Button>
          <div className="flex items-center gap-2 pl-2">
            <span className="brand-mark grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
              CV
            </span>
            <span className="font-display font-bold text-sm tracking-tight">CareVista Executive</span>
          </div>
        </div>

        {/* Slide Selector & Counter */}
        <div className="flex items-center gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => {
                setSlideIdx(i);
                setSecondsLeft(10);
              }}
              className={`h-2 rounded-full transition-all ${
                slideIdx === i ? "w-8 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground"
              }`}
              title={slide.title}
            />
          ))}
          <span className="num text-xs text-muted-foreground ml-3">
            {slideIdx + 1} / {SLIDES.length}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setAutoRotate(!autoRotate)}
          >
            {autoRotate ? (
              <>
                <Pause className="size-3.5" />
                <span>Pause ({secondsLeft}s)</span>
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                <span>Auto-play</span>
              </>
            )}
          </Button>

          <Button variant="ghost" size="icon" className="size-8" onClick={prevSlide} title="Previous Slide">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={nextSlide} title="Next Slide">
            <ChevronRight className="size-4" />
          </Button>

          <Button variant="ghost" size="icon" className="size-8" onClick={toggleFullscreen} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </header>

      {/* Main Slide Presentation Stage */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Slide Header */}
        <div className="flex flex-wrap items-end justify-between border-b border-border/60 pb-4">
          <div>
            <span className="eyebrow !text-[11px] text-primary">Executive Briefing Slide {slideIdx + 1}</span>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-1">{currentSlide.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{currentSlide.subtitle}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="num">{fmtDateTime(Date.now())}</p>
            <p className="text-primary font-medium">Demonstration Intelligence</p>
          </div>
        </div>

        {/* Slide 1: Hospital Overview */}
        {slideIdx === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/80 bg-[#172438] p-5 shadow-lg">
                <span className="eyebrow !text-[10px] text-muted-foreground">Registered Patients</span>
                <p className="num text-3xl font-bold text-white mt-1">{s.patients.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{activeInpatients.length} Inpatients under care</p>
              </div>
              <div className="rounded-xl border border-critical/40 bg-[#172438] p-5 shadow-lg">
                <span className="eyebrow !text-[10px] text-critical">Critical Inpatient Acuity</span>
                <p className="num text-3xl font-bold text-critical mt-1">{criticalPatients.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Requires telemetry rounds</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-[#172438] p-5 shadow-lg">
                <span className="eyebrow !text-[10px] text-muted-foreground">Bed Occupancy</span>
                <p className="num text-3xl font-bold text-warning mt-1">{occupancyRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{occupiedBeds} of {s.beds.length} beds occupied</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-[#172438] p-5 shadow-lg">
                <span className="eyebrow !text-[10px] text-muted-foreground">Consultations</span>
                <p className="num text-3xl font-bold text-primary mt-1">{s.appointments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Attending specialist encounters</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border/80 bg-[#172438] p-5">
                <h3 className="font-semibold text-sm text-white mb-3">Specialty Census Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData} margin={{ left: -20, right: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2E47" />
                      <XAxis dataKey="dept" tickLine={false} axisLine={false} fontSize={10} stroke="#94A3B8" />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} stroke="#94A3B8" />
                      <Tooltip content={<ChartTooltipBox />} />
                      <Bar dataKey="count" name="Total Patients" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-[#172438] p-5">
                <h3 className="font-semibold text-sm text-white mb-3">Cohort Risk Acuity Composition</h3>
                <div className="flex items-center justify-around h-64">
                  <div className="h-52 w-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={riskPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4}>
                          {riskPie.map((e) => (
                            <Cell key={e.name} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipBox />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 text-xs">
                    {riskPie.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-white w-28">{item.name}</span>
                        <span className="num font-bold text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slide 2: Clinical Telemetry */}
        {slideIdx === 1 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {criticalPatients.map((p) => (
                <div key={p.id} className="rounded-xl border border-critical/60 bg-[#172438] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-critical/20 px-2.5 py-0.5 text-xs font-bold text-critical">
                      CRITICAL MONITORING
                    </span>
                    <span className="num text-xs text-muted-foreground">{p.id}</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">{p.name}</h4>
                  <p className="text-xs text-muted-foreground">{p.condition} · {p.department}</p>
                  <div className="rounded bg-[#0B1220] p-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Location</span>
                      <p className="font-semibold text-white">Bed {p.room}-{p.bed}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Admitted</span>
                      <p className="font-semibold text-white">{fmtDate(p.admissionDate)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/80 bg-[#172438] p-5">
              <h3 className="font-semibold text-sm text-white mb-2">Clinical Outlier Telemetry Summary</h3>
              <p className="text-xs text-muted-foreground mb-4">Real-time flags calculated against configured physiological boundaries</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-muted-foreground">
                  <thead className="border-b border-border/60 text-white font-medium">
                    <tr>
                      <th className="py-2 px-3">Patient</th>
                      <th className="py-2 px-3">Specialty</th>
                      <th className="py-2 px-3">Bed</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Acuity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-white">
                    {s.patients.slice(0, 6).map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 font-semibold">{p.name} ({p.id})</td>
                        <td className="py-2.5 px-3">{p.department}</td>
                        <td className="py-2.5 px-3">Bed {p.room}-{p.bed}</td>
                        <td className="py-2.5 px-3">{p.status}</td>
                        <td className="py-2.5 px-3 font-bold text-primary">{p.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Slide 3: Physician Workload */}
        {slideIdx === 2 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/80 bg-[#172438] p-6">
              <h3 className="font-semibold text-base text-white mb-4">Physician Caseload Comparison</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={doctorWorkload} margin={{ left: -10, right: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2E47" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="#94A3B8" />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} stroke="#94A3B8" />
                    <Tooltip content={<ChartTooltipBox />} />
                    <Bar dataKey="patients" name="Assigned Patients" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="appts" name="Consultations" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Slide 4: Facility Beds */}
        {slideIdx === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/80 bg-[#172438] p-5 text-center">
                <span className="eyebrow text-muted-foreground">Total Inpatient Beds</span>
                <p className="num text-4xl font-bold text-white mt-1">{s.beds.length}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-[#172438] p-5 text-center">
                <span className="eyebrow text-info">Occupied Beds</span>
                <p className="num text-4xl font-bold text-info mt-1">{occupiedBeds}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-[#172438] p-5 text-center">
                <span className="eyebrow text-success">Sanitized Available</span>
                <p className="num text-4xl font-bold text-success mt-1">{availableBeds}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-[#172438] p-6">
              <h3 className="font-semibold text-base text-white mb-4">Department Ward Occupancy Matrix</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {DEPARTMENTS.map((dept) => {
                  const bList = s.beds.filter((b) => b.department === dept);
                  const occ = bList.filter((b) => b.status === "Occupied").length;
                  const r = pct(occ, bList.length);
                  return (
                    <div key={dept} className="rounded-lg border border-border/70 bg-[#111C2E] p-3 text-xs">
                      <p className="font-bold text-white truncate">{dept}</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-muted-foreground">{occ}/{bList.length} Beds</span>
                        <span className="num font-bold text-primary">{r}%</span>
                      </div>
                      <div className="w-full bg-[#1F2E47] h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${r}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
