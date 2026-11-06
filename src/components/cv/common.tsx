import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Expand, FlaskConical, Inbox, Minus, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import type { AlertSeverity, Availability, AppointmentStatus, BedStatus, PatientStatus, Risk } from "@/data/types";

export const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        critical: "border-critical/30 bg-critical/12 text-critical",
        warning: "border-warning/30 bg-warning/12 text-warning",
        success: "border-success/30 bg-success/12 text-success",
        info: "border-info/30 bg-info/12 text-info",
        primary: "border-primary/30 bg-primary/12 text-primary",
        muted: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export type Tone = NonNullable<VariantProps<typeof pillVariants>["tone"]>;

export function Pill({ tone, children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn(pillVariants({ tone }), className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const riskTone = (r: Risk): Tone => (r === "Critical" ? "critical" : r === "Warning" ? "warning" : "success");
export const RiskBadge = ({ risk }: { risk: Risk }) => (
  <Pill tone={riskTone(risk)} dot>
    {risk}
  </Pill>
);

const statusTone: Record<PatientStatus, Tone> = { Admitted: "info", "Under Observation": "warning", Outpatient: "primary", Discharged: "muted" };
export const StatusBadge = ({ status }: { status: PatientStatus }) => <Pill tone={statusTone[status]}>{status}</Pill>;

const availTone: Record<Availability, Tone> = { Available: "success", "In Surgery": "warning", "On Leave": "critical", "Off Duty": "muted" };
export const AvailabilityBadge = ({ a }: { a: Availability }) => (
  <Pill tone={availTone[a]} dot>
    {a}
  </Pill>
);

const apptTone: Record<AppointmentStatus, Tone> = { Scheduled: "info", Confirmed: "primary", Completed: "success", Cancelled: "muted", "No-show": "critical" };
export const ApptBadge = ({ s }: { s: AppointmentStatus }) => <Pill tone={apptTone[s]}>{s}</Pill>;

export const bedTone: Record<BedStatus, Tone> = { Occupied: "info", Available: "success", Reserved: "warning", Maintenance: "critical" };
export const sevTone: Record<AlertSeverity, Tone> = { critical: "critical", warning: "warning", info: "info" };

export function PatientAvatar({ name, seed, size = "md" }: { name: string; seed: number; size?: "sm" | "md" | "lg" | "xl" }) {
  const tones = ["bg-chart-1/20 text-chart-1", "bg-chart-2/20 text-chart-2", "bg-chart-3/20 text-chart-3", "bg-chart-5/20 text-chart-5", "bg-chart-6/20 text-chart-6"];
  const sz = { sm: "size-8 text-[11px]", md: "size-10 text-xs", lg: "size-14 text-base", xl: "size-20 text-xl" }[size];
  return (
    <div className={cn("grid shrink-0 place-items-center rounded-full font-bold ring-1 ring-border", tones[seed % tones.length], sz)} aria-hidden>
      {initials(name)}
    </div>
  );
}

export function DoctorPhoto({ src, name, size = "md", className }: { src: string; name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sz = { sm: "size-8", md: "size-10", lg: "size-16", xl: "size-24" }[size];
  return <img src={src} alt={`Portrait of ${name} (fictional demo profile)`} className={cn("shrink-0 rounded-full object-cover ring-2 ring-border", sz, className)} loading="lazy" width={96} height={96} />;
}

export function PageHeader({ title, description, crumbs, actions }: { title: string; description?: string; crumbs?: { label: string; to?: string }[]; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            CareVista
          </Link>
          {(crumbs ?? [{ label: title }]).map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="opacity-50">/</span>
              {c.to ? (
                <Link to={c.to} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground/80">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-2xl font-semibold md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const kpiTone: Record<Tone, string> = {
  critical: "text-critical bg-critical/12",
  warning: "text-warning bg-warning/12",
  success: "text-success bg-success/12",
  info: "text-info bg-info/12",
  primary: "text-primary bg-primary/12",
  muted: "text-muted-foreground bg-muted",
};

export function KpiCard({ label, value, sub, icon: Icon, tone = "primary", onClick, delta }: { label: string; value: ReactNode; sub?: ReactNode; icon: LucideIcon; tone?: Tone; onClick?: () => void; delta?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel group flex w-full flex-col gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", kpiTone[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="num text-[28px] leading-none font-semibold">{value}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{sub}</span>
        {delta !== undefined ? <Trend change={delta} /> : <ArrowRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />}
      </div>
    </button>
  );
}

export function Trend({ change, invert }: { change: number; invert?: boolean }) {
  const flat = Math.abs(change) < 1.5;
  const up = change > 0;
  const good = invert ? !up : up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("num inline-flex items-center gap-0.5 text-xs font-semibold", flat ? "text-muted-foreground" : good ? "text-success" : "text-warning")}>
      <Icon className="size-3.5" />
      {flat ? "Stable" : `${Math.abs(change).toFixed(1)}%`}
    </span>
  );
}

export function Panel({ title, description, actions, children, className, expandable, bodyClassName }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; expandable?: boolean; bodyClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={cn("panel flex min-w-0 flex-col", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="no-print flex items-center gap-1.5">
            {actions}
            {expandable && (
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen(true)} aria-label="Expand chart">
                <Expand className="size-3.5" />
              </Button>
            )}
          </div>
        </header>
      )}
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
      {expandable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[min(96vw,1200px)]">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="h-[65vh] min-h-[320px] [&_.chart-box]:!h-full">{children}</div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

export function EmptyState({ title = "Nothing to show", description, icon: Icon = Inbox, action }: { title?: string; description?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export const DEMO_DISCLAIMER_TEXT =
  "Demo Environment – All patient records and clinical observations are fictional and generated for demonstration purposes. This platform is not connected to live hospital systems and must not be used for clinical decision-making.";

export function DemoNote({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      role="note"
      aria-label="Demo environment disclaimer"
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs text-foreground/85 backdrop-blur-sm transition-colors",
        className
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
        <FlaskConical className="size-3.5" />
      </span>
      <p className="min-w-0 flex-1 leading-relaxed">
        <strong className="font-semibold text-primary">Demo Environment</strong>
        <span className="text-muted-foreground mx-1.5">–</span>
        <span>
          All patient records and clinical observations are fictional and generated for demonstration purposes. This platform is not connected to live hospital systems and must not be used for clinical decision-making.
        </span>
        {children && (
          <span className="ml-1.5 text-muted-foreground font-normal">
            ({children})
          </span>
        )}
      </p>
    </div>
  );
}

export function StatTile({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: "critical" | "warning" | "default" }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface px-3 py-2">
      <div className="eyebrow !text-[10px]">{label}</div>
      <div className={cn("num mt-0.5 text-lg font-semibold", tone === "critical" && "text-critical", tone === "warning" && "text-warning")}>
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function ChartTooltipBox({ active, payload, label, labelFormatter, unitMap }: { active?: boolean; payload?: { name?: string; value?: number | string; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }[]; label?: string | number; labelFormatter?: (l: string | number) => string; unitMap?: Record<string, string> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-semibold text-popover-foreground">{label !== undefined && labelFormatter ? labelFormatter(label) : label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="num ml-auto pl-3 font-semibold text-popover-foreground">
            {typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}
            {unitMap?.[String(p.dataKey)] ? ` ${unitMap[String(p.dataKey)]}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, size = "sm" }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: "sm" | "xs" }) {
  return (
    <div role="tablist" className="inline-flex flex-wrap rounded-lg border border-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]",
            value === o.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
