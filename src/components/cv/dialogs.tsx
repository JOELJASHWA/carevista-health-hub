import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONDITIONS } from "@/data/conditions";
import type { Appointment, AppointmentStatus, AppointmentType, PatientStatus, Risk } from "@/data/types";
import { addPatient, getState, saveAppointment, updatePatient, useAppState, validateAppointment, type AppointmentInput, type PatientInput } from "@/store/store";
import { fromInputs, toInputDate, toInputTime } from "@/lib/format";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface UiCtx {
  openPatientForm: (id?: string) => void;
  openAppointment: (opts?: { id?: string; prefill?: Partial<AppointmentInput> }) => void;
  openPalette: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
}

const Ctx = createContext<UiCtx | null>(null);
export const useUi = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUi outside provider");
  return c;
};

export function UiProvider({ children }: { children: ReactNode }) {
  const [patientForm, setPatientForm] = useState<{ open: boolean; id?: string }>({ open: false });
  const [appt, setAppt] = useState<{ open: boolean; id?: string; prefill?: Partial<AppointmentInput> }>({ open: false });
  const [paletteOpen, setPaletteOpen] = useState(false);
  return (
    <Ctx.Provider
      value={{
        openPatientForm: (id) => setPatientForm({ open: true, id }),
        openAppointment: (o) => setAppt({ open: true, ...o }),
        openPalette: () => setPaletteOpen(true),
        paletteOpen,
        setPaletteOpen,
      }}
    >
      {children}
      <PatientFormDialog key={`pf-${patientForm.id ?? "new"}-${patientForm.open}`} open={patientForm.open} id={patientForm.id} onOpenChange={(o) => setPatientForm((s) => ({ ...s, open: o }))} />
      <AppointmentDialog key={`ap-${appt.id ?? "new"}-${appt.open}`} open={appt.open} id={appt.id} prefill={appt.prefill} onOpenChange={(o) => setAppt((s) => ({ ...s, open: o }))} />
    </Ctx.Provider>
  );
}

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUSES: PatientStatus[] = ["Admitted", "Under Observation", "Outpatient", "Discharged"];
const RISKS: Risk[] = ["Critical", "Warning", "Stable"];

