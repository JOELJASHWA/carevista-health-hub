import { useSyncExternalStore } from "react";
import { buildSeed, DOCTORS, isActiveStatus, type SeedState } from "@/data/seed";
import { HOUR, hashString } from "@/data/rng";
import type {
  Activity,
  AlertItem,
  Appointment,
  BedStatus,
  Doctor,
  Patient,
  Settings,
  Thresholds,
  WidgetPref,
} from "@/data/types";
import { DEFAULT_THRESHOLDS } from "@/data/vitals";

export const DEFAULT_WIDGETS: WidgetPref[] = [
  "admissions",
  "department",
  "risk",
  "occupancy",
  "appointments",
  "workload",
  "demographics",
  "recent",
  "upcoming",
  "critical",
  "activity",
  "performance",
  "beds",
].map((id) => ({ id, visible: true }));

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  thresholds: DEFAULT_THRESHOLDS,
  notifications: { critical: true, warning: true, info: true, appointments: true, toasts: true },
  profile: { name: "Dr. Nandini Rao", role: "Medical Director (Demo)", email: "nandini.rao@carevista.demo" },
  widgets: DEFAULT_WIDGETS,
  compactCharts: false,
};

export interface AppState extends SeedState {
  settings: Settings;
  ackAnomalies: string[];
  version: number;
}

const KEY = "carevista:v1";
const THEME_KEY = "carevista:theme";

let state: AppState | null = null;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function fresh(): AppState {
  return { ...buildSeed(Date.now()), settings: DEFAULT_SETTINGS, ackAnomalies: [], version: 1 };
}

function load(): AppState {
  if (typeof window === "undefined") return fresh();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 1 && parsed.patients?.length) {
        parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        const known = new Set(parsed.settings.widgets.map((w) => w.id));
        parsed.settings.widgets = [...parsed.settings.widgets, ...DEFAULT_WIDGETS.filter((w) => !known.has(w.id))];
        return parsed;
      }
    }
  } catch {
    /* corrupted demo data – rebuild */
  }
  return fresh();
}

export function getState(): AppState {
  if (!state) state = load();
  return state;
}

function setState(fn: (s: AppState) => AppState) {
  state = fn(getState());
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(state));
        window.localStorage.setItem(THEME_KEY, state!.settings.theme);
      } catch {
        /* storage full – ignore in demo */
      }
    }, 250);
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/* ---------------- helpers ---------------- */

