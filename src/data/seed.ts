import { CONDITIONS, DEPARTMENTS } from "./conditions";
import { DAY, HOUR, hashString, int, mulberry32, pick } from "./rng";
import type {
  Activity,
  AlertItem,
  Appointment,
  AppointmentStatus,
  AppointmentType,
  Bed,
  BedStatus,
  Doctor,
  Encounter,
  Gender,
  Hospital,
  MedicalHistory,
  Patient,
  PatientReportDoc,
  PatientStatus,
  Risk,
  TimelineEvent,
  XrayImage,
} from "./types";
import { DEFAULT_THRESHOLDS, VITALS, getVitals, isAbnormal, VITAL_KEYS } from "./vitals";

export const HOSPITALS: Hospital[] = [
  { id: "H-CHN", name: "CareVista Demo Hospital – Chennai", city: "Chennai", lat: 13.08, lng: 80.27, beds: 320, departments: ["Cardiology", "Pediatrics", "General Medicine"] },
  { id: "H-HYD", name: "CareVista Demo Hospital – Hyderabad", city: "Hyderabad", lat: 17.385, lng: 78.487, beds: 280, departments: ["Orthopedics", "Pulmonology"] },
  { id: "H-BLR", name: "CareVista Demo Hospital – Bengaluru", city: "Bengaluru", lat: 12.972, lng: 77.595, beds: 300, departments: ["Neurology", "Oncology"] },
  { id: "H-BOM", name: "CareVista Demo Hospital – Mumbai", city: "Mumbai", lat: 19.076, lng: 72.878, beds: 360, departments: ["Emergency Medicine", "Dermatology"] },
  { id: "H-DEL", name: "CareVista Demo Hospital – Delhi", city: "Delhi", lat: 28.614, lng: 77.209, beds: 340, departments: ["Gynecology", "General Medicine"] },
];

const hospitalByCity = (city: string) => HOSPITALS.find((h) => h.city === city)!.id;

const DOCTOR_BASE: Omit<Doctor, "id" | "photo" | "hospitalId" | "email" | "phone" | "workDays" | "hours">[] = [
  { name: "Dr. Arjun Raman", gender: "Male", qualification: "MBBS, MD, DM (Cardiology)", specialization: "Cardiology", experience: 18, city: "Chennai", availability: "Available", bio: "Interventional cardiologist focused on complex coronary interventions and preventive cardiac care. Leads the demo cardiac rehabilitation programme." },
  { name: "Dr. Priya Sharma", gender: "Female", qualification: "MBBS, MS (Obstetrics & Gynaecology)", specialization: "Gynecology", experience: 12, city: "Delhi", availability: "Available", bio: "Specialist in high-risk pregnancy management and minimally invasive gynaecological surgery." },
  { name: "Dr. Vikram Reddy", gender: "Male", qualification: "MBBS, MS (Orthopaedics), FRCS", specialization: "Orthopedics", experience: 24, city: "Hyderabad", availability: "In Surgery", bio: "Senior orthopaedic surgeon experienced in trauma fixation, joint replacement and sports injuries." },
  { name: "Dr. Ananya Iyer", gender: "Female", qualification: "MBBS, MD, DM (Neurology)", specialization: "Neurology", experience: 15, city: "Bengaluru", availability: "Available", bio: "Stroke and headache specialist with interest in neuro-rehabilitation pathways." },
  { name: "Dr. Rahul Mehta", gender: "Male", qualification: "MBBS, MD (Emergency Medicine)", specialization: "Emergency Medicine", experience: 9, city: "Mumbai", availability: "Available", bio: "Emergency physician coordinating trauma response, triage and critical-care stabilisation." },
  { name: "Dr. Kavya Nair", gender: "Female", qualification: "MBBS, MD (Paediatrics)", specialization: "Pediatrics", experience: 11, city: "Chennai", availability: "Available", bio: "Paediatrician caring for acute childhood illness, respiratory infections and growth monitoring." },
  { name: "Dr. Sanjay Kumar", gender: "Male", qualification: "MBBS, MD (General Medicine)", specialization: "General Medicine", experience: 21, city: "Delhi", availability: "Off Duty", bio: "Internal medicine consultant managing diabetes, infectious disease and multi-morbidity." },
  { name: "Dr. Meera Krishnan", gender: "Female", qualification: "MBBS, MD, DM (Medical Oncology)", specialization: "Oncology", experience: 19, city: "Bengaluru", availability: "Available", bio: "Medical oncologist specialising in breast cancer and lymphoma treatment protocols." },
  { name: "Dr. Aditya Rao", gender: "Male", qualification: "MBBS, MD (Pulmonary Medicine)", specialization: "Pulmonology", experience: 8, city: "Hyderabad", availability: "Available", bio: "Pulmonologist focused on COPD, pneumonia and non-invasive ventilation." },
  { name: "Dr. Sneha Kapoor", gender: "Female", qualification: "MBBS, MD (Dermatology)", specialization: "Dermatology", experience: 7, city: "Mumbai", availability: "On Leave", bio: "Dermatologist treating chronic inflammatory skin disease and skin infections." },
];