function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function PatientFormDialog({ open, id, onOpenChange }: { open: boolean; id?: string; onOpenChange: (o: boolean) => void }) {
  const s = useAppState();
  const navigate = useNavigate();
  const existing = id ? s.patients.find((p) => p.id === id) : undefined;
  const [form, setForm] = useState<PatientInput>(
    existing
      ? { name: existing.name, age: existing.age, gender: existing.gender, bloodGroup: existing.bloodGroup, doctorId: existing.doctorId, condition: existing.condition, status: existing.status, risk: existing.risk, phone: existing.phone }
      : { name: "", age: 40, gender: "Female", bloodGroup: "O+", doctorId: s.doctors[0].id, condition: "Type 2 diabetes mellitus", status: "Admitted", risk: "Stable", phone: "+91 98" },
  );
  const [error, setError] = useState<string | null>(null);
  const doc = s.doctors.find((d) => d.id === form.doctorId);
  const conditions = Object.entries(CONDITIONS).filter(([, c]) => c.department === doc?.specialization).map(([k]) => k);

  useEffect(() => {
    if (doc && !conditions.includes(form.condition)) setForm((f) => ({ ...f, condition: conditions[0] }));
  }, [form.doctorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (form.name.trim().length < 3) return setError("Enter the patient's full name (min. 3 characters).");
    if (!(form.age >= 0 && form.age <= 110)) return setError("Age must be between 0 and 110.");
    setError(null);
    if (existing) {
      updatePatient(existing.id, { ...form, name: form.name.trim() });
      toast.success("Patient record updated", { description: `${form.name} · changes reflected across all views.` });
    } else {
      const p = addPatient({ ...form, name: form.name.trim() });
      toast.success("Patient added", { description: `${p.name} (${p.id})${p.room !== "—" ? ` · Bed ${p.room}-${p.bed}` : ""}` });
      navigate({ to: "/patients/$patientId", params: { patientId: p.id } });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${existing.name}` : "Add patient"}</DialogTitle>
          <DialogDescription>Synthetic demo record. Department, hospital and bed follow the assigned doctor.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full name" htmlFor="pname">
              <Input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kiran Patel" />
            </Field>
          </div>
          <Field label="Age" htmlFor="page">
            <Input id="page" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as PatientInput["gender"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Blood group">
            <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BLOOD.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Phone (demo)" htmlFor="pphone">
            <Input id="pphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Assigned doctor">
              <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{s.doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.specialization}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Medical condition">
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{conditions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PatientStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Risk level (demo)">
            <Select value={form.risk} onValueChange={(v) => setForm({ ...form, risk: v as Risk })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISKS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        {error && <p className="flex items-center gap-1.5 text-sm text-critical"><AlertTriangle className="size-4" />{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{existing ? "Save changes" : "Add patient"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TYPES: AppointmentType[] = ["Consultation", "Follow-up", "Lab Review", "Procedure", "Tele-consult"];
const ASTATUS: AppointmentStatus[] = ["Scheduled", "Confirmed", "Completed", "Cancelled", "No-show"];

function AppointmentDialog({ open, id, prefill, onOpenChange }: { open: boolean; id?: string; prefill?: Partial<AppointmentInput>; onOpenChange: (o: boolean) => void }) {
  const s = useAppState();
  const existing: Appointment | undefined = id ? s.appointments.find((a) => a.id === id) : undefined;
  const initialStart = existing?.start ?? prefill?.start ?? nextSlot();
  const firstPatient = s.patients.find((p) => p.id === prefill?.patientId) ?? s.patients[0];
  const [form, setForm] = useState({
    patientId: existing?.patientId ?? firstPatient.id,
    doctorId: existing?.doctorId ?? prefill?.doctorId ?? firstPatient.doctorId,
    date: toInputDate(initialStart),
    time: toInputTime(initialStart),
    duration: existing?.duration ?? 30,
    type: existing?.type ?? prefill?.type ?? ("Consultation" as AppointmentType),
    status: existing?.status ?? ("Scheduled" as AppointmentStatus),
    notes: existing?.notes ?? "",
  });
  const [confirming, setConfirming] = useState(false);

  const input: AppointmentInput = { patientId: form.patientId, doctorId: form.doctorId, start: fromInputs(form.date, form.time), duration: Number(form.duration), type: form.type, status: form.status, notes: form.notes };
  const issue = form.date && form.time ? validateAppointment(getState(), input, id) : "Choose a date and time.";
  const patient = s.patients.find((p) => p.id === form.patientId);
  const history = s.appointments.filter((a) => a.patientId === form.patientId && a.id !== id).slice(-4).reverse();

  const submit = () => {
    const res = saveAppointment(input, id);
    if (!res.ok) {
      toast.error("Appointment not saved", { description: res.error });
      setConfirming(false);
      return;
    }
    toast.success(id ? "Appointment updated" : "Appointment created", { description: `${res.id} · ${patient?.name}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${existing.id}` : "New appointment"}</DialogTitle>
          <DialogDescription>Conflicts and doctor availability are validated before saving.</DialogDescription>
        </DialogHeader>
        {confirming ? (
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">Confirm appointment</p>
            <p className="text-muted-foreground">
              {form.type} for <b className="text-foreground">{patient?.name}</b> with <b className="text-foreground">{s.doctors.find((d) => d.id === form.doctorId)?.name}</b> on{" "}
              <b className="text-foreground">{new Date(input.start).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}</b> ({form.duration} min) · {form.status}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Patient">
              <Select value={form.patientId} onValueChange={(v) => { const p = s.patients.find((x) => x.id === v); setForm({ ...form, patientId: v, doctorId: existing ? form.doctorId : p?.doctorId ?? form.doctorId }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{s.patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.id}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Doctor">
              <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{s.doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.availability})</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Date" htmlFor="adate"><Input id="adate" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Time" htmlFor="atime"><Input id="atime" type="time" step={900} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
            <Field label="Duration">
              <Select value={String(form.duration)} onValueChange={(v) => setForm({ ...form, duration: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[15, 30, 45, 60].map((m) => <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AppointmentType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AppointmentStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASTATUS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes" htmlFor="anotes"><Textarea id="anotes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <div className="sm:col-span-2">
              {issue ? (
                <p className="flex items-start gap-1.5 rounded-md border border-critical/30 bg-critical/10 px-3 py-2 text-xs text-critical"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{issue}</p>
              ) : (
                <p className="flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success"><CheckCircle2 className="size-3.5" />Slot available – no conflicts found.</p>
              )}
            </div>
            {history.length > 0 && (
              <div className="sm:col-span-2">
                <p className="eyebrow mb-1.5">Patient appointment history</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {history.map((h) => (
                    <li key={h.id} className="flex justify-between gap-2"><span>{h.id} · {h.type}</span><span className="num">{new Date(h.start).toLocaleDateString("en-IN")} · {h.status}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          {confirming ? (
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Back</Button>
              <Button onClick={submit}>Confirm & save</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={!!issue} onClick={() => setConfirming(true)}>Review</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function nextSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0);
  return d.getTime();
}
