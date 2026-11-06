import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BedDouble,
  CheckCircle2,
  Filter,
  Layers,
  Search,
  Settings2,
  ShieldAlert,
  User,
  Wrench,
} from "lucide-react";
import {
  bedTone,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setBedStatus, useAppState } from "@/store/store";
import { DEPARTMENTS } from "@/data/conditions";
import { pct } from "@/lib/format";
import type { Bed, BedStatus } from "@/data/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/beds")({
  head: () => ({
    meta: [
      { title: "Hospital Bed Management – CareVista" },
      { name: "description", content: "Interactive ward and bed census tracking across hospital departments and floors." },
      { property: "og:title", content: "Bed Management – CareVista" },
      { property: "og:description", content: "Ward, room and bed occupancy across departments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BedManagementPage,
});

const BED_STATUSES: ("All" | BedStatus)[] = ["All", "Occupied", "Available", "Reserved", "Maintenance"];

function BedManagementPage() {
  const s = useAppState();
  const [department, setDepartment] = useState("All");
  const [floor, setFloor] = useState<string>("All");
  const [status, setStatus] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);

  const docMap = useMemo(() => new Map(s.doctors.map((d) => [d.id, d])), [s.doctors]);
  const patientMap = useMemo(() => new Map(s.patients.map((p) => [p.id, p])), [s.patients]);

  // Overall counts
  const totalBeds = s.beds.length;
  const occupiedBeds = s.beds.filter((b) => b.status === "Occupied").length;
  const availableBeds = s.beds.filter((b) => b.status === "Available").length;
  const maintenanceBeds = s.beds.filter((b) => b.status === "Maintenance" || b.status === "Reserved").length;
  const occupancyRate = pct(occupiedBeds, totalBeds);

  const floors = useMemo(() => {
    const set = new Set<number>();
    s.beds.forEach((b) => set.add(b.floor));
    return Array.from(set).sort();
  }, [s.beds]);

  // Filtered beds
  const filteredBeds = useMemo(() => {
    return s.beds.filter((b) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || b.room.toLowerCase().includes(q) || b.label.toLowerCase().includes(q);
      const matchDept = department === "All" || b.department === department;
      const matchFloor = floor === "All" || String(b.floor) === floor;
      const matchStatus = status === "All" || b.status === status;
      return matchSearch && matchDept && matchFloor && matchStatus;
    });
  }, [s.beds, search, department, floor, status]);

  // Group beds by Department then by Room
  const groupedByDept = useMemo(() => {
    const map = new Map<string, Map<string, Bed[]>>();
    filteredBeds.forEach((b) => {
      if (!map.has(b.department)) map.set(b.department, new Map());
      const roomMap = map.get(b.department)!;
      if (!roomMap.has(b.room)) roomMap.set(b.room, []);
      roomMap.get(b.room)!.push(b);
    });
    return map;
  }, [filteredBeds]);

  const handleStatusChange = (bedId: string, newStatus: BedStatus) => {
    const err = setBedStatus(bedId, newStatus);
    if (err) {
      toast.error(err);
    } else {
      toast.success(`Bed status updated to ${newStatus}`);
      setSelectedBed(null);
    }
  };

  const activePatient = selectedBed?.patientId ? patientMap.get(selectedBed.patientId) : null;
  const activeDoc = activePatient?.doctorId ? docMap.get(activePatient.doctorId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bed Management & Ward Census"
        description="Comprehensive facility occupancy tracking across inpatient units, intensive care suites, and general wards."
        crumbs={[{ label: "Bed Management" }]}
      />
      <DemoNote />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Hospital Beds"
          value={totalBeds}
          sub="Configured capacity"
          icon={BedDouble}
          onClick={() => {
            setStatus("All");
            setDepartment("All");
          }}
        />
        <KpiCard
          label="Occupied Beds"
          value={occupiedBeds}
          sub={`${occupancyRate}% occupancy rate`}
          icon={User}
          tone="info"
          onClick={() => setStatus("Occupied")}
        />
        <KpiCard
          label="Available Ready Beds"
          value={availableBeds}
          sub="Sanitized and ready"
          icon={CheckCircle2}
          tone="success"
          onClick={() => setStatus("Available")}
        />
        <KpiCard
          label="Maintenance / Reserved"
          value={maintenanceBeds}
          sub="Service or holding"
          icon={Wrench}
          tone="warning"
          onClick={() => setStatus("Maintenance")}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search room or bed (e.g. 101, A)..."
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
            <Select value={floor} onValueChange={setFloor}>
              <SelectTrigger>
                <SelectValue placeholder="Floor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Floors</SelectItem>
                {floors.map((fl) => (
                  <SelectItem key={fl} value={String(fl)}>
                    Floor {fl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {BED_STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st === "All" ? "All Bed Statuses" : st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredBeds.length}</strong> of {totalBeds} beds
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-info" /> Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warning" /> Reserved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-critical" /> Maintenance
            </span>
          </div>
        </div>
      </div>

      {/* Ward Visualizer */}
      {groupedByDept.size === 0 ? (
        <Panel>
          <EmptyState
            icon={Filter}
            title="No beds match your filter criteria"
            description="Try modifying search keywords or clearing floor and status filters."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDepartment("All");
                  setFloor("All");
                  setStatus("All");
                  setSearch("");
                }}
              >
                Reset Filters
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedByDept.entries()).map(([deptName, roomsMap]) => {
            const deptBeds = Array.from(roomsMap.values()).flat();
            const deptOccupied = deptBeds.filter((b) => b.status === "Occupied").length;
            const deptRate = pct(deptOccupied, deptBeds.length);

            return (
              <Panel
                key={deptName}
                title={`${deptName} Ward`}
                description={`Floor ${deptBeds[0]?.floor} · ${deptOccupied} of ${deptBeds.length} beds occupied (${deptRate}%)`}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from(roomsMap.entries()).map(([roomNum, roomBeds]) => (
                    <div
                      key={roomNum}
                      className="rounded-lg border border-border/70 bg-surface/50 p-3.5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">Room {roomNum}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {roomBeds.filter((b) => b.status === "Occupied").length}/{roomBeds.length} Occupied
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {roomBeds.map((bed) => {
                          const patient = bed.patientId ? patientMap.get(bed.patientId) : null;
                          const isOccupied = bed.status === "Occupied";
                          const isAvailable = bed.status === "Available";

                          return (
                            <button
                              key={bed.id}
                              onClick={() => setSelectedBed(bed)}
                              className={cn(
                                "flex flex-col justify-between rounded-lg border p-2.5 text-left transition hover:scale-[1.02] focus:outline-none focus:ring-1 focus:ring-primary",
                                isOccupied && "border-info/40 bg-info/10 hover:border-info",
                                isAvailable && "border-success/40 bg-success/10 hover:border-success",
                                bed.status === "Reserved" && "border-warning/40 bg-warning/10 hover:border-warning",
                                bed.status === "Maintenance" && "border-critical/40 bg-critical/10 hover:border-critical"
                              )}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs text-foreground">Bed {bed.label}</span>
                                <Pill tone={bedTone[bed.status]}>{bed.status}</Pill>
                              </div>

                              <div className="mt-2 text-xs">
                                {patient ? (
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground truncate">{patient.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{patient.condition}</p>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-muted-foreground italic">Ready for admit</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Bed Detail / Action Modal Dialog */}
      <Dialog open={!!selectedBed} onOpenChange={(open) => !open && setSelectedBed(null)}>
        {selectedBed && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BedDouble className="size-5 text-primary" />
                Bed {selectedBed.room}-{selectedBed.label}
              </DialogTitle>
              <DialogDescription>
                {selectedBed.department} Ward · Floor {selectedBed.floor}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-lg bg-surface p-3 text-sm">
                <span className="text-muted-foreground">Current Status:</span>
                <Pill tone={bedTone[selectedBed.status]}>{selectedBed.status}</Pill>
              </div>

              {activePatient ? (
                <div className="rounded-lg border border-border/80 bg-surface/70 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <PatientAvatar name={activePatient.name} seed={activePatient.seed} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{activePatient.name}</p>
                      <p className="num text-xs text-muted-foreground">
                        {activePatient.id} · {activePatient.age}y {activePatient.gender}
                      </p>
                    </div>
                    <RiskBadge risk={activePatient.risk} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60">
                    <div>
                      <span className="eyebrow !text-[9px]">Condition</span>
                      <p className="font-medium text-foreground">{activePatient.condition}</p>
                    </div>
                    <div>
                      <span className="eyebrow !text-[9px]">Attending Physician</span>
                      <p className="font-medium text-foreground">{activeDoc?.name ?? "—"}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button asChild size="sm" className="w-full">
                      <Link to="/patients/$patientId" params={{ patientId: activePatient.id }}>
                        Open Patient Clinical Profile →
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/80 p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">No patient currently assigned to this bed.</p>
                  <p className="text-xs text-muted-foreground">
                    You can change maintenance or holding status below.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {selectedBed.status !== "Available" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(selectedBed.id, "Available")}
                      >
                        Set to Available
                      </Button>
                    )}
                    {selectedBed.status !== "Maintenance" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(selectedBed.id, "Maintenance")}
                      >
                        Set to Maintenance
                      </Button>
                    )}
                    {selectedBed.status !== "Reserved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(selectedBed.id, "Reserved")}
                      >
                        Set to Reserved
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedBed(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