export const doctorById = (s: AppState, id: string) => s.doctors.find((d) => d.id === id);
export const patientById = (s: AppState, id: string) => s.patients.find((p) => p.id === id);

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}${(counter++).toString(36).toUpperCase()}`;

function activity(s: AppState, a: Omit<Activity, "id" | "time">): Activity[] {
  return [{ ...a, id: uid("ACT"), time: Date.now() }, ...s.activity].slice(0, 400);
}

/* ---------------- patients ---------------- */

export type PatientInput = Pick<Patient, "name" | "age" | "gender" | "bloodGroup" | "doctorId" | "condition" | "status" | "risk" | "phone">;

function assignBed(s: AppState, p: Patient): { beds: AppState["beds"]; patient: Patient } {
  let beds = s.beds.map((b) => (b.patientId === p.id ? { ...b, patientId: undefined, status: "Available" as BedStatus } : b));
  let patient = { ...p, room: "—", bed: "—" };
  if (isActiveStatus(p.status)) {
    const keep = s.beds.find((b) => b.patientId === p.id && b.department === p.department);
    const target = keep ?? beds.find((b) => b.department === p.department && b.status === "Available");
    if (target) {
      beds = beds.map((b) => (b.id === target.id ? { ...b, status: "Occupied", patientId: p.id } : b));
      patient = { ...patient, room: target.room, bed: target.label };
    }
  }
  return { beds, patient };
}

export function addPatient(input: PatientInput): Patient {
  const s = getState();
  const doc = doctorById(s, input.doctorId) ?? DOCTORS[0];
  const max = Math.max(...s.patients.map((p) => Number(p.id.replace("CV-P", ""))));
  const id = `CV-P${max + 1}`;
  const base: Patient = {
    ...input,
    id,
    department: doc.specialization,
    hospitalId: doc.hospitalId,
    admissionDate: Date.now(),
    lastUpdated: Date.now(),
    room: "—",
    bed: "—",
    seed: hashString(id + input.name + Date.now()),
  };
  const { beds, patient } = assignBed(s, base);
  setState((st) => ({
    ...st,
    beds,
    patients: [...st.patients, patient],
    encounters: [...st.encounters, { id: `ENC-${id}`, department: patient.department, doctorId: patient.doctorId, admit: patient.admissionDate, age: patient.age, gender: patient.gender, risk: patient.risk }],
    activity: activity(st, { type: "Patient created", description: `${patient.name} registered (${id})`, patientId: id, doctorId: patient.doctorId }),
  }));
  return patient;
}

export function updatePatient(id: string, patch: Partial<PatientInput>) {
  const s = getState();
  const cur = patientById(s, id);
  if (!cur) return;
  const doc = doctorById(s, patch.doctorId ?? cur.doctorId)!;
  const next: Patient = {
    ...cur,
    ...patch,
    department: doc.specialization,
    hospitalId: doc.hospitalId,
    lastUpdated: Date.now(),
    dischargeDate: patch.status === "Discharged" && cur.status !== "Discharged" ? Date.now() : cur.dischargeDate,
  };
  const { beds, patient } = assignBed(s, next);
  setState((st) => ({
    ...st,
    beds,
    patients: st.patients.map((p) => (p.id === id ? patient : p)),
    activity: activity(st, { type: "Patient updated", description: `${patient.name} record updated`, patientId: id, doctorId: patient.doctorId }),
  }));
}

/* ---------------- doctors ---------------- */

export function updateDoctor(id: string, patch: Partial<Pick<Doctor, "availability" | "phone" | "email" | "bio">>) {
  setState((st) => {
    const d = doctorById(st, id);
    return {
      ...st,
      doctors: st.doctors.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      activity: activity(st, { type: "Doctor profile updated", description: `${d?.name} profile updated${patch.availability ? ` – now ${patch.availability}` : ""}`, doctorId: id }),
    };
  });
}

/* ---------------- appointments ---------------- */

export type AppointmentInput = Omit<Appointment, "id">;

export function validateAppointment(s: AppState, a: AppointmentInput, ignoreId?: string): string | null {
  const doc = doctorById(s, a.doctorId);
  const pat = patientById(s, a.patientId);
  if (!doc) return "Select a doctor.";
  if (!pat) return "Select a patient.";
  if (a.status === "Cancelled") return null;
  if (doc.availability === "On Leave") return `${doc.name} is on leave and cannot take appointments (demo availability).`;
  const d = new Date(a.start);
  if (!doc.workDays.includes(d.getDay())) return `${doc.name} does not consult on ${d.toLocaleDateString("en-IN", { weekday: "long" })}.`;
  const startH = d.getHours() + d.getMinutes() / 60;
  const endH = startH + a.duration / 60;
  if (startH < doc.hours[0] || endH > doc.hours[1]) return `Outside ${doc.name}'s consulting hours (${doc.hours[0]}:00–${doc.hours[1]}:00).`;
  const end = a.start + a.duration * 60_000;
  for (const o of s.appointments) {
    if (o.id === ignoreId || o.status === "Cancelled") continue;
    const oEnd = o.start + o.duration * 60_000;
    if (a.start < oEnd && end > o.start) {
      if (o.doctorId === a.doctorId) return `Conflict: ${doc.name} already has ${o.id} at ${new Date(o.start).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`;
      if (o.patientId === a.patientId) return `Conflict: ${pat.name} already has an appointment (${o.id}) at that time.`;
    }
  }
  return null;
}