export const DOCTORS: Doctor[] = DOCTOR_BASE.map((d, i) => {
  const n = i + 1;
  const slug = d.name.replace("Dr. ", "").toLowerCase().replace(/\s+/g, ".");
  return {
    ...d,
    id: `DR-${String(n).padStart(3, "0")}`,
    photo: `/images/doctors/dr-${String(n).padStart(2, "0")}.jpg`,
    hospitalId: hospitalByCity(d.city),
    email: `${slug}@carevista.demo`,
    phone: `+91 90000 ${String(10000 + n * 1111).slice(0, 5)}`,
    workDays: i % 3 === 0 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5],
    hours: i % 2 === 0 ? [9, 17] : [10, 18],
  };
});

const PATIENT_BASE: [string, number, Gender, number, string, PatientStatus, Risk, string, number][] = [
  // name, age, gender, doctor index, condition, status, risk, blood, admittedDaysAgo
  ["Ramesh Iyer", 62, "Male", 0, "Coronary artery disease", "Admitted", "Critical", "B+", 3],
  ["Lakshmi Venkatesh", 71, "Female", 0, "Atrial fibrillation", "Under Observation", "Warning", "O+", 6],
  ["Neha Gupta", 29, "Female", 1, "Pre-eclampsia (monitoring)", "Admitted", "Warning", "A+", 2],
  ["Fatima Sheikh", 41, "Female", 1, "Ovarian cyst (post-op)", "Discharged", "Stable", "AB+", 19],
  ["Suresh Babu", 54, "Male", 2, "Femur fracture (post-op)", "Admitted", "Stable", "O-", 9],
  ["Harpreet Singh", 46, "Male", 2, "Lumbar disc herniation", "Outpatient", "Stable", "B+", 34],
  ["Gopal Shetty", 67, "Male", 3, "Ischemic stroke (recovery)", "Admitted", "Critical", "A-", 5],
  ["Divya Menon", 34, "Female", 3, "Migraine with aura", "Outpatient", "Stable", "O+", 48],
  ["Imran Qureshi", 38, "Male", 4, "Road traffic accident – polytrauma", "Admitted", "Critical", "B-", 1],
  ["Pooja Desai", 58, "Female", 4, "Sepsis (under treatment)", "Admitted", "Critical", "A+", 2],
  ["Aarav Pillai", 6, "Male", 5, "Bronchiolitis", "Admitted", "Warning", "O+", 2],
  ["Ishita Das", 9, "Female", 5, "Acute gastroenteritis", "Discharged", "Stable", "B+", 12],
  ["Mohan Lal", 59, "Male", 6, "Type 2 diabetes mellitus", "Under Observation", "Warning", "AB-", 4],
  ["Ritu Agarwal", 33, "Female", 6, "Dengue fever", "Admitted", "Warning", "O+", 3],
  ["Sunita Joshi", 52, "Female", 7, "Breast carcinoma (chemotherapy)", "Admitted", "Warning", "A+", 7],
  ["Karthik Subramanian", 44, "Male", 7, "Non-Hodgkin lymphoma", "Outpatient", "Stable", "B+", 60],
  ["Abdul Rahman", 69, "Male", 8, "COPD exacerbation", "Admitted", "Warning", "O+", 4],
  ["Anjali Verma", 47, "Female", 8, "Community-acquired pneumonia", "Under Observation", "Stable", "A-", 5],
  ["Rohan Malhotra", 27, "Male", 9, "Severe psoriasis", "Outpatient", "Stable", "B+", 75],
  ["Swati Kulkarni", 36, "Female", 9, "Cellulitis", "Admitted", "Stable", "O-", 2],
];

