
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Send,
  Sparkles,
  Loader2,
  MessageSquare,
  Search,
  Users,
  FileText,
  CalendarDays,
  Stethoscope,
  Activity,
  CheckCircle2,
  XCircle,
  UserRound,
} from "lucide-react";

import {
  useAppState,
  doctorById,
  patientById,
} from "@/store/store";

import { askCareVistaAI } from "@/lib/ai.functions";
import {
  parseCareVistaAction,
  executeCareVistaAction,
  type CareVistaAction,
} from "@/lib/carevista-actions";

import { Button } from "@/components/ui/button";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export function CareVistaAIOverview({ initialQuestions }: { initialQuestions?: readonly string[] } = {}) {
  const s = useAppState();
  const askAI = useServerFn(askCareVistaAI);
  const historyRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hello, I’m CareVista AI. What would you like to know about your hospital today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<CareVistaAction | null>(null);

  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages, loading, pendingAction]);

  // --------------------------------------------------
  // DASHBOARD STATISTICS
  // --------------------------------------------------

  const dashboardContext = useMemo(() => {
    const totalPatients = s.patients.length;

    const activePatients = s.patients.filter(
      (p) => p.status !== "Discharged",
    ).length;

    const criticalPatients = s.patients.filter(
      (p) => p.risk === "Critical",
    ).length;

    const warningPatients = s.patients.filter(
      (p) => p.risk === "Warning",
    ).length;

    const availableDoctors = s.doctors.filter(
      (d) => d.availability === "Available",
    ).length;

    const occupiedBeds = s.beds.filter(
      (b) => b.status === "Occupied",
    ).length;

    const availableBeds = s.beds.filter(
      (b) => b.status === "Available",
    ).length;

    const appointments = {
      total: s.appointments.length,
      scheduled: s.appointments.filter(
        (a) => a.status === "Scheduled",
      ).length,
      confirmed: s.appointments.filter(
        (a) => a.status === "Confirmed",
      ).length,
      completed: s.appointments.filter(
        (a) => a.status === "Completed",
      ).length,
      cancelled: s.appointments.filter(
        (a) => a.status === "Cancelled",
      ).length,
      noShow: s.appointments.filter(
        (a) => a.status === "No-show",
      ).length,
    };

    return JSON.stringify({
      patients: {
        total: totalPatients,
        active: activePatients,
        critical: criticalPatients,
        warning: warningPatients,
      },
      doctors: {
        total: s.doctors.length,
        available: availableDoctors,
      },
      beds: {
        total: s.beds.length,
        occupied: occupiedBeds,
        available: availableBeds,
        reserved: s.beds.filter((b) => b.status === "Reserved").length,
        maintenance: s.beds.filter((b) => b.status === "Maintenance").length,
        occupancyPercentage:
          s.beds.length > 0
            ? Math.round((occupiedBeds / s.beds.length) * 100)
            : 0,
      },
      appointments,
      notifications: {
        totalAlerts: s.alerts.length,
      },
    });
  }, [
    s.patients,
    s.doctors,
    s.beds,
    s.appointments,
    s.alerts,
  ]);

  // --------------------------------------------------
  // MODULE 1: PATIENT RECORDS
  // --------------------------------------------------

  const getPatientRecordsContext = (question: string) => {
    const query = question.toLowerCase();
    const patientIdMatch = question.match(/\bCV-P[\w-]+\b/i);

    let matchingPatients = [...s.patients];

    if (patientIdMatch) {
      const id = patientIdMatch[0].toLowerCase();

      matchingPatients = matchingPatients.filter(
        (p) => p.id.toLowerCase() === id,
      );
    } else {
      const nameMatches = s.patients.filter(
        (p) =>
          p.name.trim().length > 0 &&
          query.includes(p.name.toLowerCase()),
      );

      if (nameMatches.length > 0) {
        matchingPatients = nameMatches;
      } else {
        if (query.includes("admitted") || query.includes("admission")) {
          matchingPatients = matchingPatients.filter(
            (p) => p.status === "Admitted",
          );
        }

        if (query.includes("observation")) {
          matchingPatients = matchingPatients.filter(
            (p) => p.status === "Under Observation",
          );
        }

        if (query.includes("outpatient")) {
          matchingPatients = matchingPatients.filter(
            (p) => p.status === "Outpatient",
          );
        }

        if (query.includes("discharged")) {
          matchingPatients = matchingPatients.filter(
            (p) => p.status === "Discharged",
          );
        }

        if (query.includes("critical") || query.includes("high risk")) {
          matchingPatients = matchingPatients.filter(
            (p) => p.risk === "Critical",
          );
        } else if (query.includes("warning")) {
          matchingPatients = matchingPatients.filter(
            (p) => p.risk === "Warning",
          );
        } else if (query.includes("stable")) {
          matchingPatients = matchingPatients.filter(
            (p) => p.risk === "Stable",
          );
        }

        const departmentMatches = s.patients.filter(
          (p) => query.includes(p.department.toLowerCase()),
        );

        if (departmentMatches.length > 0) {
          matchingPatients = departmentMatches;
        }
      }
    }

    const records = matchingPatients.slice(0, 30).map((p) => {
      const doctor = doctorById(s, p.doctorId);

      return {
        patientId: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        department: p.department,
        condition: p.condition,
        status: p.status,
        risk: p.risk,
        assignedDoctor: doctor?.name ?? "Not assigned",
        doctorSpecialization:
          doctor?.specialization ?? "Not available",
        room: p.room,
        bed: p.bed,
      };
    });

    return JSON.stringify({
      matchingPatientCount: matchingPatients.length,
      recordsReturned: records.length,
      records,
    });
  };

  // --------------------------------------------------
  // MODULE 2: APPOINTMENTS
  // --------------------------------------------------

  const getAppointmentsContext = (question: string) => {
    const query = question.toLowerCase();

    const appointmentId = question.match(/\bAPT-[\w-]+\b/i)?.[0];
    const patientId = question.match(/\bCV-P[\w-]+\b/i)?.[0];

    let matchingAppointments = [...s.appointments];

    if (appointmentId) {
      matchingAppointments = matchingAppointments.filter(
        (a) => a.id.toLowerCase() === appointmentId.toLowerCase(),
      );
    }

    if (patientId) {
      matchingAppointments = matchingAppointments.filter(
        (a) => a.patientId.toLowerCase() === patientId.toLowerCase(),
      );
    }

    const patientNames = s.patients.filter(
      (p) =>
        p.name.trim().length > 0 &&
        query.includes(p.name.toLowerCase()),
    );

    if (patientNames.length > 0) {
      const ids = patientNames.map((p) => p.id);

      matchingAppointments = matchingAppointments.filter(
        (a) => ids.includes(a.patientId),
      );
    }

    const doctorMatches = s.doctors.filter(
      (d) =>
        query.includes(d.name.toLowerCase()) ||
        query.includes(d.specialization.toLowerCase()),
    );

    if (doctorMatches.length > 0) {
      const ids = doctorMatches.map((d) => d.id);

      matchingAppointments = matchingAppointments.filter(
        (a) => ids.includes(a.doctorId),
      );
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);

    if (query.includes("tomorrow")) {
      matchingAppointments = matchingAppointments.filter(
        (a) =>
          a.start >= tomorrow.getTime() &&
          a.start < nextDay.getTime(),
      );
    } else if (query.includes("today")) {
      matchingAppointments = matchingAppointments.filter(
        (a) =>
          a.start >= today.getTime() &&
          a.start < tomorrow.getTime(),
      );
    }

    if (query.includes("no-show") || query.includes("no show")) {
      matchingAppointments = matchingAppointments.filter(
        (a) => a.status === "No-show",
      );
    } else if (query.includes("cancelled") || query.includes("canceled")) {
      matchingAppointments = matchingAppointments.filter(
        (a) => a.status === "Cancelled",
      );
    } else if (query.includes("completed")) {
      matchingAppointments = matchingAppointments.filter(
        (a) => a.status === "Completed",
      );
    } else if (query.includes("confirmed")) {
      matchingAppointments = matchingAppointments.filter(
        (a) => a.status === "Confirmed",
      );
    } else if (query.includes("scheduled")) {
      matchingAppointments = matchingAppointments.filter(
        (a) => a.status === "Scheduled",
      );
    }

    matchingAppointments.sort((a, b) => a.start - b.start);

    const records = matchingAppointments.slice(0, 30).map((a) => {
      const patient = patientById(s, a.patientId);
      const doctor = doctorById(s, a.doctorId);

      return {
        appointmentId: a.id,
        patientId: a.patientId,
        patientName: patient?.name ?? "Patient not found",
        doctorName: doctor?.name ?? "Doctor not found",
        specialization: doctor?.specialization ?? "Not available",
        dateAndTime: new Date(a.start).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        durationMinutes: a.duration,
        type: a.type,
        status: a.status,
      };
    });

    return JSON.stringify({
      matchingAppointmentCount: matchingAppointments.length,
      recordsReturned: records.length,
      appointments: records,
    });
  };

  // --------------------------------------------------
  // MODULE 3: DOCTOR AVAILABILITY
  // --------------------------------------------------

  const getDoctorAvailabilityContext = (question: string) => {
    const query = question.toLowerCase();

    let matchingDoctors = [...s.doctors];

    const nameMatches = s.doctors.filter(
      (d) =>
        query.includes(d.name.toLowerCase()) ||
        query.includes(d.specialization.toLowerCase()),
    );

    if (nameMatches.length > 0) {
      matchingDoctors = nameMatches;
    }

    if (query.includes("on leave")) {
      matchingDoctors = matchingDoctors.filter(
        (d) => d.availability === "On Leave",
      );
    } else if (query.includes("off duty")) {
      matchingDoctors = matchingDoctors.filter(
        (d) => d.availability === "Off Duty",
      );
    } else if (query.includes("in surgery")) {
      matchingDoctors = matchingDoctors.filter(
        (d) => d.availability === "In Surgery",
      );
    } else if (query.includes("available")) {
      matchingDoctors = matchingDoctors.filter(
        (d) => d.availability === "Available",
      );
    }

    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    return JSON.stringify({
      matchingDoctorCount: matchingDoctors.length,
      doctors: matchingDoctors.map((d) => ({
        doctorId: d.id,
        name: d.name,
        specialization: d.specialization,
        qualification: d.qualification,
        experience: d.experience,
        availability: d.availability,
        workingDays: d.workDays.map((day) => weekdays[day]),
        consultingHours: `${d.hours[0]}:00 - ${d.hours[1]}:00`,
        hospitalId: d.hospitalId,
        city: d.city,
      })),
      note:
        "Availability is based on stored demonstration data, not a live scheduling feed.",
    });
  };

  // --------------------------------------------------
  // MODULE 4: MEDICAL KNOWLEDGE
  // --------------------------------------------------

  const medicalKnowledgeContext = `
GENERAL MEDICAL KNOWLEDGE GUIDANCE

Trusted medical education resources:
- World Health Organization: https://www.who.int/
- MedlinePlus: https://medlineplus.gov/
- NHS: https://www.nhs.uk/health-a-to-z/
- CDC: https://www.cdc.gov/

Rules:
- Explain general medical concepts in simple language.
- Provide general health awareness and prevention information.
- Do not diagnose patients or prescribe medication.
- Do not invent medical statistics, research or references.
- Do not claim to have visited these websites live.
- For urgent or serious symptoms, advise appropriate professional medical care.
- Clearly separate general education from actual patient records.
`;

  // --------------------------------------------------
  // MODULE 5: NOTIFICATIONS AND ANALYTICS
  // --------------------------------------------------

  const getAnalyticsContext = () => {
    return JSON.stringify({
      dashboardStatistics: JSON.parse(dashboardContext),
      totalAlerts: s.alerts.length,
      latestAlerts: s.alerts.slice(0, 30),
      note:
        "Only the latest 30 alerts are included. Dashboard information is synthetic demonstration data.",
    });
  };

  // --------------------------------------------------
  // BUILD CONTEXT FOR GEMINI
  // --------------------------------------------------

  const buildCompleteContext = (question: string) => {
    const query = question.toLowerCase();

    const patientIdMatch = /\bCV-P[\w-]+\b/i.test(question);

    const appointmentIdMatch = /\bAPT-[\w-]+\b/i.test(question);

    const patientNameMatch = s.patients.some(
      (p) =>
        p.name.trim().length > 0 &&
        query.includes(p.name.toLowerCase()),
    );

    const patientRelated =
      patientIdMatch ||
      patientNameMatch ||
      [
        "patient",
        "patients",
        "record",
        "admitted",
        "admission",
        "critical",
        "high risk",
        "warning",
        "stable",
        "observation",
        "outpatient",
        "discharged",
        "department",
        "cardiology",
        "room",
      ].some((word) => query.includes(word));

    const appointmentRelated =
      appointmentIdMatch ||
      [
        "appointment",
        "appointments",
        "booking",
        "bookings",
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "canceled",
        "no-show",
        "no show",
        "reschedule",
        "consultation",
        "follow-up",
      ].some((word) => query.includes(word));

    const doctorRelated =
      [
        "doctor",
        "doctors",
        "availability",
        "specialization",
        "specialist",
        "surgeon",
        "working hours",
        "on leave",
        "off duty",
        "in surgery",
      ].some((word) => query.includes(word)) ||
      s.doctors.some(
        (d) =>
          query.includes(d.name.toLowerCase()) ||
          query.includes(d.specialization.toLowerCase()),
      );

    const medicalRelated =
      [
        "medical",
        "health",
        "symptom",
        "symptoms",
        "disease",
        "diseases",
        "medicine",
        "medication",
        "treatment",
        "prevention",
        "diabetes",
        "blood pressure",
        "infection",
        "explain",
      ].some((word) => query.includes(word));

    const analyticsRelated =
      [
        "analytics",
        "statistics",
        "dashboard",
        "alert",
        "alerts",
        "notification",
        "notifications",
        "trend",
        "performance",
        "occupancy",
        "operational",
        "bed",
        "beds",
      ].some((word) => query.includes(word));

    const sections = [
      `DASHBOARD STATISTICS:\n${dashboardContext}`,
    ];

    if (patientRelated) {
      sections.push(
        `PATIENT RECORDS:\n${getPatientRecordsContext(question)}`,
      );
    }

    if (appointmentRelated) {
      sections.push(
        `APPOINTMENTS:\n${getAppointmentsContext(question)}`,
      );
    }

    if (doctorRelated) {
      sections.push(
        `DOCTOR AVAILABILITY:\n${getDoctorAvailabilityContext(question)}`,
      );
    }

    if (medicalRelated) {
      sections.push(`MEDICAL KNOWLEDGE:\n${medicalKnowledgeContext}`);
    }

    if (analyticsRelated) {
      sections.push(
        `NOTIFICATIONS AND ANALYTICS:\n${getAnalyticsContext()}`,
      );
    }

    sections.push(`
IMPORTANT INSTRUCTIONS:
- Use only the supplied hospital data for hospital-specific facts.
- Never invent patients, appointments, doctors, alerts or statistics.
- Clearly report when a requested record is not found.
- Include patient IDs and appointment IDs when relevant.
- Do not claim stored doctor availability is live availability.
- Medical answers are general education, not diagnosis or treatment.
- Do not invent medical references or claim live website access.
- Do not modify hospital records in a normal AI answer.
- Never claim an operation succeeded unless the application executed it.
- Explain results in simple professional language.
- This application uses synthetic demonstration data.
`);

    return sections.join("\n\n");
  };

  // --------------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------------

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || loading || pendingAction) return;

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        role: "user",
        content: question,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      // First check whether this is an action command.
      const actionResult = parseCareVistaAction(question);

      if (actionResult) {
        if ("error" in actionResult) {
          setMessages((previous) => [
            ...previous,
            {
              id: Date.now() + 1,
              role: "assistant",
              content: actionResult.error,
            },
          ]);

          return;
        }

        setPendingAction(actionResult.action);

        setMessages((previous) => [
          ...previous,
          {
            id: Date.now() + 1,
            role: "assistant",
            content:
              "I've prepared the requested operation. Review the details below. No changes have been made yet.",
          },
        ]);

        return;
      }

      // Otherwise, ask Gemini for a normal answer.
      const completeContext = buildCompleteContext(question);

      const result = await askAI({
        data: {
          message: question,
          dashboardContext: completeContext,
        },
      });

      if (!result.success || !result.answer) {
        throw new Error("The AI returned an empty response.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 2,
          role: "assistant",
          content: result.answer,
        },
      ]);
    } catch (error) {
      console.error("CareVista AI error:", error);

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 3,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Unable to get an AI response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // CONFIRM ACTION
  // --------------------------------------------------

  const confirmPendingAction = () => {
    if (!pendingAction || actionBusy) return;

    setActionBusy(true);

    try {
      const result = executeCareVistaAction(pendingAction);

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 4,
          role: "assistant",
          content: `Success: ${result}`,
        },
      ]);

      setPendingAction(null);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 5,
          role: "assistant",
          content:
            error instanceof Error
              ? `Action failed: ${error.message}`
              : "Action failed. Please try again.",
        },
      ]);
    } finally {
      setActionBusy(false);
    }
  };

  // --------------------------------------------------
  // CANCEL ACTION
  // --------------------------------------------------

  const cancelPendingAction = () => {
    if (actionBusy) return;

    setPendingAction(null);

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now() + 6,
        role: "assistant",
        content: "Operation cancelled. No changes were made.",
      },
    ]);
  };

  // --------------------------------------------------
  // QUICK QUESTIONS
  // --------------------------------------------------

  const quickQuestions = initialQuestions ?? [
    `Find patient ${s.patients[0]?.id ?? "CV-P1001"}`,
    "Show admitted patients",
    "Find patients in Cardiology",
    "Show today's appointments",
    "Show confirmed appointments",
    "Check doctor availability",
    "Show doctors on leave",
    "Explain diabetes",
    "Summarize hospital notifications",
    "Analyze bed occupancy",
    "Analyze patient statistics",
  ];

  // --------------------------------------------------
  // USER INTERFACE
  // --------------------------------------------------

  return (
    <section className="ai-workspace overflow-hidden" aria-label="CareVista AI assistant">
      {/* HEADER */}
      <div className="ai-header flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-ai/15 text-ai shadow-sm">
            <Bot className="size-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                CareVista AI
              </h2>
              <Sparkles className="size-4 text-ai" />
            </div>

            <p className="text-xs text-muted-foreground">
              CareVista Intelligence · Gemini
            </p>
          </div>
        </div>

        <span className="flex items-center gap-2 text-xs font-medium text-ai">
          <span className="size-2 rounded-full bg-ai" />
          Review-first actions
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* FIVE MODULES */}
        <div className="module-strip">
          {[
            {
              title: "Patient Records",
              description: "Search, create and update patient records",
              icon: Search,
            },
            {
              title: "Appointments",
              description: "Book, confirm and reschedule appointments",
              icon: CalendarDays,
            },
            {
              title: "Doctor Availability",
              description: "Check and update doctor availability",
              icon: Stethoscope,
            },
            {
              title: "Medical Knowledge",
              description: "General medical information and education",
              icon: FileText,
            },
            {
              title: "Notifications & Analytics",
              description: "Review alerts and hospital performance",
              icon: Activity,
            },
          ].map((module) => {
            const Icon = module.icon;

            return (
              <div
                key={module.title}
                className="ai-module"
              >
                <div className="flex size-6 shrink-0 items-center justify-center text-ai">
                  <Icon className="size-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {module.title}
                  </p>

                </div>
              </div>
            );
          })}
        </div>

        {/* QUICK QUESTIONS */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">
              Suggested questions
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question) => (
              <Button
                variant="outline"
                key={question}
                type="button"
                disabled={loading || !!pendingAction}
                onClick={() => setInput(question)}
                className="h-auto whitespace-normal px-3 py-2 text-xs"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>

        {/* CHAT MESSAGES */}
        <div ref={historyRef} role="log" aria-live="polite" className="chat-history space-y-3 rounded-lg bg-background/50 p-3 sm:p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ai/10 text-ai"><Bot className="size-4" /></span>}
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "ai-bubble rounded-bl-sm"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary">
                    <Bot className="size-3.5" />
                    CareVista AI
                  </div>
                )}

                {message.role === "assistant" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : message.content}
              </div>
              {message.role === "user" && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><UserRound className="size-4" /></span>}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Retrieving information...
              </div>
            </div>
          )}
        </div>

        {/* ACTION CONFIRMATION */}
        {pendingAction && (
          <div className="action-review p-4" role="region" aria-label="Proposed hospital operation">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />

              <p className="text-sm font-bold text-foreground">
                Confirm hospital operation
              </p>
            </div>

            <dl className="mb-3 grid gap-2 text-xs sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Action type</dt><dd className="mt-1 font-semibold">{({createPatient: "Create patient", updatePatient: "Update patient", saveAppointment: "Appointment change", updateDoctor: "Doctor availability", acknowledgeAlert: "Acknowledge alert", resolveAlert: "Resolve alert"})[pendingAction.kind]}</dd></div>
              <div><dt className="text-muted-foreground">Target record</dt><dd className="mt-1 font-semibold">{"id" in pendingAction && pendingAction.id ? pendingAction.id : pendingAction.kind === "createPatient" ? pendingAction.payload.name : pendingAction.kind === "saveAppointment" ? pendingAction.payload.patientId : "New record"}</dd></div>
            </dl>
            <p className="mb-4 text-sm leading-6 text-foreground">{pendingAction.summary}</p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={actionBusy}
                onClick={confirmPendingAction}
                className="gap-2"
              >
                {actionBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}

                {actionBusy ? "Processing..." : "Confirm"}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={actionBusy}
                onClick={cancelPendingAction}
                className="gap-2"
              >
                <XCircle className="size-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* MESSAGE INPUT */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <MessageSquare className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              aria-label="Message CareVista AI"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about patients, appointments, doctors or medical topics..."
              disabled={loading || !!pendingAction}
              maxLength={4000}
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
            />
          </div>

          <Button
            aria-label="Send message"
            type="submit"
            disabled={!input.trim() || loading || !!pendingAction}
            className="h-11 shrink-0 gap-2 rounded-xl px-4"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}

            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>

        <p className="text-[10px] text-muted-foreground">
          CareVista AI provides operational assistance and general medical
          education. This demonstration uses synthetic local data. Supported
          actions require confirmation. Medical information is not a diagnosis
          or treatment recommendation.
        </p>
      </div>
    </section>
  );
}
