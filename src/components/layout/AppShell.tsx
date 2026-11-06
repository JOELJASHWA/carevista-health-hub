import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarPlus, ChevronDown, FileText, LogOut, Moon, MonitorPlay, Plus, RotateCcw, Search, Settings, Sun, UserPlus } from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MAIN_NAV, TOOLS_NAV } from "./nav";
import { CommandPalette } from "./CommandPalette";
import { UiProvider, useUi } from "@/components/cv/dialogs";
import { markAllAlertsRead, markAlertRead, resetDemo, updateSettings, useAppState } from "@/store/store";
import { fmtRelative, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Pill, sevTone } from "@/components/cv/common";

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="CareVista home">
      <span className="brand-mark grid size-9 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-glow">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
        </svg>
      </span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-bold tracking-tight">CareVista</span>
          <span className="block text-[10px] text-muted-foreground">Healthcare Intelligence</span>
        </span>
      )}
    </Link>
  );
}

function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const s = useAppState();
  const unread = s.alerts.filter((a) => !a.read && a.state !== "resolved").length;
  const path = useRouterState({ select: (r) => r.location.pathname });
  const active = (url: string) => (url === "/" ? path === "/" : path === url || path.startsWith(url + "/"));
  const close = () => isMobile && setOpenMobile(false);

  const renderItems = (items: readonly { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={active(item.url)} tooltip={item.title} className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_2px_0_0_var(--primary)]">
          <Link to={item.url} onClick={close}>
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        {item.url === "/alerts" && unread > 0 && <SidebarMenuBadge className="bg-critical/15 text-critical">{unread}</SidebarMenuBadge>}
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="h-16 justify-center px-3">
        <Logo collapsed={collapsed} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Command centre</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(MAIN_NAV)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Intelligence tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(TOOLS_NAV)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="rounded-lg border border-sidebar-border bg-background/50 p-2.5 text-[11px] text-muted-foreground leading-snug">
            <p className="font-semibold text-primary flex items-center gap-1.5 mb-1">
              <span className="size-1.5 rounded-full bg-primary" />
              Demo Environment
            </p>
            All patient records and clinical observations are fictional and generated for demonstration purposes. This platform is not connected to live hospital systems and must not be used for clinical decision-making.
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function TopBar() {
  const s = useAppState();
  const ui = useUi();
  const navigate = useNavigate();
  const unreadAlerts = useMemo(() => s.alerts.filter((a) => !a.read && a.state !== "resolved"), [s.alerts]);
  const theme = s.settings.theme;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-5">
      <SidebarTrigger className="size-9" />
      <div className="md:hidden">
        <Logo collapsed />
      </div>
      <button
        onClick={ui.openPalette}
        className="ml-1 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground transition hover:border-primary/40 md:max-w-md"
        aria-label="Search patients, doctors, appointments (Ctrl+K)"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search patients, doctors, alerts…</span>
        <kbd className="num ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <span className="num mr-2 hidden text-xs text-muted-foreground xl:inline">{today}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-9 gap-1 px-2.5 sm:px-3" aria-label="Quick action">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Quick action</span>
              <ChevronDown className="hidden size-3.5 opacity-70 sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => ui.openPatientForm()}><UserPlus className="size-4" />Add patient</DropdownMenuItem>
            <DropdownMenuItem onClick={() => ui.openAppointment()}><CalendarPlus className="size-4" />New appointment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/reports" })}><FileText className="size-4" />Build report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/present" })}><MonitorPlay className="size-4" />Presentation mode</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-9" aria-label={`Notifications, ${unreadAlerts.length} unread`}>
              <Bell className="size-4" />
              {unreadAlerts.length > 0 && (
                <span className="num absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-critical px-1 text-[10px] font-bold text-critical-foreground">{unreadAlerts.length}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { markAllAlertsRead(); toast.success("All notifications marked as read"); }}>Mark all read</Button>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {unreadAlerts.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <button
                    className="flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left hover:bg-muted/50"
                    onClick={() => {
                      markAlertRead(a.id);
                      if (a.patientId) navigate({ to: "/patients/$patientId", params: { patientId: a.patientId } });
                      else navigate({ to: "/alerts" });
                    }}
                  >
                    <Pill tone={sevTone[a.severity]} className="mt-0.5 h-fit">{a.severity}</Pill>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.message}</span>
                      <span className="text-[11px] text-muted-foreground">{fmtRelative(a.time)}</span>
                    </span>
                  </button>
                </li>
              ))}
              {unreadAlerts.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</li>}
            </ul>
            <Link to="/alerts" className="block px-4 py-2.5 text-center text-xs font-semibold text-primary hover:underline">Open notification centre</Link>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          onClick={() => updateSettings({ theme: theme === "dark" ? "light" : "dark" })}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted" aria-label="User menu">
              <span className="brand-mark grid size-8 place-items-center rounded-full text-xs font-bold text-primary-foreground">{initials(s.settings.profile.name)}</span>
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-xs font-semibold">{s.settings.profile.name}</span>
                <span className="block text-[10px] text-muted-foreground">{s.settings.profile.role}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">{s.settings.profile.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="size-4" />Settings & profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/activity" })}><RotateCcw className="size-4" />Activity log</DropdownMenuItem>
            <DropdownMenuSeparator />
            <ResetDemoItem />
            <DropdownMenuItem onClick={() => toast.info("Demo session", { description: "Sign-out is disabled in this demonstration build." })}><LogOut className="size-4" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ResetDemoItem() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}><RotateCcw className="size-4" />Reset demo data</DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
          <AlertDialogDescription>Patients, appointments, alerts and bed changes return to a freshly generated synthetic dataset.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { resetDemo(); toast.success("Demo data reset"); }}>Reset</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useThemeSync() {
  const theme = useAppState().settings.theme;
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
}

export function AppShell({ children }: { children: ReactNode }) {
  useThemeSync();
  return (
    <UiProvider>
      <SidebarProvider>
        <div className="flex min-h-svh w-full">
          <AppSidebar />
          <SidebarInset className={cn("min-w-0 bg-background")}>
            <TopBar />
            <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-5 md:px-6 md:py-7">{children}</main>
          </SidebarInset>
        </div>
        <CommandPalette />
      </SidebarProvider>
    </UiProvider>
  );
}
