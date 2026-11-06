import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Filter,
  Heart,
  HeartPulse,
  Radio,
  Search,
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
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ackAnomaly, useAppState } from "@/store/store";
import { getVitals, isAbnormal, VITALS, VITAL_KEYS } from "@/data/vitals";
import { fmtDate, fmtDateTime, fmtNum } from "@/lib/format";
import type { VitalKey } from "@/data/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/anomalies")({
  head: () => ({
    meta: [
      { title: "Historical Anomaly Detection – CareVista" },
      { name: "description", content: "Rule-based historical hemodynamic anomaly detection across synthetic telemetry datasets." },
      { property: "og:title", content: "Anomaly Detection – CareVista" },
      { property: "og:description", content: "Rule-based flagging of unusual synthetic readings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnomaliesPage,
});

interface AnomalyRecord {
  key: string;
  patientId: string;
  patientName: string;
  condition: string;
  department: string;
  timestamp: number;
  vitalKey: VitalKey;
  value: number;
  expectedMin: number;
  expectedMax: number;
  reason: string;
  isAcknowledged: boolean;
}

function AnomaliesPage() {
  const s = useAppState();
  const th = s.settings.thresholds;

  const [search, setSearch] = useState("");
  const [vitalFilter, setVitalFilter] = useState<string>("All");
  const [patientFilter, setPatientFilter] = useState<string>("All");
  const [ackFilter, setAckFilter] = useState<string>("unacked");

  // Scan synthetic readings to collect anomalies
  const allAnomalies = useMemo(() => {
    const list: AnomalyRecord[] = [];
    const ackSet = new Set(s.ackAnomalies);

    // scan each patient's recent readings (last 14 days)
    const scanLimit = s.anchor - 14 * 86400000;

    for (const p of s.patients) {
      const vitals = getVitals(p, s.anchor);
      for (const r of vitals) {
        if (r.t < scanLimit) continue;
        for (const k of VITAL_KEYS) {
          if (isAbnormal(k, r[k], th)) {
            const range = th[k];
            const isHigh = r[k] > range[1];
            const key = `${p.id}|${k}|${r.t}`;
            list.push({
              key,
              patientId: p.id,
              patientName: p.name,
              condition: p.condition,
              department: p.department,
              timestamp: r.t,
              vitalKey: k,
              value: r[k],
              expectedMin: range[0],
              expectedMax: range[1],
              reason: isHigh
                ? `${VITALS[k].label} exceeded critical ceiling (${range[1]} ${VITALS[k].unit})`
                : `${VITALS[k].label} dropped below floor (${range[0]} ${VITALS[k].unit})`,
              isAcknowledged: ackSet.has(key),
            });
          }
        }
      }
    }
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [s.patients, s.anchor, s.ackAnomalies, th]);

  // Overall counts
  const totalAnomalies = allAnomalies.length;
  const unackedCount = allAnomalies.filter((a) => !a.isAcknowledged).length;
  const ackedCount = allAnomalies.filter((a) => a.isAcknowledged).length;
  const patientsAffected = new Set(allAnomalies.map((a) => a.patientId)).size;

  const filtered = useMemo(() => {
    return allAnomalies.filter((a) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        a.patientName.toLowerCase().includes(q) ||
        a.patientId.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q);
      const matchVital = vitalFilter === "All" || a.vitalKey === vitalFilter;
      const matchPat = patientFilter === "All" || a.patientId === patientFilter;
      const matchAck =
        ackFilter === "All" ||
        (ackFilter === "unacked" && !a.isAcknowledged) ||
        (ackFilter === "acked" && a.isAcknowledged);
      return matchSearch && matchVital && matchPat && matchAck;
    });
  }, [allAnomalies, search, vitalFilter, patientFilter, ackFilter]);

  const handleAcknowledge = (key: string) => {
    ackAnomaly(key);
    toast.success("Anomaly acknowledged", {
      description: "Logged to audit trail as clinically noted.",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historical Anomaly Detection"
        description="Rule-based heuristic surveillance of synthetic physiological time-series records."
        crumbs={[{ label: "Anomaly Detection" }]}
      />
      <DemoNote />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Detected Anomalies"
          value={totalAnomalies}
          sub="Last 14 days"
          icon={AlertOctagon}
          onClick={() => setAckFilter("All")}
        />
        <KpiCard
          label="Unacknowledged"
          value={unackedCount}
          sub="Pending review"
          icon={Radio}
          tone="critical"
          onClick={() => setAckFilter("unacked")}
        />
        <KpiCard
          label="Acknowledged"
          value={ackedCount}
          sub="Reviewed by staff"
          icon={CheckCircle2}
          tone="success"
          onClick={() => setAckFilter("acked")}
        />
        <KpiCard
          label="Patients Affected"
          value={patientsAffected}
          sub="Cohorts experiencing flags"
          icon={HeartPulse}
          tone="info"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="panel p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, ID, or flagged reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <Select value={vitalFilter} onValueChange={setVitalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Vital Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Vital Metrics</SelectItem>
                {VITAL_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {VITALS[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={patientFilter} onValueChange={setPatientFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Patient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Patients</SelectItem>
                {s.patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={ackFilter} onValueChange={setAckFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Anomalies</SelectItem>
                <SelectItem value="unacked">Unacknowledged Only</SelectItem>
                <SelectItem value="acked">Acknowledged Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filtered.length}</strong> of {totalAnomalies} flagged anomalies
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs text-muted-foreground"
            onClick={() => {
              setSearch("");
              setVitalFilter("All");
              setPatientFilter("All");
              setAckFilter("All");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Anomalies List */}
      {filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Filter}
            title="No anomalies match current filter criteria"
            description="All scanned physiological records are within acceptable parameters."
          />
        </Panel>
      ) : (
        <div className="panel p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/80 text-xs text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Flagged Parameter</th>
                  <th className="px-4 py-3 font-medium">Observed Value</th>
                  <th className="px-4 py-3 font-medium">Configured Threshold</th>
                  <th className="px-4 py-3 font-medium">Deviation Reason</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.slice(0, 30).map((a) => (
                  <tr
                    key={a.key}
                    className={cn(
                      "transition hover:bg-muted/40",
                      !a.isAcknowledged && "bg-critical/5"
                    )}
                  >
                    <td className="num px-4 py-3 text-xs text-muted-foreground">
                      {fmtDateTime(a.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: a.patientId }}
                          search={{ tab: "vitals" }}
                          className="font-medium text-foreground hover:text-primary transition-colors text-xs"
                        >
                          {a.patientName}
                        </Link>
                        <span className="num text-[11px] text-muted-foreground">({a.patientId})</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{a.condition}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs text-foreground">
                      {VITALS[a.vitalKey].label}
                    </td>
                    <td className="num px-4 py-3 text-sm font-bold text-critical">
                      {fmtNum(a.value, VITALS[a.vitalKey].decimals)} {VITALS[a.vitalKey].unit}
                    </td>
                    <td className="num px-4 py-3 text-xs text-muted-foreground">
                      {a.expectedMin} – {a.expectedMax} {VITALS[a.vitalKey].unit}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs leading-snug">
                      {a.reason}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!a.isAcknowledged ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs border-critical/40 hover:bg-critical/10 text-critical"
                            onClick={() => handleAcknowledge(a.key)}
                          >
                            <Check className="size-3 mr-1" />
                            Acknowledge
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                            <CheckCircle2 className="size-3.5" />
                            Acknowledged
                          </span>
                        )}
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: a.patientId }}
                            search={{ tab: "vitals" }}
                          >
                            Chart →
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
