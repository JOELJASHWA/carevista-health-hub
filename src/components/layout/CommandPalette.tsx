import { useNavigate } from "@tanstack/react-router";
import { Bell, Building2, CalendarDays, CalendarPlus, FileText, Moon, Stethoscope, User, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useUi } from "@/components/cv/dialogs";
import { updateSettings, useAppState } from "@/store/store";
import { DEPARTMENTS } from "@/data/conditions";
import { ALL_NAV } from "./nav";
import { fmtDateTime } from "@/lib/format";

export function CommandPalette() {
  const ui = useUi();
  const s = useAppState();
  const navigate = useNavigate();
  const open = ui.paletteOpen;
  const setOpen = ui.setPaletteOpen;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  const docName = (id: string) => s.doctors.find((d) => d.id === id)?.name ?? "";
  const patName = (id?: string) => s.patients.find((p) => p.id === id)?.name ?? "";

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search patients, doctors, appointments, departments, alerts…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No matching records in the demo dataset.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go(() => ui.openPatientForm())}><UserPlus />Add patient</CommandItem>
          <CommandItem onSelect={() => go(() => ui.openAppointment())}><CalendarPlus />New appointment</CommandItem>
          <CommandItem onSelect={() => go(() => updateSettings({ theme: s.settings.theme === "dark" ? "light" : "dark" }))}><Moon />Toggle theme</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Navigate">
          {ALL_NAV.map((n) => (
            <CommandItem key={n.url} value={`go ${n.title}`} onSelect={() => go(() => navigate({ to: n.url }))}>
              <n.icon />
              {n.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Patients">
          {s.patients.map((p) => (
            <CommandItem key={p.id} value={`patient ${p.name} ${p.id} ${p.condition}`} onSelect={() => go(() => navigate({ to: "/patients/$patientId", params: { patientId: p.id } }))}>
              <User />
              <span>{p.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{p.id} · {p.department}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Doctors">
          {s.doctors.map((d) => (
            <CommandItem key={d.id} value={`doctor ${d.name} ${d.specialization} ${d.city}`} onSelect={() => go(() => navigate({ to: "/doctors/$doctorId", params: { doctorId: d.id } }))}>
              <Stethoscope />
              <span>{d.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{d.specialization} · {d.city}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Departments">
          {DEPARTMENTS.map((d) => (
            <CommandItem key={d} value={`department ${d}`} onSelect={() => go(() => navigate({ to: "/patients", search: { department: d } }))}>
              <Building2 />
              {d}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Upcoming appointments">
          {s.appointments.filter((a) => a.start >= Date.now() - 86400000 && a.status !== "Cancelled").slice(0, 15).map((a) => (
            <CommandItem key={a.id} value={`appointment ${a.id} ${patName(a.patientId)} ${docName(a.doctorId)}`} onSelect={() => go(() => ui.openAppointment({ id: a.id }))}>
              <CalendarDays />
              <span>{patName(a.patientId)} · {a.type}</span>
              <span className="ml-auto text-xs text-muted-foreground">{fmtDateTime(a.start)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Open alerts">
          {s.alerts.filter((a) => a.state !== "resolved").slice(0, 10).map((a) => (
            <CommandItem key={a.id} value={`alert ${a.title} ${patName(a.patientId)} ${a.id}`} onSelect={() => go(() => navigate({ to: "/alerts" }))}>
              <Bell />
              <span>{a.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">{patName(a.patientId)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Reports">
          {["Patient summary", "Department census", "Appointment report", "Vital-sign statistics"].map((r) => (
            <CommandItem key={r} value={`report ${r}`} onSelect={() => go(() => navigate({ to: "/reports" }))}>
              <FileText />
              {r}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
