import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DemoNote,
  EmptyState,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
  RiskBadge,
  StatusBadge,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUi } from "@/components/cv/dialogs";
import { useAppState } from "@/store/store";
import { DEPARTMENTS } from "@/data/conditions";
import { fmtDate, fmtRelative } from "@/lib/format";
import type { PatientStatus, Risk } from "@/data/types";

export const Route = createFileRoute("/patients/")({
  validateSearch: (s: Record<string, unknown>): { department?: string; risk?: string } => ({
    department: typeof s["department"] === "string" ? s["department"] : undefined,
    risk: typeof s["risk"] === "string" ? s["risk"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Patients Directory – CareVista" },
      { name: "description", content: "Comprehensive patient directory with filters, risk classification and profile management." },
      { property: "og:title", content: "Patients Directory – CareVista" },
      { property: "og:description", content: "Synthetic patient directory with filters and search." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientsPage,
});

const RISKS: ("All" | Risk)[] = ["All", "Critical", "Warning", "Stable"];
const STATUSES: ("All" | PatientStatus)[] = ["All", "Admitted", "Under Observation", "Outpatient", "Discharged"];

function PatientsPage() {
  const { department: initialDept, risk: initialRisk } = Route.useSearch();
  const s = useAppState();
  const ui = useUi();

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>(initialDept || "All");
  const [risk, setRisk] = useState<string>(initialRisk || "All");
  const [status, setStatus] = useState<string>("All");
  const [doctorFilter, setDoctorFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"name" | "admit" | "age" | "risk">("admit");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const docMap = useMemo(() => new Map(s.doctors.map((d) => [d.id, d])), [s.doctors]);

  const filtered = useMemo(() => {
    return s.patients
      .filter((p) => {
        const q = search.trim().toLowerCase();
        const matchesQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.condition.toLowerCase().includes(q) ||
          p.bloodGroup.toLowerCase().includes(q);
        const matchesDept = department === "All" || p.department === department;
        const matchesRisk = risk === "All" || p.risk === risk;
        const matchesStatus = status === "All" || p.status === status;
        const matchesDoc = doctorFilter === "All" || p.doctorId === doctorFilter;
        return matchesQuery && matchesDept && matchesRisk && matchesStatus && matchesDoc;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "age") return b.age - a.age;
        if (sortBy === "risk") {
          const score = (r: Risk) => (r === "Critical" ? 3 : r === "Warning" ? 2 : 1);
          return score(b.risk) - score(a.risk);
        }
        return b.admissionDate - a.admissionDate;
      });
  }, [s.patients, search, department, risk, status, doctorFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Overall stats
  const admittedCount = s.patients.filter((p) => p.status === "Admitted").length;
  const observationCount = s.patients.filter((p) => p.status === "Under Observation").length;
  const criticalCount = s.patients.filter((p) => p.risk === "Critical").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Directory"
        description="Active patient records, admission trajectory, assigned medical staff and real-time hemodynamic risk categorization."
        crumbs={[{ label: "Patients" }]}
        actions={
          <Button onClick={() => ui.openPatientForm()}>
            <UserPlus className="size-4 mr-1.5" />
            Register New Patient
          </Button>
        }
      />
      <DemoNote />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Patients" value={s.patients.length} sub="Registered in database" icon={Users} onClick={() => { setRisk("All"); setStatus("All"); }} />
        <KpiCard label="Inpatient Admitted" value={admittedCount} sub="Occupying ward beds" icon={Activity} tone="info" onClick={() => setStatus("Admitted")} />
        <KpiCard label="Under Observation" value={observationCount} sub="Telemetry surveillance" icon={UserCheck} tone="primary" onClick={() => setStatus("Under Observation")} />
        <KpiCard
          label="Critical Risk Status"
          value={criticalCount}
          sub="Out-of-range telemetry"
          icon={AlertTriangle}
          tone={criticalCount > 0 ? "critical" : "muted"}
          onClick={() => setRisk("Critical")}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="panel p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name, ID (e.g. CV-P1001), condition..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div>
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v);
                setPage(1);
              }}
            >
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
            <Select
              value={risk}
              onValueChange={(v) => {
                setRisk(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Risk Status" />
              </SelectTrigger>
              <SelectContent>
                {RISKS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "All" ? "All Risks" : `${r} Risk`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Care Status" />
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Filter Doctor:</span>
            <Select
              value={doctorFilter}
              onValueChange={(v) => {
                setDoctorFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-48 text-xs">
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

          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Sort:</span>
            <div className="flex gap-1">
              <Button
                variant={sortBy === "admit" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortBy("admit")}
              >
                Admission Date
              </Button>
              <Button
                variant={sortBy === "risk" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortBy("risk")}
              >
                Risk Level
              </Button>
              <Button
                variant={sortBy === "name" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortBy("name")}
              >
                Name
              </Button>
              <Button
                variant={sortBy === "age" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortBy("age")}
              >
                Age
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      {filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Filter}
            title="No matching patients found"
            description="Adjust your search or filter settings to view records."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setDepartment("All");
                  setRisk("All");
                  setStatus("All");
                  setDoctorFilter("All");
                }}
              >
                Reset All Filters
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
                  <th className="px-4 py-3 font-medium">Patient Identification</th>
                  <th className="px-4 py-3 font-medium">Demographics</th>
                  <th className="px-4 py-3 font-medium">Condition & Department</th>
                  <th className="px-4 py-3 font-medium">Attending Physician</th>
                  <th className="px-4 py-3 font-medium">Room / Bed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Risk Status</th>
                  <th className="px-4 py-3 font-medium">Last Updated</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginated.map((p) => {
                  const doc = docMap.get(p.doctorId);
                  return (
                    <tr key={p.id} className="transition hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <PatientAvatar name={p.name} seed={p.seed} size="sm" />
                          <div>
                            <Link
                              to="/patients/$patientId"
                              params={{ patientId: p.id }}
                              className="font-medium text-foreground hover:text-primary transition-colors"
                            >
                              {p.name}
                            </Link>
                            <p className="num text-[11px] text-muted-foreground">{p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="num px-4 py-3 text-xs text-muted-foreground">
                        {p.age} y · {p.gender}
                        <span className="block text-[11px] font-semibold text-foreground/80">
                          Blood: {p.bloodGroup}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs leading-snug">{p.condition}</p>
                        <p className="text-[11px] text-muted-foreground">{p.department}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {doc ? (
                          <Link
                            to="/doctors/$doctorId"
                            params={{ doctorId: doc.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {doc.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="num px-4 py-3 text-xs text-muted-foreground">
                        {p.room === "—" ? "Outpatient" : `Ward ${p.room} · Bed ${p.bed}`}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge risk={p.risk} />
                      </td>
                      <td className="num px-4 py-3 text-xs text-muted-foreground">
                        {fmtRelative(p.lastUpdated)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => ui.openPatientForm(p.id)}
                            title="Edit Patient Details"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                            <Link to="/patients/$patientId" params={{ patientId: p.id }}>
                              View Dashboard
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-border/60 bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong className="text-foreground">
                {Math.min(currentPage * pageSize, filtered.length)}
              </strong>{" "}
              of <strong className="text-foreground">{filtered.length}</strong> records
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5 mr-0.5" />
                Previous
              </Button>
              <span className="num font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="size-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
