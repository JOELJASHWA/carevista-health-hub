import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarPlus, ChevronLeft, ChevronRight, FileText, Paperclip, Pencil, Printer, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApptBadge, ChartTooltipBox, DemoNote, DoctorPhoto, EmptyState, PageHeader, Panel, PatientAvatar, Pill, RiskBadge, StatTile, StatusBadge, sevTone } from "@/components/cv/common";
import { RangePicker, useRange } from "@/components/cv/range";
import { useUi } from "@/components/cv/dialogs";
import { VitalChart } from "@/components/patients/VitalChart";
import { EcgViewer } from "@/components/patients/EcgViewer";
import { XrayViewer } from "@/components/patients/XrayViewer";
import { useAppState } from "@/store/store";
import { HOSPITALS, getHistory, getReports, getTimeline, getXrays } from "@/data/seed";
import { VITALS, VITAL_KEYS, classify, filterRange, getVitals, isAbnormal, stats } from "@/data/vitals";
import { DAY } from "@/data/rng";
import type { Patient, Reading, TimelineEvent, VitalKey } from "@/data/types";
import { fmtDate, fmtDateTime, fmtNum, fmtRelative, fmtShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = ["overview", "vitals", "history", "ecg", "xray", "reports", "analytics"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/patients/$patientId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: TABS.includes(s["tab"] as Tab) ? (s["tab"] as Tab) : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Patient ${params.patientId} – CareVista` },
      { name: "description", content: "Individual patient dashboard with vitals, history, ECG, imaging and reports (synthetic demo data)." },
      { property: "og:title", content: `Patient ${params.patientId} – CareVista` },
      { property: "og:description", content: "Individual patient dashboard with synthetic demo data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientPage,
});

function PatientPage() {
  const { patientId } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();
  const s = useAppState();
  const ui = useUi();
  const idx = s.patients.findIndex((p) => p.id === patientId);
  const p = s.patients[idx];

  if (!p)
    return (
      <div className="panel">
        <EmptyState icon={UserX} title={`Patient ${patientId} not found`} description="This record isn't in the demo dataset." action={<Button asChild size="sm" className="mt-2"><Link to="/patients">Back to patients</Link></Button>} />
      </div>
    );

  const doc = s.doctors.find((d) => d.id === p.doctorId);
  const hospital = HOSPITALS.find((h) => h.id === p.hospitalId);
  const prev = s.patients[(idx - 1 + s.patients.length) % s.patients.length];
  const next = s.patients[(idx + 1) % s.patients.length];
  const setTab = (t: string) => navigate({ to: "/patients/$patientId", params: { patientId }, search: { tab: t as Tab }, replace: true });

  return (
    <div className="space-y-5">
      <PageHeader
        title={p.name}
        crumbs={[{ label: "Patients", to: "/patients" }, { label: p.id }]}
        actions={
          <>
            <Button variant="outline" size="icon" asChild aria-label={`Previous patient: ${prev.name}`}>
              <Link to="/patients/$patientId" params={{ patientId: prev.id }} search={{ tab }}><ChevronLeft className="size-4" /></Link>
            </Button>
            <Button variant="outline" size="icon" asChild aria-label={`Next patient: ${next.name}`}>
              <Link to="/patients/$patientId" params={{ patientId: next.id }} search={{ tab }}><ChevronRight className="size-4" /></Link>
            </Button>
            <Button variant="outline" onClick={() => ui.openAppointment({ prefill: { patientId: p.id, doctorId: p.doctorId } })}><CalendarPlus className="size-4" />Book</Button>
            <Button onClick={() => ui.openPatientForm(p.id)}><Pencil className="size-4" />Edit</Button>
          </>
        }
      />

      <section className="panel grid gap-5 p-5 lg:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4">
          <PatientAvatar name={p.name} seed={p.seed} size="xl" />
          <div>
            <p className="num text-xs text-muted-foreground">{p.id}</p>
            <p className="text-lg font-semibold">{p.name}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusBadge status={p.status} />
              <RiskBadge risk={p.risk} />
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 xl:grid-cols-5">
          <Meta k="Age / Gender" v={`${p.age} y · ${p.gender}`} />
          <Meta k="Blood group" v={p.bloodGroup} />
          <Meta k="Department" v={p.department} />
          <Meta k="Condition" v={p.condition} />
          <Meta k="Assigned doctor" v={doc ? <Link to="/doctors/$doctorId" params={{ doctorId: doc.id }} className="text-primary hover:underline">{doc.name}</Link> : "—"} />
          <Meta k="Hospital" v={hospital?.name.replace("CareVista Demo Hospital – ", "CareVista ") ?? "—"} />
          <Meta k="Room / Bed" v={p.room === "—" ? "Not assigned" : `${p.room}-${p.bed}`} />
          <Meta k="Admitted" v={fmtDate(p.admissionDate)} />
          <Meta k="Last updated" v={fmtRelative(p.lastUpdated)} />
          <Meta k="Phone (demo)" v={p.phone} />
        </dl>
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="h-auto w-max">
            {[["overview", "Overview"], ["vitals", "Vitals"], ["history", "Medical History"], ["ecg", "ECG"], ["xray", "X-ray"], ["reports", "Reports"], ["analytics", "Analytics"]].map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="px-3 py-1.5">{l}</TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-4"><OverviewTab p={p} /></TabsContent>
        <TabsContent value="vitals" className="mt-4"><VitalsTab p={p} /></TabsContent>
        <TabsContent value="history" className="mt-4"><HistoryTab p={p} /></TabsContent>
        <TabsContent value="ecg" className="mt-4"><EcgViewer patient={p} hr={getVitals(p, s.anchor).at(-1)!.hr} /></TabsContent>
        <TabsContent value="xray" className="mt-4"><XrayViewer images={getXrays(p)} /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsTab p={p} /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsTab p={p} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow !text-[10px]">{k}</dt>
      <dd className="mt-0.5 truncate font-medium">{v}</dd>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function OverviewTab({ p }: { p: Patient }) {
  const s = useAppState();
  const readings = getVitals(p, s.anchor);
  const latest = readings[readings.length - 1];
  const day = filterRange(readings, s.anchor - DAY, s.anchor);
  const th = s.settings.thresholds;
  const demo = classify(latest, th);
  const timeline = getTimeline(p);
  const appts = s.appointments.filter((a) => a.patientId === p.id);
  const alerts = s.alerts.filter((a) => a.patientId === p.id && a.state !== "resolved").slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {VITAL_KEYS.map((k) => {
          const st = stats(day, k, th);
          const ab = isAbnormal(k, latest[k], th);
          return (
            <div key={k} className={cn("panel p-3", ab && "border-critical/50")}>
              <div className="flex items-center justify-between">
                <span className="eyebrow !text-[10px]">{VITALS[k].label}</span>
                {ab && <span className="size-2 rounded-full bg-critical pulse-dot text-critical" />}
              </div>
              <div className={cn("num mt-1 text-2xl font-semibold", ab && "text-critical")}>
                {fmtNum(latest[k], VITALS[k].decimals)}
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">{VITALS[k].unit}</span>
              </div>
              {st && <p className="num mt-1 text-[11px] text-muted-foreground">24h {fmtNum(st.min, VITALS[k].decimals)}–{fmtNum(st.max, VITALS[k].decimals)}</p>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Latest simulated reading {fmtDateTime(latest.t)} · demonstration status from configured thresholds: <RiskBadge risk={demo.risk} />
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Patient journey" description="Click an event for details" className="lg:col-span-2">
          <Journey events={timeline} />
        </Panel>
        <div className="space-y-4">
          <Panel title="Active alerts" bodyClassName="p-0">
            {alerts.length ? (
              <ul className="divide-y divide-border/60">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 px-4 py-3 text-sm">
                    <Pill tone={sevTone[a.severity]}>{a.severity}</Pill>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground">{fmtRelative(a.time)} · {a.state}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No open alerts" />
            )}
          </Panel>
          <Panel title="Appointments" bodyClassName="p-0">
            <ul className="divide-y divide-border/60">
              {appts.slice(-5).reverse().map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{a.type}</p>
                    <p className="num text-[11px] text-muted-foreground">{fmtDateTime(a.start)}</p>
                  </div>
                  <ApptBadge s={a.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Journey({ events }: { events: TimelineEvent[] }) {
  const s = useAppState();
  const [open, setOpen] = useState<string | null>(events[1]?.id ?? null);
  const color: Record<TimelineEvent["type"], string> = {
    Registration: "bg-muted-foreground", Admission: "bg-info", Consultation: "bg-primary", "Lab Test": "bg-chart-6", Imaging: "bg-chart-3", Treatment: "bg-chart-5", "Follow-up": "bg-primary", Discharge: "bg-success",
  };
  return (
    <ol className="relative space-y-1 border-l border-border pl-5">
      {events.map((e) => {
        const isOpen = open === e.id;
        const doc = s.doctors.find((d) => d.id === e.doctorId);
        return (
          <li key={e.id} className="relative">
            <span className={cn("absolute top-3 -left-[26px] size-3 rounded-full ring-4 ring-card", color[e.type])} />
            <button onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen} className={cn("w-full rounded-lg px-3 py-2 text-left transition hover:bg-muted/50", isOpen && "bg-muted/50")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{e.title}</span>
                <span className="num text-[11px] text-muted-foreground">{fmtDateTime(e.time)}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{e.type}</span>
              {isOpen && (
                <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  <p>{e.notes}</p>
                  <p>Associated doctor: <span className="text-foreground">{doc?.name}</span></p>
                  {e.attachments.length > 0 && (
                    <p className="flex flex-wrap gap-1.5">{e.attachments.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5"><Paperclip className="size-3" />{a}</span>)}</p>
                  )}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Vitals ---------------- */

function VitalsTab({ p }: { p: Patient }) {
  const s = useAppState();
  const readings = getVitals(p, s.anchor);
  const range = useRange(s.anchor, "7d");
  const { from, to } = range.value;
  const th = s.settings.thresholds;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DemoNote className="flex-1">Simulated hourly readings for {p.name}. Red dots mark values outside the configured demo thresholds.</DemoNote>
        <RangePicker state={range} anchor={s.anchor} minDate={readings[0].t} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <VitalChart title="Heart Rate" keys={["hr"]} readings={readings} from={from} to={to} thresholds={th} />
        <VitalChart title="Blood Pressure" keys={["sys", "dia"]} readings={readings} from={from} to={to} thresholds={th} />
        <VitalChart title="Oxygen Saturation" keys={["spo2"]} readings={readings} from={from} to={to} thresholds={th} />
        <VitalChart title="Body Temperature" keys={["temp"]} readings={readings} from={from} to={to} thresholds={th} />
        <VitalChart title="Respiratory Rate" keys={["rr"]} readings={readings} from={from} to={to} thresholds={th} />
      </div>
    </div>
  );
}

/* ---------------- History ---------------- */

function HistoryTab({ p }: { p: Patient }) {
  const h = getHistory(p);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Diagnoses">
        <ul className="space-y-2 text-sm">{h.diagnoses.map((d) => <li key={d.name} className="flex justify-between gap-2"><span>{d.name}</span><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="num">{d.year}</span><Pill tone={d.status === "Active" ? "warning" : d.status === "Resolved" ? "success" : "muted"}>{d.status}</Pill></span></li>)}</ul>
      </Panel>
      <Panel title="Allergies">
        {h.allergies.length ? <ul className="flex flex-wrap gap-2">{h.allergies.map((a) => <li key={a.name}><Pill tone={a.severity === "Severe" ? "critical" : a.severity === "Moderate" ? "warning" : "muted"}>{a.name} · {a.severity}</Pill></li>)}</ul> : <p className="text-sm text-muted-foreground">No known allergies recorded.</p>}
      </Panel>
      <Panel title="Current medications" bodyClassName="p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Medication</th><th className="px-4 py-2 font-medium">Dose</th><th className="px-4 py-2 font-medium">Frequency</th></tr></thead>
          <tbody className="divide-y divide-border/60">{h.medications.map((m) => <tr key={m.name}><td className="px-4 py-2 font-medium">{m.name}</td><td className="num px-4 py-2">{m.dose}</td><td className="px-4 py-2 text-muted-foreground">{m.frequency}</td></tr>)}</tbody>
        </table>
      </Panel>
      <Panel title="Previous treatments">
        <ul className="space-y-2 text-sm">{h.treatments.map((t) => <li key={t.name} className="flex justify-between gap-2"><span>{t.name}</span><span className="text-xs text-muted-foreground">{fmtShortDate(t.date)} · {t.outcome}</span></li>)}</ul>
      </Panel>
      <Panel title="Surgical history">
        {h.surgeries.length ? <ul className="space-y-2 text-sm">{h.surgeries.map((x) => <li key={x.name}><p>{x.name}</p><p className="text-xs text-muted-foreground">{x.year} · {x.hospital}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No surgical history recorded.</p>}
      </Panel>
      <Panel title="Admission & discharge history">
        <ul className="space-y-2 text-sm">{h.admissions.map((a, i) => <li key={i} className="flex justify-between gap-2"><span>{a.reason}</span><span className="num text-xs text-muted-foreground">{fmtDate(a.admit)} → {a.discharge ? fmtDate(a.discharge) : "Current"}</span></li>)}</ul>
      </Panel>
      <Panel title="Clinical notes" className="lg:col-span-2">
        <ul className="space-y-3">{h.notes.map((n, i) => <li key={i} className="rounded-lg border border-border/70 bg-surface p-3 text-sm"><p>{n.text}</p><p className="mt-1 text-xs text-muted-foreground">{n.author} · {fmtDateTime(n.time)}</p></li>)}</ul>
      </Panel>
    </div>
  );
}

/* ---------------- Reports ---------------- */

function ReportsTab({ p }: { p: Patient }) {
  const s = useAppState();
  const reports = getReports(p);
  const h = getHistory(p);
  const doc = s.doctors.find((d) => d.id === p.doctorId);
  const week = filterRange(getVitals(p, s.anchor), s.anchor - 7 * DAY, s.anchor);
  const appts = s.appointments.filter((a) => a.patientId === p.id);
  const th = s.settings.thresholds;
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Panel title="Reports on file" bodyClassName="p-0" className="no-print h-fit">
        <ul className="divide-y divide-border/60">
          {reports.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <FileText className="mt-0.5 size-4 text-primary" />
              <div className="min-w-0"><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.type} · {fmtDate(r.date)}</p><p className="text-xs text-muted-foreground">{r.summary}</p></div>
            </li>
          ))}
        </ul>
      </Panel>
      <section className="panel print-area p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="eyebrow">Patient summary report · synthetic demo data</p>
            <h2 className="mt-1 text-xl font-semibold">{p.name} <span className="num text-sm text-muted-foreground">({p.id})</span></h2>
            <p className="text-sm text-muted-foreground">{p.age} y · {p.gender} · {p.bloodGroup} · {p.department}</p>
          </div>
          <Button className="no-print" variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
        </div>
        <div className="grid gap-4 py-4 text-sm sm:grid-cols-2">
          <div><p className="eyebrow mb-1">Assigned doctor</p><p>{doc?.name} · {doc?.qualification}</p></div>
          <div><p className="eyebrow mb-1">Admission</p><p>{fmtDate(p.admissionDate)} · {p.status}{p.room !== "—" ? ` · Bed ${p.room}-${p.bed}` : ""}</p></div>
          <div className="sm:col-span-2"><p className="eyebrow mb-1">History summary</p><p>{h.diagnoses.map((d) => d.name).join(", ")}. Medications: {h.medications.map((m) => m.name).join(", ") || "none"}. Allergies: {h.allergies.map((a) => a.name).join(", ") || "none known"}.</p></div>
        </div>
        <p className="eyebrow mb-2">Vital-sign statistics (last 7 days)</p>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5 font-medium">Vital</th><th className="font-medium">Avg</th><th className="font-medium">Min</th><th className="font-medium">Max</th><th className="font-medium">Trend</th><th className="font-medium">Flagged</th></tr></thead>
          <tbody className="num divide-y divide-border/60">
            {VITAL_KEYS.map((k) => { const st = stats(week, k, th)!; return <tr key={k}><td className="py-1.5 font-sans">{VITALS[k].label}</td><td>{fmtNum(st.avg, VITALS[k].decimals)}</td><td>{fmtNum(st.min, VITALS[k].decimals)}</td><td>{fmtNum(st.max, VITALS[k].decimals)}</td><td className="font-sans">{st.trend}</td><td>{st.abnormal}</td></tr>; })}
          </tbody>
        </table>
        <p className="eyebrow mt-5 mb-2">Appointment history</p>
        <ul className="space-y-1 text-sm">{appts.map((a) => <li key={a.id} className="flex justify-between gap-2"><span>{a.type} · {a.id}</span><span className="num text-muted-foreground">{fmtDateTime(a.start)} · {a.status}</span></li>)}</ul>
        <p className="mt-5 text-xs text-muted-foreground">Current demonstration status: {p.risk}. Generated {fmtDateTime(Date.now())}. Synthetic data – not for clinical use.</p>
      </section>
    </div>
  );
}

/* ---------------- Analytics ---------------- */

function AnalyticsTab({ p }: { p: Patient }) {
  const s = useAppState();
  const th = s.settings.thresholds;
  const readings = getVitals(p, s.anchor);
  const daily = useMemo(() => {
    const out: (Record<VitalKey, number> & { t: number; score: number })[] = [];
    for (let i = 0; i < readings.length; i += 24) {
      const chunk = readings.slice(i, i + 24);
      const avg = (k: VitalKey) => chunk.reduce((a, r) => a + r[k], 0) / chunk.length;
      const vals = { hr: avg("hr"), sys: avg("sys"), dia: avg("dia"), spo2: avg("spo2"), temp: avg("temp"), rr: avg("rr") } as Omit<Reading, "t">;
      out.push({ t: chunk[0].t, ...vals, score: classify(vals, th).score });
    }
    return out;
  }, [readings, th]);
  const flagged = VITAL_KEYS.map((k) => ({ name: VITALS[k].short, last30: stats(filterRange(readings, s.anchor - 30 * DAY, s.anchor), k, th)!.abnormal, prior60: stats(filterRange(readings, s.anchor - 90 * DAY, s.anchor - 30 * DAY), k, th)!.abnormal }));
  const totalFlags = flagged.reduce((a, f) => a + f.last30, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Readings (90 days)" value={fmtNum(readings.length)} />
        <StatTile label="Flagged (30 days)" value={totalFlags} tone={totalFlags > 20 ? "critical" : totalFlags > 5 ? "warning" : "default"} />
        <StatTile label="Days monitored" value={daily.length} />
        <StatTile label="Latest demo score" value={daily.at(-1)?.score ?? 0} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Daily averages – 90 days" description="Heart rate and SpO₂ daily means" expandable>
          <div className="chart-box h-64">
            <ResponsiveContainer>
              <LineChart data={daily} margin={{ left: -8, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t) => fmtShortDate(t)} minTickGap={40} tickLine={false} axisLine={false} />
                <YAxis yAxisId="l" tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltipBox labelFormatter={(l) => fmtDate(Number(l))} />} />
                <Line yAxisId="l" dataKey="hr" name="Heart rate (bpm)" stroke={VITALS.hr.color} dot={false} strokeWidth={2} />
                <Line yAxisId="r" dataKey="spo2" name="SpO₂ (%)" stroke={VITALS.spo2.color} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Flagged readings by vital" description="Last 30 days vs prior 60 days" expandable>
          <div className="chart-box h-64">
            <ResponsiveContainer>
              <BarChart data={flagged} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltipBox />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="last30" name="Last 30 days" fill="var(--critical)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prior60" name="Prior 60 days" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Daily demonstration risk score" description="Rule-based score from daily averages vs configured thresholds" className="xl:col-span-2" expandable>
          <div className="chart-box h-56">
            <ResponsiveContainer>
              <BarChart data={daily} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t) => fmtShortDate(t)} minTickGap={40} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltipBox labelFormatter={(l) => fmtDate(Number(l))} />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="score" name="Demo score" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
