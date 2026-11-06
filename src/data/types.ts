export type Risk = "Critical" | "Warning" | "Stable";
export type PatientStatus = "Admitted" | "Under Observation" | "Outpatient" | "Discharged";
export type Availability = "Available" | "In Surgery" | "On Leave" | "Off Duty";
export type Gender = "Male" | "Female";

export interface Hospital {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  beds: number;
  departments: string[];
}

export interface Doctor {
  id: string;
  name: string;
  gender: Gender;
  photo: string;
  qualification: string;
  specialization: string;
  experience: number;
  hospitalId: string;
  city: string;
  availability: Availability;
  bio: string;
  email: string;
  phone: string;
  workDays: number[]; // 0=Sun
  hours: [number, number];
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  bloodGroup: string;
  doctorId: string;
  department: string;
  condition: string;
  admissionDate: number;
  dischargeDate?: number;
  status: PatientStatus;
  risk: Risk;
  room: string;
  bed: string;
  hospitalId: string;
  lastUpdated: number;
  phone: string;
  seed: number;
}

export interface Reading {
  t: number;
  hr: number;
  sys: number;
  dia: number;
  spo2: number;
  temp: number;
  rr: number;
}

export type VitalKey = "hr" | "sys" | "dia" | "spo2" | "temp" | "rr";

export type AppointmentStatus = "Scheduled" | "Confirmed" | "Completed" | "Cancelled" | "No-show";
export type AppointmentType = "Consultation" | "Follow-up" | "Lab Review" | "Procedure" | "Tele-consult";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  start: number;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string;
}

export type BedStatus = "Occupied" | "Available" | "Reserved" | "Maintenance";

export interface Bed {
  id: string;
  department: string;
  floor: number;
  room: string;
  label: string;
  status: BedStatus;
  patientId?: string;
}

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertCategory =
  | "Critical"
  | "Warning"
  | "Informational"
  | "Appointment"
  | "Admission"
  | "Discharge"
  | "Abnormal Vitals";
export type AlertState = "open" | "acknowledged" | "resolved";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  patientId?: string;
  doctorId?: string;
  time: number;
  read: boolean;
  state: AlertState;
  note?: string;
  history: { time: number; action: string; note?: string }[];
}

export interface Activity {
  id: string;
  time: number;
  type: string;
  description: string;
  patientId?: string;
  doctorId?: string;
}

export interface Encounter {
  id: string;
  department: string;
  doctorId: string;
  admit: number;
  discharge?: number;
  age: number;
  gender: Gender;
  risk: Risk;
}

export interface Thresholds {
  hr: [number, number];
  sys: [number, number];
  dia: [number, number];
  spo2: [number, number];
  temp: [number, number];
  rr: [number, number];
}

export interface WidgetPref {
  id: string;
  visible: boolean;
}

export interface Settings {
  theme: "dark" | "light";
  thresholds: Thresholds;
  notifications: Record<"critical" | "warning" | "info" | "appointments" | "toasts", boolean>;
  profile: { name: string; role: string; email: string };
  widgets: WidgetPref[];
  compactCharts: boolean;
}

export interface TimelineEvent {
  id: string;
  type: "Registration" | "Admission" | "Consultation" | "Lab Test" | "Imaging" | "Treatment" | "Follow-up" | "Discharge";
  time: number;
  title: string;
  doctorId: string;
  notes: string;
  attachments: string[];
}

export interface MedicalHistory {
  diagnoses: { name: string; year: number; status: string }[];
  allergies: { name: string; severity: string }[];
  medications: { name: string; dose: string; frequency: string }[];
  treatments: { name: string; date: number; outcome: string }[];
  surgeries: { name: string; year: number; hospital: string }[];
  notes: { time: number; author: string; text: string }[];
  admissions: { admit: number; discharge?: number; reason: string }[];
}

export interface XrayImage {
  id: string;
  src: string;
  region: string;
  view: string;
  date: number;
  technician: string;
  findings: string;
}

export interface PatientReportDoc {
  id: string;
  name: string;
  date: number;
  type: string;
  summary: string;
}
