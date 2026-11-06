import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Printer,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  DemoNote,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/store/store";
import { DEPARTMENTS } from "@/data/conditions";
import { downloadCsv } from "@/lib/csv";
import { fmtDate, fmtDateTime, fmtNum } from "@/lib/format";
import { getHistory, getReports } from "@/data/seed";
import { filterRange, getVitals, stats, VITALS, VITAL_KEYS } from "@/data/vitals";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Clinical Reports & Export Builder – CareVista" },
      { name: "description", content: "Interactive healthcare report builder, clinical summaries, and CSV data exports." },
      { property: "og:title", content: "Reports Builder – CareVista" },
      { property: "og:description", content: "Custom report builder with CSV export and printable clinical summaries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const REPORT_TYPES = [
  { id: "patient-summary", label: "Patient Comprehensive Clinical Summary" },
  { id: "department-census", label: "Department Inpatient Census & Capacity Report" },
  { id: "physician-workload", label: "Attending Physician Clinical Roster & Workload" },
  { id: "vitals-audit", label: "Vital-Sign Hemodynamic Telemetry Audit" },
  { id: "appointments-log", label: "Consultation & Appointment Encounter Log" },
];

function ReportsPage() {
  const s = useAppState();

  const [reportType, setReportType] = useState("patient-summary");
  const [patientId, setPatientId] = useState<string>(s.patients[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState<string>("All");
  const [department, setDepartment] = useState<string>("All");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const selectedPatient = useMemo(
    () => s.patients.find((p) => p.id === patientId) ?? s.patients[0],
    [s.patients, patientId]
  );

  const selectedDoctor = useMemo(
    () => s.doctors.find((d) => d.id === doctorId),
    [s.doctors, doctorId]
  );

  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const startTime = s.anchor - days * 86400000;

  // Filtered dataset according to criteria
  const filteredPatients = useMemo(() => {
    return s.patients.filter((p) => {
      const matchDoc = doctorId === "All" || p.doctorId === doctorId;
      const matchDept = department === "All" || p.department === department;
      return matchDoc && matchDept;
    });
  }, [s.patients, doctorId, department]);

  const filteredAppointments = useMemo(() => {
    return s.appointments.filter((a) => {
      const matchDoc = doctorId === "All" || a.doctorId === doctorId;
      const matchPat = reportType === "patient-summary" ? a.patientId === selectedPatient?.id : true;
      const inRange = a.start >= startTime;
      return matchDoc && matchPat && inRange;
    });
  }, [s.appointments, doctorId, reportType, selectedPatient, startTime]);

  // Generate CSV Download
  const handleDownloadCsv = () => {
    if (reportType === "patient-summary" && selectedPatient) {
      const readings = filterRange(getVitals(selectedPatient, s.anchor), startTime, s.anchor);
      const rows = readings.map((r) => ({
        Timestamp: fmtDateTime(r.t),
        "Heart Rate (BPM)": r.hr,
        "Systolic BP (mmHg)": r.sys,
        "Diastolic BP (mmHg)": r.dia,
        "SpO2 (%)": r.spo2,
        "Temp (°C)": r.temp,
        "Resp Rate (bpm)": r.rr,
      }));
      downloadCsv(`${selectedPatient.id}_Vitals_Report_${timeRange}`, rows);
      toast.success("Patient summary report CSV exported");
    } else if (reportType === "department-census") {
      const rows = filteredPatients.map((p) => ({
        "Patient ID": p.id,
        Name: p.name,
        Department: p.department,
        Condition: p.condition,
        Status: p.status,
        "Risk Level": p.risk,
        "Room / Bed": `${p.room}-${p.bed}`,
        Admitted: fmtDate(p.admissionDate),
      }));
      downloadCsv(`Department_Census_${department}_${timeRange}`, rows);
      toast.success("Department census CSV exported");
    } else if (reportType === "physician-workload") {
      const docs = doctorId === "All" ? s.doctors : s.doctors.filter((d) => d.id === doctorId);
      const rows = docs.map((d) => ({
        "Doctor ID": d.id,
        Name: d.name,
        Specialization: d.specialization,
        City: d.city,
        Availability: d.availability,
        "Assigned Patients": s.patients.filter((p) => p.doctorId === d.id).length,
        "Consultations Scheduled": s.appointments.filter((a) => a.doctorId === d.id).length,
      }));
      downloadCsv(`Physician_Workload_${timeRange}`, rows);
      toast.success("Physician workload CSV exported");
    } else {
      const rows = filteredAppointments.map((a) => {
        const p = s.patients.find((pt) => pt.id === a.patientId);
        const d = s.doctors.find((dt) => dt.id === a.doctorId);
        return {
          "Appt ID": a.id,
          Schedule: fmtDateTime(a.start),
          Patient: p?.name ?? a.patientId,
          Physician: d?.name ?? a.doctorId,
          Type: a.type,
          Duration: `${a.duration} mins`,
          Status: a.status,
          Notes: a.notes,
        };
      });
      downloadCsv(`Consultation_Schedule_${timeRange}`, rows);
      toast.success("Consultation schedule CSV exported");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setReportType("patient-summary");
    setPatientId(s.patients[0]?.id ?? "");
    setDoctorId("All");
    setDepartment("All");
    setTimeRange("30d");
    toast.info("Report builder filters reset to default");
  };

  // Patient history and vitals for patient-summary preview
  const patientHistory = selectedPatient ? getHistory(selectedPatient) : null;
  const patientVitals = selectedPatient ? getVitals(selectedPatient, s.anchor) : [];
  const patientVitalsRange = filterRange(patientVitals, startTime, s.anchor);
  const patientDoc = selectedPatient ? s.doctors.find((d) => d.id === selectedPatient.doctorId) : null;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Custom Report Builder"
          description="Design, preview, and generate structured clinical summaries, department census audits, and data exports."
          crumbs={[{ label: "Reports" }]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="size-3.5 mr-1" />
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                <Download className="size-3.5 mr-1" />
                Export CSV
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="size-3.5 mr-1" />
                Print Report
              </Button>
            </div>
          }
        />
        <DemoNote />

        {/* Builder Controls Panel */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/60 pb-3">
            <Filter className="size-4 text-primary" />
            Report Parameters & Filtering
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Report" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reportType === "patient-summary" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">Select Patient</label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {s.patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">Filter Physician</label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Physician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Consulting Staff</SelectItem>
                  {s.doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.specialization})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">Department</label>
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
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">Historical Range</label>
              <Select value={timeRange} onValueChange={(v: "7d" | "30d" | "90d") => setTimeRange(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Preview */}
      <section className="panel print-area p-8 space-y-6 bg-card border border-border shadow-sm">
        {/* Hospital Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="brand-mark grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                CV
              </span>
              <span className="font-display font-bold text-lg text-foreground">CareVista Healthcare</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Clinical Intelligence & Inpatient Telemetry Analytics Unit
            </p>
          </div>

          <div className="text-right text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">DEMONSTRATION REPORT</p>
            <p>Generated: {fmtDateTime(Date.now())}</p>
            <p className="text-[11px]">Period: Last {days} Days</p>
          </div>
        </div>

        {/* Report Content according to type */}
        {reportType === "patient-summary" && selectedPatient ? (
          <div className="space-y-6">
            <div>
              <span className="eyebrow">Patient Identification & Admission</span>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg bg-surface/60 p-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-bold text-foreground text-sm">{selectedPatient.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Patient ID:</span>
                  <p className="num font-semibold text-foreground">{selectedPatient.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Age / Gender:</span>
                  <p className="font-medium text-foreground">{selectedPatient.age}y · {selectedPatient.gender}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Blood Group:</span>
                  <p className="font-semibold text-foreground">{selectedPatient.bloodGroup}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <p className="font-medium text-foreground">{selectedPatient.department}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Condition:</span>
                  <p className="font-medium text-foreground">{selectedPatient.condition}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ward / Bed:</span>
                  <p className="font-medium text-foreground">{selectedPatient.room}-{selectedPatient.bed}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Attending Physician:</span>
                  <p className="font-medium text-foreground">{patientDoc?.name ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* Medical History */}
            {patientHistory && (
              <div>
                <span className="eyebrow">Clinical Diagnoses & Treatment History</span>
                <div className="mt-2 text-xs space-y-2">
                  <p>
                    <strong className="text-foreground">Diagnoses: </strong>
                    {patientHistory.diagnoses.map((d) => `${d.name} (${d.year})`).join(", ")}
                  </p>
                  <p>
                    <strong className="text-foreground">Current Medications: </strong>
                    {patientHistory.medications.map((m) => `${m.name} ${m.dose} ${m.frequency}`).join("; ") || "None"}
                  </p>
                  <p>
                    <strong className="text-foreground">Known Allergies: </strong>
                    {patientHistory.allergies.map((a) => `${a.name} (${a.severity})`).join(", ") || "None known"}
                  </p>
                </div>
              </div>
            )}

            {/* Vitals Statistics Table */}
            <div>
              <span className="eyebrow">Hemodynamic Vitals Statistics (Last {days} Days)</span>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs border border-border/70">
                  <thead className="bg-surface/80 text-muted-foreground border-b border-border/70">
                    <tr>
                      <th className="px-3 py-2 font-medium">Vital Parameter</th>
                      <th className="px-3 py-2 font-medium">Mean (Avg)</th>
                      <th className="px-3 py-2 font-medium">Minimum</th>
                      <th className="px-3 py-2 font-medium">Maximum</th>
                      <th className="px-3 py-2 font-medium">Trend Direction</th>
                      <th className="px-3 py-2 font-medium">Out-of-Range Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {VITAL_KEYS.map((k) => {
                      const st = stats(patientVitalsRange, k, s.settings.thresholds);
                      if (!st) return null;
                      return (
                        <tr key={k}>
                          <td className="px-3 py-2 font-semibold text-foreground">
                            {VITALS[k].label} ({VITALS[k].unit})
                          </td>
                          <td className="num px-3 py-2">{fmtNum(st.avg, VITALS[k].decimals)}</td>
                          <td className="num px-3 py-2">{fmtNum(st.min, VITALS[k].decimals)}</td>
                          <td className="num px-3 py-2">{fmtNum(st.max, VITALS[k].decimals)}</td>
                          <td className="px-3 py-2 font-medium">{st.trend}</td>
                          <td className="num px-3 py-2">
                            {st.abnormal > 0 ? (
                              <span className="text-critical font-bold">{st.abnormal} readings</span>
                            ) : (
                              <span className="text-success">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Consultation Encounters */}
            <div>
              <span className="eyebrow">Scheduled & Recorded Consultations</span>
              <div className="mt-2 space-y-1 text-xs">
                {filteredAppointments.length === 0 ? (
                  <p className="text-muted-foreground italic">No consultations on record for this interval.</p>
                ) : (
                  <ul className="divide-y divide-border/60 border border-border/60 rounded">
                    {filteredAppointments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between p-2.5">
                        <div>
                          <span className="font-semibold text-foreground">{a.type}</span>
                          <span className="num text-muted-foreground ml-2">({fmtDateTime(a.start)})</span>
                          {a.notes && <p className="text-muted-foreground italic mt-0.5">"{a.notes}"</p>}
                        </div>
                        <span className="num font-medium text-foreground">{a.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* General Cohort Table */
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-foreground">
              {REPORT_TYPES.find((t) => t.id === reportType)?.label}
            </h3>
            <div className="overflow-x-auto border border-border/70 rounded">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface/80 text-muted-foreground border-b border-border/70">
                  <tr>
                    <th className="px-3 py-2 font-medium">Identifier</th>
                    <th className="px-3 py-2 font-medium">Entity / Name</th>
                    <th className="px-3 py-2 font-medium">Department</th>
                    <th className="px-3 py-2 font-medium">Status / Specialty</th>
                    <th className="px-3 py-2 font-medium">Risk / Availability</th>
                    <th className="px-3 py-2 font-medium">Date / Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPatients.slice(0, 15).map((p) => {
                    const doc = s.doctors.find((d) => d.id === p.doctorId);
                    return (
                      <tr key={p.id}>
                        <td className="num px-3 py-2 font-mono text-muted-foreground">{p.id}</td>
                        <td className="px-3 py-2 font-semibold text-foreground">{p.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.department}</td>
                        <td className="px-3 py-2">{p.status}</td>
                        <td className="px-3 py-2 font-bold">{p.risk}</td>
                        <td className="num px-3 py-2 text-muted-foreground">{fmtDate(p.admissionDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border/80 pt-4 text-center text-[11px] text-muted-foreground">
          CareVista Healthcare Intelligence · Demonstration Record · Not intended for actual medical diagnosis or clinical treatment.
        </div>
      </section>
    </div>
  );
}
