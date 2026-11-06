import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Info,
  MessageSquare,
  Search,
  User,
} from "lucide-react";
import {
  DemoNote,
  EmptyState,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
  Pill,
  sevTone,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  acknowledgeAlert,
  markAlertRead,
  markAllAlertsRead,
  resolveAlert,
  useAppState,
} from "@/store/store";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import type { AlertCategory, AlertItem, AlertSeverity, AlertState } from "@/data/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Clinical Alerts & Notifications – CareVista" },
      { name: "description", content: "Real-time clinical telemetry alerts, notifications, acknowledge and resolve workflows." },
      { property: "og:title", content: "Alerts & Notifications – CareVista" },
      { property: "og:description", content: "Critical, warning and informational alerts with resolution workflows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
});

const SEVERITIES: ("All" | AlertSeverity)[] = ["All", "critical", "warning", "info"];
const STATES: ("All" | AlertState)[] = ["All", "open", "acknowledged", "resolved"];
const CATEGORIES: ("All" | AlertCategory)[] = [
  "All",
  "Critical",
  "Warning",
  "Informational",
  "Appointment",
  "Admission",
  "Discharge",
  "Abnormal Vitals",
];

function AlertsPage() {
  const s = useAppState();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [resolvingAlert, setResolvingAlert] = useState<AlertItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [historyAlert, setHistoryAlert] = useState<AlertItem | null>(null);

  const docMap = useMemo(() => new Map(s.doctors.map((d) => [d.id, d])), [s.doctors]);
  const patMap = useMemo(() => new Map(s.patients.map((p) => [p.id, p])), [s.patients]);

  // Overall counts
  const unreadCount = s.alerts.filter((a) => !a.read && a.state !== "resolved").length;
  const criticalCount = s.alerts.filter((a) => a.severity === "critical" && a.state !== "resolved").length;
  const warningCount = s.alerts.filter((a) => a.severity === "warning" && a.state !== "resolved").length;
  const resolvedCount = s.alerts.filter((a) => a.state === "resolved").length;

  const filteredAlerts = useMemo(() => {
    return s.alerts.filter((a) => {
      const q = search.trim().toLowerCase();
      const pat = a.patientId ? patMap.get(a.patientId) : null;
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        (pat?.name && pat.name.toLowerCase().includes(q));
      const matchSev = severityFilter === "All" || a.severity === severityFilter;
      const matchState = stateFilter === "All" || a.state === stateFilter;
      const matchCat = categoryFilter === "All" || a.category === categoryFilter;
      return matchSearch && matchSev && matchState && matchCat;
    });
  }, [s.alerts, search, severityFilter, stateFilter, categoryFilter, patMap]);

  const handleResolve = () => {
    if (!resolvingAlert) return;
    resolveAlert(resolvingAlert.id, resolutionNote.trim() || "Clinically reviewed and acknowledged.");
    toast.success("Alert resolved", {
      description: `${resolvingAlert.title} marked as resolved.`,
    });
    setResolvingAlert(null);
    setResolutionNote("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Notification Centre"
        description="Clinical notifications, vital-sign threshold deviations, admission alerts, and medical escalation logs."
        crumbs={[{ label: "Alerts" }]}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              markAllAlertsRead();
              toast.success("All notifications marked as read");
            }}
          >
            <CheckCheck className="size-4 mr-1.5" />
            Mark All Read
          </Button>
        }
      />
      <DemoNote />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Unread Alerts"
          value={unreadCount}
          sub="Requires staff review"
          icon={Bell}
          tone={unreadCount > 0 ? "primary" : "muted"}
          onClick={() => setStateFilter("open")}
        />
        <KpiCard
          label="Critical Severity"
          value={criticalCount}
          sub="Out-of-range hemodynamics"
          icon={AlertOctagon}
          tone="critical"
          onClick={() => setSeverityFilter("critical")}
        />
        <KpiCard
          label="Telemetry Warnings"
          value={warningCount}
          sub="Acuity escalation flags"
          icon={AlertTriangle}
          tone="warning"
          onClick={() => setSeverityFilter("warning")}
        />
        <KpiCard
          label="Resolved Incidents"
          value={resolvedCount}
          sub="Documented & closed"
          icon={CheckCircle2}
          tone="success"
          onClick={() => setStateFilter("resolved")}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="panel p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search alert title, patient, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "All" ? "All Severities" : `${s.toUpperCase()} Severity`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st === "All" ? "All States" : st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "All" ? "All Categories" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredAlerts.length}</strong> of {s.alerts.length} notifications
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs text-muted-foreground"
            onClick={() => {
              setSearch("");
              setSeverityFilter("All");
              setStateFilter("All");
              setCategoryFilter("All");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Filter}
            title="No alerts match current filter criteria"
            description="All notifications in this category are clear or resolved."
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((a) => {
            const pat = a.patientId ? patMap.get(a.patientId) : null;
            const doc = a.doctorId ? docMap.get(a.doctorId) : null;
            const isResolved = a.state === "resolved";
            const isAck = a.state === "acknowledged";

            return (
              <div
                key={a.id}
                className={cn(
                  "panel p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4",
                  !a.read && !isResolved && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
                  a.severity === "critical" && !isResolved && "border-critical/60",
                  isResolved && "opacity-75"
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {a.severity === "critical" ? (
                      <span className="grid size-9 place-items-center rounded-lg bg-critical/15 text-critical">
                        <AlertOctagon className="size-5" />
                      </span>
                    ) : a.severity === "warning" ? (
                      <span className="grid size-9 place-items-center rounded-lg bg-warning/15 text-warning">
                        <AlertTriangle className="size-5" />
                      </span>
                    ) : (
                      <span className="grid size-9 place-items-center rounded-lg bg-info/15 text-info">
                        <Info className="size-5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={sevTone[a.severity]}>{a.severity.toUpperCase()}</Pill>
                      <Pill tone="muted">{a.category}</Pill>
                      <span className="num text-xs text-muted-foreground">{fmtRelative(a.time)}</span>
                      {!a.read && !isResolved && (
                        <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                          NEW
                        </span>
                      )}
                    </div>

                    <h4 className="mt-1 font-semibold text-sm text-foreground">{a.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{a.message}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {pat && (
                        <span className="flex items-center gap-1.5">
                          <PatientAvatar name={pat.name} seed={pat.seed} size="sm" />
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: pat.id }}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {pat.name} ({pat.id})
                          </Link>
                          <span>· Bed {pat.room}-{pat.bed}</span>
                        </span>
                      )}
                      {doc && <span>· Attending: {doc.name}</span>}
                    </div>

                    {a.note && (
                      <div className="mt-2 rounded bg-surface p-2 text-xs text-muted-foreground border border-border/60">
                        <span className="font-semibold text-foreground">Resolution note: </span>
                        {a.note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 md:self-center shrink-0 border-t border-border/60 pt-3 md:border-t-0 md:pt-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setHistoryAlert(a)}
                    title="Audit trail"
                  >
                    <History className="size-3.5 mr-1" />
                    History
                  </Button>

                  {!a.read && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => markAlertRead(a.id, true)}
                    >
                      Mark Read
                    </Button>
                  )}

                  {!isAck && !isResolved && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs"
                      onClick={() => {
                        acknowledgeAlert(a.id);
                        toast.success("Alert acknowledged");
                      }}
                    >
                      Acknowledge
                    </Button>
                  )}

                  {!isResolved ? (
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setResolvingAlert(a);
                        setResolutionNote("");
                      }}
                    >
                      <Check className="size-3.5 mr-1" />
                      Resolve
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                      <CheckCircle2 className="size-3.5" />
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!resolvingAlert} onOpenChange={(open) => !open && setResolvingAlert(null)}>
        {resolvingAlert && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Clinical Alert</DialogTitle>
              <DialogDescription>
                Document the clinical action or resolution reason for "{resolvingAlert.title}".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="text-xs text-muted-foreground">Resolution details & notes:</label>
              <Textarea
                rows={3}
                placeholder="e.g. Patient vital parameters stabilized after medication adjustment. Rounds completed."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setResolvingAlert(null)}>
                Cancel
              </Button>
              <Button onClick={handleResolve}>Save & Resolve Alert</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Audit History Dialog */}
      <Dialog open={!!historyAlert} onOpenChange={(open) => !open && setHistoryAlert(null)}>
        {historyAlert && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Alert Audit History
              </DialogTitle>
              <DialogDescription>{historyAlert.id} · {historyAlert.title}</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3 max-h-72 overflow-y-auto">
              <ol className="relative border-l border-border pl-4 space-y-3 text-xs">
                {historyAlert.history.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
                    <p className="font-semibold text-foreground">{h.action}</p>
                    <p className="text-muted-foreground">{fmtDateTime(h.time)}</p>
                    {h.note && <p className="mt-1 text-muted-foreground italic">"{h.note}"</p>}
                  </li>
                ))}
              </ol>
            </div>
            <DialogFooter>
              <Button onClick={() => setHistoryAlert(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
