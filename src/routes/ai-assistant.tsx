
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Activity,
  AlertTriangle,
  ArrowUp,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import { useAppState } from "@/store/store";
import { askCareVistaAI } from "@/lib/ai.functions";
import { toast } from "sonner";
import { CareVistaAIOverview } from "@/components/cv/CareVistaAIOverview";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant – CareVista" },
      {
        name: "description",
        content: "CareVista Gemini assistant for patient records, appointments, doctor schedules, medical education and hospital analytics.",
      },
      { property: "og:title", content: "CareVista AI Assistant" },
      { property: "og:description", content: "Hospital intelligence with five AI modules and confirmation-first record changes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AIAssistantPage,
});

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  {
    icon: Users,
    title: "Patient Overview",
    question: "Give me an overview of the current patient population.",
  },
  {
    icon: AlertTriangle,
    title: "Critical Patients",
    question: "How many critical-risk patients are currently in the hospital?",
  },
  {
    icon: CalendarDays,
    title: "Appointments",
    question: "Summarize the current appointment statistics.",
  },
  {
    icon: Activity,
    title: "Hospital Performance",
    question: "Analyze the hospital's current operational performance.",
  },
];

function AIAssistantPage() {
  const s = useAppState();
  const askAI = useServerFn(askCareVistaAI);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const dashboardContext = useMemo(() => {
    const activePatients = s.patients.filter(
      (p) =>
        p.status === "Admitted" ||
        p.status === "Under Observation",
    );

    const criticalPatients = s.patients.filter(
      (p) => p.risk === "Critical",
    );

    const warningPatients = s.patients.filter(
      (p) => p.risk === "Warning",
    );

    const occupiedBeds = s.beds.filter(
      (b) => b.status === "Occupied",
    ).length;

    const availableBeds = s.beds.filter(
      (b) => b.status === "Available",
    ).length;

    const appointmentSummary = {
      total: s.appointments.length,
      scheduled: s.appointments.filter(
        (a) => a.status === "Scheduled",
      ).length,
      completed: s.appointments.filter(
        (a) => a.status === "Completed",
      ).length,
      cancelled: s.appointments.filter(
        (a) => a.status === "Cancelled",
      ).length,
    };

    const departmentSummary = Array.from(
      new Set(s.patients.map((p) => p.department)),
    ).map((department) => {
      const patients = s.patients.filter(
        (p) => p.department === department,
      );

      return {
        department,
        totalPatients: patients.length,
        activePatients: patients.filter(
          (p) =>
            p.status === "Admitted" ||
            p.status === "Under Observation",
        ).length,
        criticalPatients: patients.filter(
          (p) => p.risk === "Critical",
        ).length,
      };
    });

    const openAlerts = s.alerts.filter(
      (a) => a.state !== "resolved",
    );

    const context = {
      dataType: "Synthetic CareVista demonstration data",
      generatedAt: new Date().toISOString(),

      patients: {
        total: s.patients.length,
        active: activePatients.length,
        criticalRisk: criticalPatients.length,
        warningRisk: warningPatients.length,
      },

      doctors: {
        total: s.doctors.length,
        available: s.doctors.filter(
          (d) => d.availability === "Available",
        ).length,
        onLeave: s.doctors.filter(
          (d) => d.availability === "On Leave",
        ).length,
      },

      beds: {
        total: s.beds.length,
        occupied: occupiedBeds,
        available: availableBeds,
        occupancyPercentage:
          s.beds.length > 0
            ? Number(
                ((occupiedBeds / s.beds.length) * 100).toFixed(1),
              )
            : 0,
      },

      appointments: appointmentSummary,

      alerts: {
        total: s.alerts.length,
        open: openAlerts.length,
      },

      departments: departmentSummary,
    };

    return JSON.stringify(context, null, 2);
  }, [
    s.patients,
    s.doctors,
    s.beds,
    s.appointments,
    s.alerts,
  ]);

  const sendMessage = async (question?: string) => {
    const message = (question ?? input).trim();

    if (!message || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: message,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const result = await askAI({
        data: {
          message,
          dashboardContext,
        },
      });

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: result.answer,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("AI Assistant error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to connect to CareVista AI.",
      );
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (loading) return;

    setMessages([]);
    setInput("");

    toast.success("Conversation cleared");
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            Intelligence Tools
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            CareVista AI Assistant
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Intelligent insights powered by your healthcare dashboard data.
          </p>
        </div>

        <Button
          onClick={clearChat}
          disabled={loading || messages.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw className="size-4" />
          New conversation
        </Button>
      </div>

      <CareVistaAIOverview />

      <details className="space-y-4">
        <summary className="cursor-pointer py-3 text-sm font-semibold text-muted-foreground">Executive summary conversation</summary>
      {/* AI Status Cards */}

      <div className="grid gap-3 sm:grid-cols-3">

        <div className="panel flex items-center gap-3 p-4">
          <div className="rounded-xl bg-primary/10 p-3">
            <Bot className="size-5 text-primary" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              AI Assistant
            </p>
            <p className="text-sm font-semibold">
              CareVista Intelligence
            </p>
          </div>
        </div>

        <div className="panel flex items-center gap-3 p-4">
          <div className="rounded-xl bg-ai/10 p-3">
            <Database className="size-5 text-ai" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Dashboard Data
            </p>
            <p className="text-sm font-semibold">
              Connected
            </p>
          </div>
        </div>

        <div className="panel flex items-center gap-3 p-4">
          <div className="rounded-xl bg-info/10 p-3">
            <CheckCircle2 className="size-5 text-info" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Data Protection
            </p>
            <p className="text-sm font-semibold">
              Summary Only
            </p>
          </div>
        </div>

      </div>

      {/* Chat Interface */}

      <div className="panel flex min-h-[620px] flex-col overflow-hidden">

        {/* Chat Header */}

        <div className="flex items-center justify-between border-b border-border p-4">

          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                Healthcare Intelligence
              </h2>

              <p className="text-xs text-muted-foreground">
                Ask questions about your hospital operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ai">
            <span className="size-2 rounded-full bg-ai" />
            Ready
          </div>

        </div>

        {/* Messages */}

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">

          {messages.length === 0 ? (

            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">

              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="size-9 text-primary" />
              </div>

              <h2 className="text-xl font-bold">
                How can I help you today?
              </h2>

              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Ask CareVista AI about patient statistics, doctor
                workload, appointments, bed occupancy and hospital
                performance.
              </p>

              <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">

                {SUGGESTIONS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Button
                      key={item.title}
                      onClick={() => sendMessage(item.question)}
                      disabled={loading}
                      className="group rounded-xl border border-border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" />

                        <span className="text-sm font-semibold">
                          {item.title}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {item.question}
                      </p>
                    </Button>
                  );
                })}

              </div>
            </div>

          ) : (

            messages.map((message) => (

              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                {message.role === "assistant" && (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Bot className="size-5 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/40 text-foreground"
                  }`}
                >

                  {message.role === "user" ? (

                    <p className="whitespace-pre-wrap break-words text-sm leading-7">
                      {message.content}
                    </p>

                  ) : (

                    <div className="
                      prose prose-sm dark:prose-invert max-w-none break-words
                      prose-headings:font-bold prose-headings:text-foreground
                      prose-p:my-2 prose-p:leading-7
                      prose-strong:font-bold prose-strong:text-foreground
                      prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5
                      prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5
                      prose-li:my-1 prose-li:leading-6
                      prose-code:rounded prose-code:bg-muted prose-code:px-1
                      prose-pre:overflow-x-auto
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>

                  )}

                </div>

                {message.role === "user" && (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <MessageSquare className="size-4" />
                  </div>
                )}

              </div>

            ))

          )}

          {/* Loading Animation */}

          {loading && (

            <div className="flex items-center gap-3">

              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <Bot className="size-5 text-primary" />
              </div>

              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">

                <div className="flex items-center gap-2 text-sm text-muted-foreground">

                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                    <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                  </span>

                  Analyzing dashboard data...

                </div>

              </div>

            </div>

          )}

        </div>

        {/* Input Area */}

        <div className="border-t border-border bg-background/50 p-4">

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 transition focus-within:border-primary/60"
          >

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask CareVista AI anything about hospital operations..."
              rows={2}
              maxLength={4000}
              disabled={loading}
              className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />

            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUp className="size-5" />
            </Button>

          </form>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">

            <p className="text-[11px] text-muted-foreground">
              Enter to send · Shift + Enter for a new line
            </p>

            <p className="text-[11px] text-muted-foreground">
              {input.length}/4000
            </p>

          </div>

        </div>

      </div>

      </details>

      {/* Healthcare Disclaimer */}

      <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4">

        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />

        <div>
          <p className="text-xs font-semibold text-foreground">
            Healthcare AI Disclaimer
          </p>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            CareVista AI uses synthetic demonstration dashboard data.
            It provides operational insights only and does not provide
            medical diagnosis, treatment recommendations or emergency
            medical advice. Always consult qualified healthcare
            professionals for clinical decisions.
          </p>
        </div>

      </div>

    </div>
  );
}
