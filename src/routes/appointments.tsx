import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  ListFilter,
  Pencil,
  Search,
  User,
  XCircle,
} from "lucide-react";
import {
  ApptBadge,
  DemoNote,
  DoctorPhoto,
  EmptyState,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUi } from "@/components/cv/dialogs";
import { saveAppointment, useAppState } from "@/store/store";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/format";
import type { Appointment, AppointmentStatus, AppointmentType } from "@/data/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments & Clinical Consultations – CareVista" },
      { name: "description", content: "Clinical appointment management, scheduling conflicts validation and consultation calendar." },
      { property: "og:title", content: "Appointments – CareVista" },
      { property: "og:description", content: "Daily, weekly and monthly scheduling with conflict validation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppointmentsPage,
});

const STATUSES: ("All" | AppointmentStatus)[] = ["All", "Scheduled", "Confirmed", "Completed", "Cancelled", "No-show"];
const TYPES: ("All" | AppointmentType)[] = ["All", "Consultation", "Follow-up", "Lab Review", "Procedure", "Tele-consult"];

function AppointmentsPage() {
  const s = useAppState();
  const ui = useUi();

  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("week");
  const [calendarAnchor, setCalendarAnchor] = useState<number>(s.anchor);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);

  const docMap = useMemo(() => new Map(s.doctors.map((d) => [d.id, d])), [s.doctors]);
  const patMap = useMemo(() => new Map(s.patients.map((p) => [p.id, p])), [s.patients]);

  // Overall counts
  const total = s.appointments.length;
  const upcoming = s.appointments.filter((a) => a.start >= s.anchor && a.status !== "Cancelled").length;
  const completed = s.appointments.filter((a) => a.status === "Completed").length;
  const cancelled = s.appointments.filter((a) => a.status === "Cancelled").length;

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return s.appointments
      .filter((a) => {
        const doc = docMap.get(a.doctorId);
        const pat = patMap.get(a.patientId);
        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          a.id.toLowerCase().includes(q) ||
          (pat?.name && pat.name.toLowerCase().includes(q)) ||
          (doc?.name && doc.name.toLowerCase().includes(q)) ||
          (a.notes && a.notes.toLowerCase().includes(q));
        const matchDoc = doctorFilter === "All" || a.doctorId === doctorFilter;
        const matchStatus = statusFilter === "All" || a.status === statusFilter;
        const matchType = typeFilter === "All" || a.type === typeFilter;
        return matchSearch && matchDoc && matchStatus && matchType;
      })
      .sort((a, b) => a.start - b.start);
  }, [s.appointments, search, doctorFilter, statusFilter, typeFilter, docMap, patMap]);

  const handleCancelAppointment = () => {
    if (!cancellingAppt) return;
    const res = saveAppointment(
      {
        patientId: cancellingAppt.patientId,
        doctorId: cancellingAppt.doctorId,
        start: cancellingAppt.start,
        duration: cancellingAppt.duration,
        type: cancellingAppt.type,
        status: "Cancelled",
        notes: cancellingAppt.notes,
      },
      cancellingAppt.id
    );
    if (res.ok) {
      toast.success("Appointment cancelled", {
        description: `Consultation ${cancellingAppt.id} has been marked as cancelled.`,
      });
    } else {
      toast.error(res.error);
    }
    setCancellingAppt(null);
  };

  // Calendar groupings (for week view: 7 days around calendarAnchor)
  const weekDays = useMemo(() => {
    const d = new Date(calendarAnchor);
    d.setHours(0, 0, 0, 0);
    // start from Sunday of the week
    const dayOfWeek = d.getDay();
    const sunday = new Date(d.getTime() - dayOfWeek * 86400000);
    return Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(sunday.getTime() + i * 86400000);
      return {
        date: dt,
        time: dt.getTime(),
        label: dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }),
      };
    });
  }, [calendarAnchor]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation Scheduling & Clinical Calendar"
        description="Daily, weekly, and monthly appointment rosters with real-time physician availability and schedule conflict prevention."
        crumbs={[{ label: "Appointments" }]}
        actions={
          <Button onClick={() => ui.openAppointment()}>
            <CalendarPlus className="size-4 mr-1.5" />
            Book Consultation
          </Button>
        }
      />
      <DemoNote />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Consultations"
          value={total}
          sub="Booked in system"
          icon={CalendarDays}
          onClick={() => setStatusFilter("All")}
        />
        <KpiCard
          label="Upcoming Schedule"
          value={upcoming}
          sub="Future consultations"
          icon={Clock}
          tone="primary"
          onClick={() => setStatusFilter("Scheduled")}
        />
        <KpiCard
          label="Completed"
          value={completed}
          sub="Past patient encounters"
          icon={CheckCircle2}
          tone="success"
          onClick={() => setStatusFilter("Completed")}
        />
        <KpiCard
          label="Cancelled / No-show"
          value={cancelled}
          sub="Voided appointments"
          icon={XCircle}
          tone="muted"
          onClick={() => setStatusFilter("Cancelled")}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="panel p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, physician, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Attending Doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Physicians</SelectItem>
                {s.doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.specialization})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st === "All" ? "All Statuses" : st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Appointment Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "All" ? "All Types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredAppointments.length}</strong> of {total} appointments
          </span>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border/80 p-0.5 bg-surface/50">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition",
                  viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition",
                  viewMode === "calendar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Calendar View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: List vs Calendar */}
      {viewMode === "list" ? (
        filteredAppointments.length === 0 ? (
          <Panel>
            <EmptyState
              icon={Filter}
              title="No consultations match current filters"
              description="Try adjusting search terms or clearing status filters."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setDoctorFilter("All");
                    setStatusFilter("All");
                    setTypeFilter("All");
                  }}
                >
                  Clear All Filters
                </Button>
              }
            />
          </Panel>
        ) : (
          <div className="panel p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/80 text-xs text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Schedule & Time</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Consulting Physician</th>
                    <th className="px-4 py-3 font-medium">Consultation Type</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Clinical Notes</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAppointments.map((a) => {
                    const pat = patMap.get(a.patientId);
                    const doc = docMap.get(a.doctorId);
                    const isPast = a.start < s.anchor;

                    return (
                      <tr key={a.id} className="transition hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <p className="num font-semibold text-foreground text-xs">{fmtDateTime(a.start)}</p>
                          <p className="num text-[11px] text-muted-foreground">{a.id}</p>
                        </td>
                        <td className="px-4 py-3">
                          {pat ? (
                            <div className="flex items-center gap-2.5">
                              <PatientAvatar name={pat.name} seed={pat.seed} size="sm" />
                              <div>
                                <Link
                                  to="/patients/$patientId"
                                  params={{ patientId: pat.id }}
                                  className="font-medium text-foreground hover:text-primary transition-colors text-xs"
                                >
                                  {pat.name}
                                </Link>
                                <p className="num text-[11px] text-muted-foreground">
                                  {pat.id} · {pat.condition}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{a.patientId}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {doc ? (
                            <div className="flex items-center gap-2">
                              <DoctorPhoto src={doc.photo} name={doc.name} size="sm" />
                              <div>
                                <Link
                                  to="/doctors/$doctorId"
                                  params={{ doctorId: doc.id }}
                                  className="font-medium text-primary hover:underline text-xs"
                                >
                                  {doc.name}
                                </Link>
                                <p className="text-[11px] text-muted-foreground">{doc.specialization}</p>
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-xs text-foreground">{a.type}</td>
                        <td className="num px-4 py-3 text-xs text-muted-foreground">{a.duration} mins</td>
                        <td className="px-4 py-3">
                          <ApptBadge s={a.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                          {a.notes || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => ui.openAppointment({ id: a.id })}
                              title="Reschedule or Edit Appointment"
                            >
                              <Pencil className="size-3 mr-1" />
                              Edit
                            </Button>
                            {a.status !== "Cancelled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-critical hover:bg-critical/10"
                                onClick={() => setCancellingAppt(a)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Calendar View */
        <Panel
          title="Weekly Consultation Schedule"
          description={`Week of ${weekDays[0].label} – ${weekDays[6].label}`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setCalendarAnchor((t) => t - 7 * 86400000)}
              >
                <ChevronLeft className="size-3.5 mr-0.5" /> Prev Week
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setCalendarAnchor(s.anchor)}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setCalendarAnchor((t) => t + 7 * 86400000)}
              >
                Next Week <ChevronRight className="size-3.5 ml-0.5" />
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 lg:grid-cols-7 pt-2">
            {weekDays.map(({ date, time, label }) => {
              const startDay = time;
              const endDay = time + 86400000;
              const dayAppts = filteredAppointments.filter((a) => a.start >= startDay && a.start < endDay);

              return (
                <div
                  key={label}
                  className="rounded-lg border border-border/70 bg-surface/50 p-2.5 min-h-[160px] flex flex-col justify-between"
                >
                  <div>
                    <div className="border-b border-border/60 pb-1.5 mb-2">
                      <p className="font-semibold text-xs text-foreground">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{dayAppts.length} appointments</p>
                    </div>

                    <div className="space-y-2">
                      {dayAppts.map((a) => {
                        const pat = patMap.get(a.patientId);
                        const doc = docMap.get(a.doctorId);
                        return (
                          <button
                            key={a.id}
                            onClick={() => ui.openAppointment({ id: a.id })}
                            className="w-full text-left rounded border border-border/60 bg-card p-1.5 text-[11px] transition hover:border-primary/50 hover:bg-muted/40 space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="num font-bold text-foreground">{fmtTime(a.start)}</span>
                              <span className="text-[9px] text-muted-foreground">{a.duration}m</span>
                            </div>
                            <p className="font-medium text-foreground truncate">{pat?.name || a.patientId}</p>
                            <p className="text-primary truncate">{doc?.name.replace("Dr. ", "")}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 h-6 text-[10px] border border-dashed border-border/60 hover:border-primary/50"
                    onClick={() =>
                      ui.openAppointment({
                        prefill: { start: time + 9 * 3600000 },
                      })
                    }
                  >
                    + Add
                  </Button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancellingAppt} onOpenChange={(open) => !open && setCancellingAppt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel appointment {cancellingAppt?.id}? This action will record a
              cancellation in the consultation log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              className="bg-critical text-critical-foreground hover:bg-critical/90"
            >
              Cancel Consultation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
