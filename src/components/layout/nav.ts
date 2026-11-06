
import {
  Activity,
  BarChart3,
  BedDouble,
  Bell,
  Bot,
  CalendarDays,
  FileText,
  GitCompareArrows,
  HeartPulse,
  History,
  LayoutDashboard,
  MapPin,
  MonitorPlay,
  ScanSearch,
  Settings,
  SlidersHorizontal,
  Stethoscope,
  Users,
} from "lucide-react";

export const MAIN_NAV = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Doctors", url: "/doctors", icon: Stethoscope },
  { title: "Appointments", url: "/appointments", icon: CalendarDays },
  { title: "Clinical Monitoring", url: "/monitoring", icon: HeartPulse },
  { title: "Beds", url: "/beds", icon: BedDouble },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Notifications", url: "/alerts", icon: Bell },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export const TOOLS_NAV = [
  { title: "Patient Comparison", url: "/compare", icon: GitCompareArrows },
  { title: "Anomaly Detection", url: "/anomalies", icon: ScanSearch },
  { title: "What-if Simulation", url: "/simulation", icon: SlidersHorizontal },
  { title: "Hospital Locations", url: "/locations", icon: MapPin },
  { title: "AI Assistant", url: "/ai-assistant", icon: Bot },
  { title: "Activity Log", url: "/activity", icon: History },
  { title: "Presentation Mode", url: "/present", icon: MonitorPlay },
] as const;

export const ALL_NAV = [...MAIN_NAV, ...TOOLS_NAV];

export { Activity as BrandIcon };
