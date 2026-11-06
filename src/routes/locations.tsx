import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ExternalLink,
  MapPin,
  Phone,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  AvailabilityBadge,
  DemoNote,
  DoctorPhoto,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
  Pill,
  RiskBadge,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/store/store";
import { HOSPITALS } from "@/data/seed";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/locations")({
  head: () => ({
    meta: [
      { title: "Hospital Locations & Facilities – CareVista" },
      { name: "description", content: "Demonstration network map of CareVista tertiary care centers across India." },
      { property: "og:title", content: "Hospital Locations – CareVista" },
      { property: "og:description", content: "Demonstration hospital facilities across India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HospitalLocationsPage,
});

// Normalized coordinates for SVG rendering on India map (viewBox 0 0 500 550)
const MAP_COORDS = {
  Delhi: { x: 200, y: 155, label: "Delhi NCR" },
  Mumbai: { x: 145, y: 310, label: "Mumbai" },
  Hyderabad: { x: 235, y: 350, label: "Hyderabad" },
  Bengaluru: { x: 215, y: 430, label: "Bengaluru" },
  Chennai: { x: 265, y: 435, label: "Chennai" },
};

function HospitalLocationsPage() {
  const s = useAppState();
  const [selectedCity, setSelectedCity] = useState<string>("Chennai");

  const selectedHospital = useMemo(
    () => HOSPITALS.find((h) => h.city === selectedCity) ?? HOSPITALS[0],
    [selectedCity]
  );

  // Doctors in this hospital
  const doctorsInHospital = useMemo(
    () => s.doctors.filter((d) => d.city === selectedCity),
    [s.doctors, selectedCity]
  );

  // Patients in this hospital
  const patientsInHospital = useMemo(
    () => s.patients.filter((p) => p.hospitalId === selectedHospital.id),
    [s.patients, selectedHospital]
  );

  const activeInpatients = patientsInHospital.filter(
    (p) => p.status === "Admitted" || p.status === "Under Observation"
  );
  const criticalInpatients = patientsInHospital.filter((p) => p.risk === "Critical");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Facilities & Network Map"
        description="CareVista tertiary demonstration healthcare facilities across Chennai, Hyderabad, Bengaluru, Mumbai, and Delhi."
        crumbs={[{ label: "Hospital Locations" }]}
      />
      <DemoNote />

      {/* City Switcher Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {HOSPITALS.map((h) => {
          const isSelected = selectedCity === h.city;
          const docCount = s.doctors.filter((d) => d.city === h.city).length;
          const ptCount = s.patients.filter((p) => p.hospitalId === h.id).length;

          return (
            <button
              key={h.id}
              onClick={() => setSelectedCity(h.city)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-surface/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <MapPin className="size-3.5" />
              <span>{h.city}</span>
              <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", isSelected ? "bg-black/20 text-white" : "bg-muted text-muted-foreground")}>
                {docCount} docs
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: SVG Map + Facility Dashboard */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Interactive India Map Panel */}
        <Panel
          title="Pan-India Medical Network"
          description="Click a facility marker to inspect hospital capacity"
          className="lg:col-span-5"
        >
          <div className="relative flex items-center justify-center p-4 min-h-[380px]">
            <svg
              viewBox="0 0 500 550"
              className="w-full max-w-[380px] h-auto drop-shadow-md"
              aria-label="Map of India highlighting CareVista demonstration hospitals"
            >
              {/* Simplified India Landmass Path */}
              <path
                d="M175,60 L210,50 L250,75 L285,110 L280,140 L345,150 L380,195 L340,210 L305,215 L285,250 L260,285 L280,340 L260,455 L215,510 L195,475 L150,370 L130,310 L110,250 L115,200 L150,150 Z"
                fill="currentColor"
                className="text-surface fill-current stroke-border/80"
                strokeWidth={2}
              />

              {/* Connecting flight/network routes */}
              <line x1={MAP_COORDS.Delhi.x} y1={MAP_COORDS.Delhi.y} x2={MAP_COORDS.Mumbai.x} y2={MAP_COORDS.Mumbai.y} stroke="var(--primary)" strokeDasharray="3 3" opacity={0.3} />
              <line x1={MAP_COORDS.Delhi.x} y1={MAP_COORDS.Delhi.y} x2={MAP_COORDS.Hyderabad.x} y2={MAP_COORDS.Hyderabad.y} stroke="var(--primary)" strokeDasharray="3 3" opacity={0.3} />
              <line x1={MAP_COORDS.Mumbai.x} y1={MAP_COORDS.Mumbai.y} x2={MAP_COORDS.Bengaluru.x} y2={MAP_COORDS.Bengaluru.y} stroke="var(--primary)" strokeDasharray="3 3" opacity={0.3} />
              <line x1={MAP_COORDS.Bengaluru.x} y1={MAP_COORDS.Bengaluru.y} x2={MAP_COORDS.Chennai.x} y2={MAP_COORDS.Chennai.y} stroke="var(--primary)" strokeDasharray="3 3" opacity={0.3} />
              <line x1={MAP_COORDS.Hyderabad.x} y1={MAP_COORDS.Hyderabad.y} x2={MAP_COORDS.Chennai.x} y2={MAP_COORDS.Chennai.y} stroke="var(--primary)" strokeDasharray="3 3" opacity={0.3} />

              {/* Hospital Markers */}
              {Object.entries(MAP_COORDS).map(([cityName, coord]) => {
                const isSelected = selectedCity === cityName;
                return (
                  <g
                    key={cityName}
                    className="cursor-pointer transition-transform hover:scale-110"
                    onClick={() => setSelectedCity(cityName)}
                  >
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isSelected ? 10 : 7}
                      fill={isSelected ? "var(--primary)" : "var(--muted-foreground)"}
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                    {isSelected && (
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r={16}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth={1.5}
                        className="animate-ping opacity-75"
                      />
                    )}
                    <text
                      x={coord.x + 12}
                      y={coord.y + 4}
                      fontSize={11}
                      fontWeight={isSelected ? "bold" : "normal"}
                      fill={isSelected ? "var(--primary)" : "var(--foreground)"}
                      className="select-none"
                    >
                      {coord.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Panel>

        {/* Selected Facility Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Facility Header Card */}
          <div className="panel p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="eyebrow !text-[10px]">Tertiary Care Centre</span>
                <h2 className="text-xl font-bold text-foreground mt-0.5">{selectedHospital.name}</h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <MapPin className="size-3.5 text-primary" />
                  {selectedHospital.city}, India · Coordinates: {selectedHospital.lat}°N, {selectedHospital.lng}°E
                </p>
              </div>
              <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                Operational Facility
              </span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="rounded-lg bg-surface/70 p-3">
                <span className="text-muted-foreground">Configured Beds:</span>
                <p className="num font-bold text-lg text-foreground mt-0.5">{selectedHospital.beds}</p>
              </div>
              <div className="rounded-lg bg-surface/70 p-3">
                <span className="text-muted-foreground">Admitted Patients:</span>
                <p className="num font-bold text-lg text-foreground mt-0.5">{activeInpatients.length}</p>
              </div>
              <div className="rounded-lg bg-surface/70 p-3">
                <span className="text-muted-foreground">Critical Patients:</span>
                <p className="num font-bold text-lg text-critical mt-0.5">{criticalInpatients.length}</p>
              </div>
              <div className="rounded-lg bg-surface/70 p-3">
                <span className="text-muted-foreground">Specialist Staff:</span>
                <p className="num font-bold text-lg text-primary mt-0.5">{doctorsInHospital.length} Doctors</p>
              </div>
            </div>

            {/* Departments */}
            <div>
              <span className="eyebrow !text-[10px]">Operating Specialties</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedHospital.departments.map((dept) => (
                  <span
                    key={dept}
                    className="rounded-md border border-border/80 bg-surface px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Attending Doctors at this Location */}
          <Panel
            title={`Physician Roster · ${selectedHospital.city}`}
            description="Consulting specialists based at this regional facility"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {doctorsInHospital.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-border/70 bg-surface/50 p-3 flex items-start gap-3 transition hover:border-primary/50"
                >
                  <DoctorPhoto src={d.photo} name={d.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        to="/doctors/$doctorId"
                        params={{ doctorId: d.id }}
                        className="font-semibold text-xs text-foreground hover:text-primary transition-colors truncate"
                      >
                        {d.name}
                      </Link>
                      <AvailabilityBadge a={d.availability} />
                    </div>
                    <p className="text-[11px] text-primary truncate font-medium">{d.specialization}</p>
                    <p className="num text-[10px] text-muted-foreground mt-0.5">{d.experience} Years Exp</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Inpatients at this Location */}
          <Panel
            title={`Current Inpatients · ${selectedHospital.city}`}
            description="Patient cohort receiving care at this facility"
          >
            {patientsInHospital.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">No patients currently stationed at this branch.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {patientsInHospital.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <PatientAvatar name={p.name} seed={p.seed} size="sm" />
                      <div>
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: p.id }}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {p.name}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">
                          {p.id} · {p.condition} · Bed {p.room}-{p.bed}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiskBadge risk={p.risk} />
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                        <Link to="/patients/$patientId" params={{ patientId: p.id }}>
                          View →
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