export const isActiveStatus = (s: PatientStatus) => s === "Admitted" || s === "Under Observation";

export function wardFor(department: string) {
  const d = DEPARTMENTS.indexOf(department as (typeof DEPARTMENTS)[number]);
  const floor = Math.floor(d / 2) + 1;
  const block = d % 2;
  return { floor, rooms: [1, 2, 3].map((k) => `${floor}${block}${k}`) };
}

export interface SeedState {
  anchor: number;
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  beds: Bed[];
  alerts: AlertItem[];
  activity: Activity[];
  encounters: Encounter[];
}

export function buildSeed(anchorInput: number): SeedState {
  const anchor = Math.floor(anchorInput / HOUR) * HOUR;
  const r = mulberry32(20261105);

  // Beds: 3 rooms × 2 beds per department ward
  const beds: Bed[] = [];
  for (const dep of DEPARTMENTS) {
    const w = wardFor(dep);
    for (const room of w.rooms) {
      for (const label of ["A", "B"]) {
        beds.push({ id: `BED-${room}${label}`, department: dep, floor: w.floor, room, label, status: "Available" });
      }
    }
  }

  const patients: Patient[] = PATIENT_BASE.map(([name, age, gender, di, condition, status, risk, blood, ago], i) => {
    const doc = DOCTORS[di];
    const id = `CV-P${1001 + i}`;
    const admissionDate = anchor - ago * DAY - int(r, 1, 10) * HOUR;
    let room = "—";
    let bed = "—";
    if (isActiveStatus(status)) {
      const free = beds.find((b) => b.department === doc.specialization && b.status === "Available");
      if (free) {
        free.status = "Occupied";
        free.patientId = id;
        room = free.room;
        bed = free.label;
      }
    }
    return {
      id,
      name,
      age,
      gender,
      bloodGroup: blood,
      doctorId: doc.id,
      department: doc.specialization,
      condition,
      admissionDate,
      dischargeDate: status === "Discharged" ? admissionDate + int(r, 3, 6) * DAY : undefined,
      status,
      risk,
      room,
      bed,
      hospitalId: doc.hospitalId,
      lastUpdated: anchor - int(r, 2, 170) * 60_000,
      phone: `+91 98${int(r, 100, 999)} ${int(r, 10000, 99999)}`,
      seed: hashString(id + name),
    };
  });

  // Remaining bed states
  for (const b of beds) {
    if (b.status !== "Available") continue;
    const x = r();
    b.status = (x < 0.22 ? "Reserved" : x < 0.32 ? "Maintenance" : "Available") as BedStatus;
  }

  // Appointments — consistent with doctor-patient assignments, no doctor double-booking
  const appointments: Appointment[] = [];
  const taken = new Set<string>();
  const types: AppointmentType[] = ["Consultation", "Follow-up", "Lab Review", "Procedure", "Tele-consult"];
  let aid = 1;
  const dayStart = startOfDay(anchor);
  patients.forEach((p, pi) => {
    const doc = DOCTORS.find((d) => d.id === p.doctorId)!;
    const offsets = [-int(r, 25, 45), -int(r, 8, 20), -int(r, 1, 6), pi % 3 === 0 ? 0 : int(r, 1, 4), int(r, 5, 14)];
    for (const off of offsets) {
      let day = dayStart + off * DAY;
      let tries = 0;
      while (!doc.workDays.includes(new Date(day).getDay()) && tries < 7) {
        day += DAY;
        tries++;
      }
      let hour = int(r, doc.hours[0], doc.hours[1] - 1);
      let slotKey = `${doc.id}:${day}:${hour}`;
      while (taken.has(slotKey)) {
        hour = hour + 1 >= doc.hours[1] ? doc.hours[0] : hour + 1;
        slotKey = `${doc.id}:${day}:${hour}`;
      }
      taken.add(slotKey);
      const start = day + hour * HOUR + (r() < 0.5 ? 30 * 60_000 : 0);
      const past = start < anchor;
      const status: AppointmentStatus = past
        ? (pick(r, ["Completed", "Completed", "Completed", "Completed", "No-show", "Cancelled"]) as AppointmentStatus)
        : (pick(r, ["Scheduled", "Confirmed", "Confirmed"]) as AppointmentStatus);
      appointments.push({
        id: `APT-${String(aid++).padStart(4, "0")}`,
        patientId: p.id,
        doctorId: doc.id,
        start,
        duration: pick(r, [30, 30, 45]),
        type: pick(r, types),
        status,
        notes: `${pick(r, ["Review", "Assess", "Discuss", "Monitor"])} ${p.condition.toLowerCase()} – demo note.`,
      });
    }
  });
  appointments.sort((a, b) => a.start - b.start);

  // Encounters: 180 days of synthetic admissions across the network + current patients
  const encounters: Encounter[] = [];
  for (let d = 180; d >= 0; d--) {
    const day = dayStart - d * DAY;
    const weekday = new Date(day).getDay();
    const n = int(r, 3, 7) + (weekday === 1 ? 2 : 0) + (d < 30 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const doc = pick(r, DOCTORS);
      const admit = day + int(r, 0, 23) * HOUR;
      const los = int(r, 1, 9) * DAY;
      const discharge = admit + los < anchor - DAY * 0.5 ? admit + los : undefined;
      if (discharge === undefined && d < 1) continue;
      encounters.push({
        id: `ENC-${encounters.length + 1}`,
        department: doc.specialization,
        doctorId: doc.id,
        admit,
        discharge: discharge ?? (admit + los < anchor ? admit + los : undefined),
        age: doc.specialization === "Pediatrics" ? int(r, 1, 14) : int(r, 18, 88),
        gender: r() < 0.5 ? "Male" : "Female",
        risk: (r() < 0.12 ? "Critical" : r() < 0.35 ? "Warning" : "Stable") as Risk,
      });
    }
  }
  for (const p of patients) {
    encounters.push({
      id: `ENC-${p.id}`,
      department: p.department,
      doctorId: p.doctorId,
      admit: p.admissionDate,
      discharge: p.status === "Discharged" || p.status === "Outpatient" ? p.dischargeDate ?? p.admissionDate + 6 * HOUR : undefined,
      age: p.age,
      gender: p.gender,
      risk: p.risk,
    });
  }

  // Alerts
  const alerts: AlertItem[] = [];
  let alid = 1;
  const pushAlert = (a: Omit<AlertItem, "id" | "read" | "state" | "history">, read = false) => {
    alerts.push({ ...a, id: `ALT-${String(alid++).padStart(4, "0")}`, read, state: "open", history: [{ time: a.time, action: "Alert generated (demo)" }] });
  };
  for (const p of patients) {
    const readings = getVitals(p, anchor).slice(-72);
    let added = 0;
    for (let i = readings.length - 1; i >= 0 && added < (p.risk === "Critical" ? 3 : p.risk === "Warning" ? 2 : 1); i--) {
      const rd = readings[i];
      const k = VITAL_KEYS.find((kk) => isAbnormal(kk, rd[kk], DEFAULT_THRESHOLDS));
      if (!k) continue;
      const meta = VITALS[k];
      const severe = p.risk === "Critical";
      pushAlert({
        severity: severe ? "critical" : "warning",
        category: severe ? "Critical" : "Abnormal Vitals",
        title: `${meta.label} ${rd[k]} ${meta.unit}`,
        message: `Simulated reading for ${p.name} outside demonstration threshold (${DEFAULT_THRESHOLDS[k][0]}–${DEFAULT_THRESHOLDS[k][1]} ${meta.unit}).`,
        patientId: p.id,
        doctorId: p.doctorId,
        time: rd.t,
      }, added > 0);
      added++;
      i -= 6;
    }
    if (anchor - p.admissionDate < 7 * DAY) {
      pushAlert({ severity: "info", category: "Admission", title: `${p.name} admitted`, message: `Admitted to ${p.department} for ${p.condition}.`, patientId: p.id, doctorId: p.doctorId, time: p.admissionDate }, true);
    }
    if (p.status === "Discharged" && p.dischargeDate) {
      pushAlert({ severity: "info", category: "Discharge", title: `${p.name} discharged`, message: `Discharge summary available for ${p.condition}.`, patientId: p.id, doctorId: p.doctorId, time: p.dischargeDate }, true);
    }
  }
  for (const a of appointments.filter((x) => x.start > anchor && x.start < anchor + 2 * DAY)) {
    const p = patients.find((pp) => pp.id === a.patientId)!;
    pushAlert({ severity: "info", category: "Appointment", title: `Upcoming ${a.type.toLowerCase()}`, message: `${p.name} with ${DOCTORS.find((d) => d.id === a.doctorId)!.name}.`, patientId: p.id, doctorId: a.doctorId, time: a.start - 4 * HOUR });
  }
  pushAlert({ severity: "info", category: "Informational", title: "Demo data refreshed", message: "Synthetic dataset generated for this demonstration session.", time: anchor - 30 * 60_000 }, true);
  alerts.sort((a, b) => b.time - a.time);

  // Activity
  const activity: Activity[] = [];
  for (const p of patients) {
    activity.push({ id: `ACT-${activity.length + 1}`, time: p.admissionDate, type: "Patient created", description: `${p.name} registered under ${DOCTORS.find((d) => d.id === p.doctorId)!.name}`, patientId: p.id, doctorId: p.doctorId });
  }
  for (const a of appointments.filter((x) => x.start < anchor).slice(-12)) {
    activity.push({ id: `ACT-${activity.length + 1}`, time: a.start - 2 * DAY, type: "Appointment created", description: `${a.type} booked (${a.id})`, patientId: a.patientId, doctorId: a.doctorId });
  }
  activity.sort((a, b) => b.time - a.time);

  return { anchor, patients, doctors: DOCTORS, appointments, beds, alerts, activity, encounters };
}

