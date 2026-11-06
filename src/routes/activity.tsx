import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  CalendarDays,
  CheckCircle2,
  Filter,
  History,
  RotateCcw,
  Search,
  Stethoscope,
  User,
  UserPlus,
} from "lucide-react";
import {
  DemoNote,
  EmptyState,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
  Pill,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/store/store";
import { fmtDateTime, fmtRelative } from "@/lib/format";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Clinical Activity & Audit Trail – CareVista" },
      { name: "description", content: "Demonstration audit log tracking patient registration, physician edits, consultations, and alert workflows." },
      { property: "og:title", content: "Activity Log – CareVista" },
      { property: "og:description", content: "Demonstration activity and audit history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityLogPage,
});

const EVENT_TYPES = [
  "All",
  "Patient created",
  "Patient updated",
  "Doctor profile updated",
  "Appointment created",
  "Appointment rescheduled",
  "Alert acknowledged",
  "Alert resolved",
  "Anomaly acknowledged",
  "Bed status changed",
];

function ActivityLogPage() {
  const s = useAppState();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const patMap = useMemo(() => new Map(s.patients.map((p) => [p.id, p])), [s.patients]);
  const docMap = useMemo(() => new Map(s.doctors.map((d) => [d.id, d])), [s.doctors]);

  const filtered = useMemo(() => {
    return s.activity.filter((act) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        act.type.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q) ||
        (act.patientId && act.patientId.toLowerCase().includes(q)) ||
        (act.doctorId && act.doctorId.toLowerCase().includes(q));
      const matchType = typeFilter === "All" || act.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [s.activity, search, typeFilter]);

  const getEventIcon = (type: string) => {
    if (type.includes("Patient")) return <User className="size-4 text-primary" />;
    if (type.includes("Doctor")) return <Stethoscope className="size-4 text-chart-2" />;
    if (type.includes("Appointment")) return <CalendarDays className="size-4 text-chart-3" />;
    if (type.includes("Alert") || type.includes("Anomaly")) return <AlertOctagon className="size-4 text-warning" />;
    return <Activity className="size-4 text-info" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrative & Clinical Audit Trail"
        description="Immutable demonstration record of clinical modifications, patient admissions, scheduling updates, and anomaly acknowledgments."
        crumbs={[{ label: "Activity Log" }]}
      />
      <DemoNote />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Logged Events"
          value={s.activity.length}
          sub="Session audit trail"
          icon={History}
          onClick={() => setTypeFilter("All")}
        />
        <KpiCard
          label="Patient Admissions"
          value={s.activity.filter((a) => a.type.includes("Patient")).length}
          sub="Records modified"
          icon={UserPlus}
          tone="info"
          onClick={() => setTypeFilter("Patient created")}
        />
        <KpiCard
          label="Consultations Logged"
          value={s.activity.filter((a) => a.type.includes("Appointment")).length}
          sub="Bookings & reschedules"
          icon={CalendarDays}
          tone="primary"
          onClick={() => setTypeFilter("Appointment created")}
        />
        <KpiCard
          label="Escalations / Alerts"
          value={s.activity.filter((a) => a.type.includes("Alert") || a.type.includes("Anomaly")).length}
          sub="Resolved incidents"
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {/* Search and Filters */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search activity description, ID, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter Event:</span>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-52 text-xs">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Timeline List */}
      {filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Filter}
            title="No activity events found"
            description="Clear search filters to see all recorded administrative events."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("All");
                }}
              >
                Clear Filters
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel title="Event History Stream" description="Chronological listing from newest to oldest">
          <div className="relative border-l border-border/80 pl-6 space-y-4 pt-2">
            {filtered.map((act) => {
              const pat = act.patientId ? patMap.get(act.patientId) : null;
              const doc = act.doctorId ? docMap.get(act.doctorId) : null;

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet */}
                  <span className="absolute -left-[31px] top-1.5 size-3 rounded-full border-2 border-background bg-primary ring-2 ring-border/80" />

                  <div className="rounded-lg border border-border/70 bg-surface/50 p-3.5 transition group-hover:border-primary/50 group-hover:bg-surface text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getEventIcon(act.type)}
                        <span className="font-semibold text-foreground">{act.type}</span>
                        <span className="num text-[10px] text-muted-foreground">({act.id})</span>
                      </div>
                      <span className="num text-muted-foreground">{fmtDateTime(act.time)}</span>
                    </div>

                    <p className="text-muted-foreground leading-relaxed pt-0.5">{act.description}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      {pat && (
                        <span>
                          Patient:{" "}
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: pat.id }}
                            className="font-medium text-foreground hover:text-primary transition-colors underline"
                          >
                            {pat.name} ({pat.id})
                          </Link>
                        </span>
                      )}
                      {doc && (
                        <span>
                          Physician:{" "}
                          <Link
                            to="/doctors/$doctorId"
                            params={{ doctorId: doc.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {doc.name}
                          </Link>
                        </span>
                      )}
                      <span className="ml-auto text-[10px]">{fmtRelative(act.time)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
