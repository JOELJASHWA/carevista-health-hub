import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Filter, GraduationCap, Mail, MapPin, Phone, Search, Stethoscope, Users } from "lucide-react";
import { AvailabilityBadge, DemoNote, DoctorPhoto, EmptyState, PageHeader, Panel } from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUi } from "@/components/cv/dialogs";
import { useAppState } from "@/store/store";
import { HOSPITALS } from "@/data/seed";
import { DEPARTMENTS } from "@/data/conditions";
import type { Availability } from "@/data/types";

export const Route = createFileRoute("/doctors/")({
  head: () => ({
    meta: [
      { title: "Attending Physicians & Specialists – CareVista" },
      { name: "description", content: "Fictional Indian doctor profiles, specialization, availability and clinical workload." },
      { property: "og:title", content: "Doctors Directory – CareVista" },
      { property: "og:description", content: "Fictional Indian doctor profiles, availability and workload." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorsPage,
});

const CITIES = ["All", "Chennai", "Hyderabad", "Bengaluru", "Mumbai", "Delhi"] as const;
const AVAILABILITIES: ("All" | Availability)[] = ["All", "Available", "In Surgery", "Off Duty", "On Leave"];

function DoctorsPage() {
  const s = useAppState();
  const ui = useUi();
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState<string>("All");
  const [city, setCity] = useState<string>("All");
  const [availability, setAvailability] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"experience" | "patients" | "name">("experience");

  const docStats = useMemo(() => {
    const map = new Map<string, { patients: number; active: number; appts: number }>();
    for (const d of s.doctors) {
      const assigned = s.patients.filter((p) => p.doctorId === d.id);
      const active = assigned.filter((p) => p.status === "Admitted" || p.status === "Under Observation");
      const appts = s.appointments.filter((a) => a.doctorId === d.id && a.status !== "Cancelled");
      map.set(d.id, { patients: assigned.length, active: active.length, appts: appts.length });
    }
    return map;
  }, [s.doctors, s.patients, s.appointments]);

  const filtered = useMemo(() => {
    return s.doctors
      .filter((d) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.qualification.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q);
        const matchesSpec = specialization === "All" || d.specialization === specialization;
        const matchesCity = city === "All" || d.city === city;
        const matchesAvail = availability === "All" || d.availability === availability;
        return matchesSearch && matchesSpec && matchesCity && matchesAvail;
      })
      .sort((a, b) => {
        if (sortBy === "experience") return b.experience - a.experience;
        if (sortBy === "patients") {
          const aCount = docStats.get(a.id)?.patients ?? 0;
          const bCount = docStats.get(b.id)?.patients ?? 0;
          return bCount - aCount;
        }
        return a.name.localeCompare(b.name);
      });
  }, [s.doctors, search, specialization, city, availability, sortBy, docStats]);

  const hospitalMap = useMemo(() => new Map(HOSPITALS.map((h) => [h.id, h])), []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attending Physicians"
        description="Profiles of consulting specialists across CareVista medical centers in Chennai, Hyderabad, Bengaluru, Mumbai, and Delhi."
        crumbs={[{ label: "Doctors" }]}
      />
      <DemoNote />

      {/* Filter and Search Bar */}
      <div className="panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by physician name, degree, specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <Select value={specialization} onValueChange={setSpecialization}>
              <SelectTrigger>
                <SelectValue placeholder="Specialization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Specialties</SelectItem>
                {DEPARTMENTS.map((dep) => (
                  <SelectItem key={dep} value={dep}>
                    {dep}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "All" ? "All Locations" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger>
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITIES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === "All" ? "All Statuses" : a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filtered.length}</strong> of {s.doctors.length} doctors
          </span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Sort by:</span>
            <div className="flex gap-1">
              <Button
                variant={sortBy === "experience" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortBy("experience")}
              >
                Experience
              </Button>
              <Button
                variant={sortBy === "patients" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortBy("patients")}
              >
                Patients
              </Button>
              <Button
                variant={sortBy === "name" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortBy("name")}
              >
                Name
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      {filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Filter}
            title="No matching doctors found"
            description="Try adjusting your search criteria or resetting filters."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setSpecialization("All");
                  setCity("All");
                  setAvailability("All");
                }}
              >
                Reset filters
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => {
            const stats = docStats.get(d.id) ?? { patients: 0, active: 0, appts: 0 };
            const hospital = hospitalMap.get(d.hospitalId);

            return (
              <div
                key={d.id}
                className="panel flex flex-col justify-between p-5 transition hover:border-primary/50 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start gap-4">
                    <DoctorPhoto src={d.photo} name={d.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="num text-[11px] text-muted-foreground">{d.id}</span>
                        <AvailabilityBadge a={d.availability} />
                      </div>
                      <h3 className="truncate text-base font-semibold text-foreground">
                        <Link
                          to="/doctors/$doctorId"
                          params={{ doctorId: d.id }}
                          className="hover:text-primary transition-colors"
                        >
                          {d.name}
                        </Link>
                      </h3>
                      <p className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Stethoscope className="size-3.5 shrink-0" />
                        <span className="truncate">{d.specialization}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <GraduationCap className="size-3 shrink-0" />
                        <span className="truncate">{d.qualification}</span>
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{d.bio}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-surface/80 p-2.5 text-xs">
                    <div>
                      <span className="eyebrow !text-[10px]">Location</span>
                      <p className="flex items-center gap-1 truncate font-medium text-foreground">
                        <MapPin className="size-3 text-muted-foreground" />
                        {d.city}
                      </p>
                    </div>
                    <div>
                      <span className="eyebrow !text-[10px]">Experience</span>
                      <p className="num font-medium text-foreground">{d.experience} Years</p>
                    </div>
                    <div>
                      <span className="eyebrow !text-[10px]">Assigned Patients</span>
                      <p className="num flex items-center gap-1 font-medium text-foreground">
                        <Users className="size-3 text-muted-foreground" />
                        {stats.patients} <span className="text-[10px] text-muted-foreground">({stats.active} active)</span>
                      </p>
                    </div>
                    <div>
                      <span className="eyebrow !text-[10px]">Consultations</span>
                      <p className="num flex items-center gap-1 font-medium text-foreground">
                        <CalendarDays className="size-3 text-muted-foreground" />
                        {stats.appts} scheduled
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{hospital?.name.replace("CareVista Demo Hospital – ", "")}</span>
                    <span className="num">
                      {d.hours[0]}:00–{d.hours[1]}:00
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-3">
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/doctors/$doctorId" params={{ doctorId: d.id }}>
                      View Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => ui.openAppointment({ prefill: { doctorId: d.id } })}
                  >
                    Book
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