export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* ---------- Per-patient derived records (deterministic per patient) ---------- */

const NOTE_AUTHORS = ["Nurse Revathi S.", "Nurse Joseph M.", "Dr. (resident) Farhan A.", "Dietitian Shalini P."];
const ALLERGENS = ["Penicillin", "Sulfa drugs", "Peanuts", "Latex", "Iodinated contrast", "Dust mites", "Ibuprofen"];

export function getHistory(p: Patient): MedicalHistory {
  const r = mulberry32(p.seed ^ 0x51ed);
  const c = CONDITIONS[p.condition];
  const doc = DOCTORS.find((d) => d.id === p.doctorId);
  const hospital = HOSPITALS.find((h) => h.id === p.hospitalId)?.name ?? "CareVista Demo Hospital";
  const year = new Date(p.admissionDate).getFullYear();
  const allergyCount = int(r, 0, 2);
  const allergies = Array.from(new Set(Array.from({ length: allergyCount }, () => pick(r, ALLERGENS)))).map((name) => ({
    name,
    severity: pick(r, ["Mild", "Moderate", "Severe"]),
  }));
  return {
    diagnoses: [
      { name: p.condition, year, status: p.status === "Discharged" ? "Resolved" : "Active" },
      ...(c?.diagnoses ?? []).map((d) => ({ name: d, year: year - int(r, 1, Math.min(12, Math.max(1, p.age - 1))), status: "Chronic" })),
    ],
    allergies,
    medications: c?.medications ?? [],
    treatments: (c?.treatments ?? []).map((t, i) => ({ name: t, date: p.admissionDate + (i + 0.5) * DAY * int(r, 1, 2), outcome: pick(r, ["Completed", "Ongoing", "Good response", "Tolerated well"]) })),
    surgeries: (c?.surgeries ?? []).map((s) => ({ name: s, year: year - (r() < 0.5 ? 0 : int(r, 1, 4)), hospital })),
    notes: Array.from({ length: 3 }, (_, i) => ({
      time: p.lastUpdated - i * int(r, 6, 20) * HOUR,
      author: i === 0 ? doc?.name ?? "Attending" : pick(r, NOTE_AUTHORS),
      text: pick(r, [
        `Patient comfortable; ${p.condition.toLowerCase()} management continued as per plan.`,
        "Vitals reviewed on simulated monitor; no change to demonstration plan.",
        "Family counselled regarding course of treatment.",
        "Oral intake improving; mobilised with assistance.",
        "Medication reconciliation completed.",
      ]),
    })),
    admissions: [
      { admit: p.admissionDate, discharge: p.dischargeDate, reason: p.condition },
      ...(r() < 0.6 ? [{ admit: p.admissionDate - int(r, 200, 700) * DAY, discharge: p.admissionDate - int(r, 190, 199) * DAY, reason: c?.diagnoses[0] ?? "Routine evaluation" }] : []),
    ],
  };
}

