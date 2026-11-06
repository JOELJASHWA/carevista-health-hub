import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Database,
  Moon,
  RotateCcw,
  Sliders,
  Sun,
  User,
  SlidersHorizontal,
} from "lucide-react";
import {
  DemoNote,
  PageHeader,
  Panel,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  resetDemo,
  setThresholds,
  setWidgets,
  updateSettings,
  useAppState,
} from "@/store/store";
import { DEFAULT_THRESHOLDS } from "@/data/vitals";
import type { Thresholds, WidgetPref } from "@/data/types";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & System Preferences – CareVista" },
      { name: "description", content: "Clinical thresholds, notification preferences, dashboard widgets, and demo profile configuration." },
      { property: "og:title", content: "Settings – CareVista" },
      { property: "og:description", content: "Theme, profile, dashboard and notification preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useAppState();
  const [profile, setProfile] = useState(s.settings.profile);
  const [thresholds, setLocalThresholds] = useState<Thresholds>(s.settings.thresholds);
  const [notifs, setNotifs] = useState(s.settings.notifications);
  const [widgets, setLocalWidgets] = useState<WidgetPref[]>(s.settings.widgets);

  const saveProfile = () => {
    updateSettings({ profile });
    toast.success("Profile updated", {
      description: `Active user: ${profile.name} (${profile.role})`,
    });
  };

  const saveThresholds = () => {
    setThresholds(thresholds);
    toast.success("Clinical thresholds updated", {
      description: "Hemodynamic bounds saved and recalculated across all patient views.",
    });
  };

  const resetThresholds = () => {
    setLocalThresholds(DEFAULT_THRESHOLDS);
    setThresholds(DEFAULT_THRESHOLDS);
    toast.info("Clinical thresholds restored to medical default baselines");
  };

  const toggleNotif = (key: keyof typeof notifs) => {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    updateSettings({ notifications: next });
    toast.success("Notification preferences saved");
  };

  const toggleWidget = (id: string) => {
    const next = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    setLocalWidgets(next);
    setWidgets(next);
    toast.success("Dashboard widget layout updated");
  };

  const handleResetDemo = () => {
    resetDemo();
    toast.success("Demonstration database reset to pristine baseline");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Platform Preferences"
        description="Configure hemodynamic alert boundaries, user profile metadata, overview widgets, and theme mode."
        crumbs={[{ label: "Settings" }]}
      />
      <DemoNote />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Theme & Appearance */}
        <Panel title="Appearance & Interface Theme" description="Select dark mode or daylight theme">
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-semibold text-sm text-foreground">Theme Mode</p>
              <p className="text-xs text-muted-foreground">Dark mode is default for clinical telemetry dashboards</p>
            </div>
            <div className="flex rounded-lg border border-border/80 p-0.5 bg-surface/50">
              <Button
                variant={s.settings.theme === "dark" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => updateSettings({ theme: "dark" })}
              >
                <Moon className="size-3.5" />
                Dark
              </Button>
              <Button
                variant={s.settings.theme === "light" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => updateSettings({ theme: "light" })}
              >
                <Sun className="size-3.5" />
                Light
              </Button>
            </div>
          </div>
        </Panel>

        {/* Profile Information */}
        <Panel title="Practitioner Profile Metadata" description="Attending user account credentials">
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Clinician Name</label>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Clinical Role</label>
                <Input value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Email Address</label>
                <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={saveProfile}>
                Save Profile
              </Button>
            </div>
          </div>
        </Panel>

        {/* Configurable Clinical Alert Thresholds */}
        <Panel
          title="Clinical Telemetry Threshold Boundaries"
          description="Boundaries triggering Critical and Warning flags across all telemetry feeds"
          className="lg:col-span-2"
          actions={
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetThresholds}>
              <RotateCcw className="size-3 mr-1" />
              Reset Baselines
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-3">
            {/* Heart Rate */}
            <div className="rounded-lg border border-border/70 bg-surface/60 p-3 space-y-2">
              <span className="font-semibold text-xs text-foreground block">Heart Rate (BPM)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px]">Min (Bradycardia)</span>
                  <Input
                    type="number"
                    value={thresholds.hr[0]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, hr: [Number(e.target.value), thresholds.hr[1]] })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Max (Tachycardia)</span>
                  <Input
                    type="number"
                    value={thresholds.hr[1]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, hr: [thresholds.hr[0], Number(e.target.value)] })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Systolic BP */}
            <div className="rounded-lg border border-border/70 bg-surface/60 p-3 space-y-2">
              <span className="font-semibold text-xs text-foreground block">Systolic BP (mmHg)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px]">Min (Hypotension)</span>
                  <Input
                    type="number"
                    value={thresholds.sys[0]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, sys: [Number(e.target.value), thresholds.sys[1]] })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Max (Hypertension)</span>
                  <Input
                    type="number"
                    value={thresholds.sys[1]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, sys: [thresholds.sys[0], Number(e.target.value)] })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Diastolic BP */}
            <div className="rounded-lg border border-border/70 bg-surface/60 p-3 space-y-2">
              <span className="font-semibold text-xs text-foreground block">Diastolic BP (mmHg)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px]">Min (Hypotension)</span>
                  <Input
                    type="number"
                    value={thresholds.dia[0]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, dia: [Number(e.target.value), thresholds.dia[1]] })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Max (Hypertension)</span>
                  <Input
                    type="number"
                    value={thresholds.dia[1]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, dia: [thresholds.dia[0], Number(e.target.value)] })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Oxygen Saturation */}
            <div className="rounded-lg border border-border/70 bg-surface/60 p-3 space-y-2">
              <span className="font-semibold text-xs text-foreground block">SpO₂ Oxygen Saturation (%)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px]">Min (Hypoxemia)</span>
                  <Input
                    type="number"
                    value={thresholds.spo2[0]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, spo2: [Number(e.target.value), thresholds.spo2[1]] })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Normal Max</span>
                  <Input
                    type="number"
                    value={thresholds.spo2[1]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, spo2: [thresholds.spo2[0], Number(e.target.value)] })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Body Temperature */}
            <div className="rounded-lg border border-border/70 bg-surface/60 p-3 space-y-2">
              <span className="font-semibold text-xs text-foreground block">Body Temperature (°C)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px]">Min (Hypothermia)</span>
                  <Input
                    type="number"
                    step={0.1}
                    value={thresholds.temp[0]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, temp: [Number(e.target.value), thresholds.temp[1]] })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Max (Pyrexia)</span>
                  <Input
                    type="number"
                    step={0.1}
                    value={thresholds.temp[1]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, temp: [thresholds.temp[0], Number(e.target.value)] })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="rounded-lg border border-border/70 bg-surface/60 p-3 space-y-2">
              <span className="font-semibold text-xs text-foreground block">Respiratory Rate (bpm)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px]">Min (Bradypnea)</span>
                  <Input
                    type="number"
                    value={thresholds.rr[0]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, rr: [Number(e.target.value), thresholds.rr[1]] })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Max (Tachypnea)</span>
                  <Input
                    type="number"
                    value={thresholds.rr[1]}
                    onChange={(e) => setLocalThresholds({ ...thresholds, rr: [thresholds.rr[0], Number(e.target.value)] })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border/60 mt-4">
            <Button onClick={saveThresholds}>Save Threshold Boundaries</Button>
          </div>
        </Panel>

        {/* Notification Preferences */}
        <Panel title="Notification Toggles" description="Control toast banners and audible escalation alerts">
          <div className="divide-y divide-border/60 pt-1 text-xs">
            <div className="flex items-center justify-between py-2.5">
              <div>
                <p className="font-semibold text-foreground">Critical Telemetry Alerts</p>
                <p className="text-muted-foreground">Notify on hemodynamic threshold breaches</p>
              </div>
              <Switch checked={notifs.critical} onCheckedChange={() => toggleNotif("critical")} />
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div>
                <p className="font-semibold text-foreground">Warning Acuity Flags</p>
                <p className="text-muted-foreground">Notify on rising patient risk trajectories</p>
              </div>
              <Switch checked={notifs.warning} onCheckedChange={() => toggleNotif("warning")} />
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div>
                <p className="font-semibold text-foreground">Appointment Bookings & Reschedules</p>
                <p className="text-muted-foreground">Alert when clinical consultations are created</p>
              </div>
              <Switch checked={notifs.appointments} onCheckedChange={() => toggleNotif("appointments")} />
            </div>
          </div>
        </Panel>

        {/* Demo Management & Reset */}
        <Panel title="Demonstration Database Reset" description="Restore pristine initial state and seed data">
          <div className="pt-2 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              CareVista uses local browser storage to persist any added patients, booked appointments, and acknowledged alerts. If you wish to wipe test modifications and return to the original 20-patient, 10-doctor baseline:
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-critical/40 text-critical hover:bg-critical/10 text-xs">
                  <RotateCcw className="size-3.5 mr-1.5" />
                  Reset Demonstration Dataset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Demonstration Database?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all registered demonstration patients, created appointments, and local customizations, restoring the baseline CareVista demonstration configuration.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetDemo} className="bg-critical text-critical-foreground">
                    Reset Baseline Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Panel>
      </div>
    </div>
  );
}