export function saveAppointment(a: AppointmentInput, id?: string): { ok: true; id: string } | { ok: false; error: string } {
  const s = getState();
  const err = validateAppointment(s, a, id);
  if (err) return { ok: false, error: err };
  const pat = patientById(s, a.patientId)!;
  if (id) {
    const prev = s.appointments.find((x) => x.id === id);
    const moved = prev && prev.start !== a.start;
    setState((st) => ({
      ...st,
      appointments: st.appointments.map((x) => (x.id === id ? { ...a, id } : x)).sort((x, y) => x.start - y.start),
      activity: activity(st, { type: moved ? "Appointment rescheduled" : "Appointment updated", description: `${id} for ${pat.name}${moved ? ` moved to ${new Date(a.start).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ` – ${a.status}`}`, patientId: a.patientId, doctorId: a.doctorId }),
    }));
    return { ok: true, id };
  }
  const nid = `APT-${String(s.appointments.length + 1).padStart(4, "0")}-${(counter++).toString(36).toUpperCase()}`;
  setState((st) => ({
    ...st,
    appointments: [...st.appointments, { ...a, id: nid }].sort((x, y) => x.start - y.start),
    activity: activity(st, { type: "Appointment created", description: `${a.type} for ${pat.name} (${nid})`, patientId: a.patientId, doctorId: a.doctorId }),
    alerts: st.settings.notifications.appointments
      ? [newAlert({ severity: "info", category: "Appointment", title: `New ${a.type.toLowerCase()} booked`, message: `${pat.name} on ${new Date(a.start).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`, patientId: a.patientId, doctorId: a.doctorId, time: Date.now() }), ...st.alerts]
      : st.alerts,
  }));
  return { ok: true, id: nid };
}

/* ---------------- alerts ---------------- */

function newAlert(a: Omit<AlertItem, "id" | "read" | "state" | "history">): AlertItem {
  return { ...a, id: uid("ALT"), read: false, state: "open", history: [{ time: a.time, action: "Alert generated (demo)" }] };
}

function patchAlert(id: string, fn: (a: AlertItem) => AlertItem, log?: string) {
  setState((st) => {
    const a = st.alerts.find((x) => x.id === id);
    return {
      ...st,
      alerts: st.alerts.map((x) => (x.id === id ? fn(x) : x)),
      activity: log && a ? activity(st, { type: log, description: `${a.title} (${a.id})`, patientId: a.patientId }) : st.activity,
    };
  });
}

export const markAlertRead = (id: string, read = true) => patchAlert(id, (a) => ({ ...a, read }));
export const acknowledgeAlert = (id: string) =>
  patchAlert(id, (a) => ({ ...a, read: true, state: a.state === "resolved" ? a.state : "acknowledged", history: [...a.history, { time: Date.now(), action: "Acknowledged" }] }), "Alert acknowledged");
export const resolveAlert = (id: string, note: string) =>
  patchAlert(id, (a) => ({ ...a, read: true, state: "resolved", note, history: [...a.history, { time: Date.now(), action: "Resolved", note }] }), "Alert resolved");
export const markAllAlertsRead = () => setState((st) => ({ ...st, alerts: st.alerts.map((a) => ({ ...a, read: true })) }));

/* ---------------- beds ---------------- */

export function setBedStatus(id: string, status: BedStatus): string | null {
  const b = getState().beds.find((x) => x.id === id);
  if (!b) return "Bed not found";
  if (b.patientId) return "This bed is occupied. Discharge or move the patient from their profile first.";
  if (status === "Occupied") return "Assign a patient from their profile to occupy a bed.";
  setState((st) => ({
    ...st,
    beds: st.beds.map((x) => (x.id === id ? { ...x, status } : x)),
    activity: activity(st, { type: "Bed status changed", description: `Bed ${b.room}-${b.label} set to ${status}` }),
  }));
  return null;
}

/* ---------------- misc ---------------- */

export const ackAnomaly = (key: string) =>
  setState((st) => ({ ...st, ackAnomalies: [...st.ackAnomalies, key], activity: activity(st, { type: "Anomaly acknowledged", description: `Demo anomaly ${key} acknowledged`, patientId: key.split("|")[0] }) }));

export const logActivity = (a: Omit<Activity, "id" | "time">) => setState((st) => ({ ...st, activity: activity(st, a) }));

export const updateSettings = (patch: Partial<Settings>) => setState((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
export const setThresholds = (t: Thresholds) => updateSettings({ thresholds: t });
export const setWidgets = (w: WidgetPref[]) => updateSettings({ widgets: w });

export function resetDemo() {
  const theme = getState().settings.theme;
  const f = fresh();
  setState(() => ({ ...f, settings: { ...f.settings, theme } }));
}

export function dataAge(s: AppState) {
  return Math.round((Date.now() - s.anchor) / HOUR);
}