export function getTimeline(p: Patient): TimelineEvent[] {
  const r = mulberry32(p.seed ^ 0x7a11);
  const c = CONDITIONS[p.condition];
  const t0 = p.admissionDate;
  const ev: TimelineEvent[] = [];
  const add = (type: TimelineEvent["type"], time: number, title: string, notes: string, attachments: string[] = []) =>
    ev.push({ id: `${p.id}-EV${ev.length + 1}`, type, time, title, doctorId: p.doctorId, notes, attachments });
  add("Registration", t0 - int(r, 2, 6) * HOUR, "Patient registered", `Demographics and insurance verified for ${p.name}.`, ["Registration form.pdf"]);
  add("Admission", t0, `Admitted to ${p.department}`, `Admitted with ${p.condition}. Bed ${p.room}${p.bed !== "—" ? "-" + p.bed : ""}.`);
  add("Consultation", t0 + int(r, 1, 4) * HOUR, "Specialist consultation", `Initial assessment and care plan documented.`);
  (c?.labs ?? []).slice(0, 2).forEach((l, i) => add("Lab Test", t0 + (i + 1) * int(r, 6, 14) * HOUR, l, `${l} sample processed – demo result attached.`, [`${l} report.pdf`]));
  if (c?.xrays.length) add("Imaging", t0 + int(r, 8, 30) * HOUR, `${c.xrays[0][0].toUpperCase() + c.xrays[0].slice(1)} X-ray`, "Radiograph acquired and reviewed.", ["Radiograph.dcm"]);
  (c?.treatments ?? []).slice(0, 2).forEach((t, i) => add("Treatment", t0 + (i + 1) * int(r, 18, 40) * HOUR, t, "Treatment administered as per demonstration protocol."));
  if (p.status === "Discharged" && p.dischargeDate) {
    add("Discharge", p.dischargeDate, "Discharged", "Discharge summary and medication plan provided.", ["Discharge summary.pdf"]);
    add("Follow-up", p.dischargeDate + 7 * DAY, "Follow-up visit", "Review scheduled in outpatient clinic.");
  } else if (p.status === "Outpatient") {
    add("Follow-up", t0 + int(r, 10, 20) * DAY, "Outpatient follow-up", "Clinical review; plan continued.");
  }
  return ev.filter((e) => e.time <= Math.max(p.lastUpdated, t0 + 30 * DAY)).sort((a, b) => a.time - b.time);
}

const XRAY_SRC = {
  chest: { src: "/images/xray/chest-pa.jpg", region: "Chest", view: "PA view" },
  knee: { src: "/images/xray/knee-lateral.jpg", region: "Knee", view: "Lateral view" },
  hand: { src: "/images/xray/hand-pa.jpg", region: "Hand & wrist", view: "PA view" },
  spine: { src: "/images/xray/cervical-lateral.jpg", region: "Cervical spine", view: "Lateral view" },
};

export function getXrays(p: Patient): XrayImage[] {
  const r = mulberry32(p.seed ^ 0x3333);
  const regions = CONDITIONS[p.condition]?.xrays ?? [];
  return regions.map((k, i) => ({
    id: `${p.id}-XR${i + 1}`,
    ...XRAY_SRC[k],
    date: p.admissionDate + (i + 1) * int(r, 6, 40) * HOUR,
    technician: pick(r, ["Radiographer Anil K.", "Radiographer Deepa R.", "Radiographer Sameer T."]),
    findings: pick(r, [
      "Demo image – no acute abnormality annotated.",
      "Demo image – comparison with prior study advised.",
      "Demo image – post-procedure alignment noted.",
      "Demo image – findings to be correlated clinically.",
    ]),
  }));
}

export function getReports(p: Patient): PatientReportDoc[] {
  const r = mulberry32(p.seed ^ 0x4444);
  const c = CONDITIONS[p.condition];
  return (c?.labs ?? ["Complete blood count"]).map((l, i) => ({
    id: `${p.id}-RP${i + 1}`,
    name: l,
    date: p.admissionDate + (i + 1) * int(r, 5, 30) * HOUR,
    type: l.includes("CT") || l.includes("MRI") || l.includes("X-ray") || l.includes("ultrasound") || l.includes("Echo") ? "Imaging" : "Laboratory",
    summary: pick(r, ["Values within demo reference range.", "Mildly deranged values – repeat advised (demo).", "Result reviewed by attending (demo)."]),
  }));
}
