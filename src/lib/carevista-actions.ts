
import {
  getState,
  addPatient,
  updatePatient,
  saveAppointment,
  updateDoctor,
  acknowledgeAlert,
  resolveAlert,
  type PatientInput,
  type AppointmentInput,
} from "@/store/store";

type DoctorAvailability =
  | "Available"
  | "In Surgery"
  | "On Leave"
  | "Off Duty";

export type CareVistaAction =
  | {
      kind: "createPatient";
      summary: string;
      payload: PatientInput;
    }
  | {
      kind: "updatePatient";
      summary: string;
      id: string;
      payload: Partial<PatientInput>;
    }
  | {
      kind: "saveAppointment";
      summary: string;
      payload: AppointmentInput;
      id?: string;
    }
  | {
      kind: "updateDoctor";
      summary: string;
      id: string;
      availability: DoctorAvailability;
    }
  | {
      kind: "acknowledgeAlert";
      summary: string;
      id: string;
    }
  | {
      kind: "resolveAlert";
      summary: string;
      id: string;
      note: string;
    };

export type ActionParseResult =
  | { action: CareVistaAction }
  | { error: string }
  | null;

// Read values such as name="Arun Kumar" or age=35.
function getValue(command: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern = new RegExp(
    `(?:^|\\s)${escapedKey}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|'[^']*'|\\S+)`,
    "i",
  );

  const match = command.match(pattern);
  if (!match) return undefined;

  const value = match[1];

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseDateTime(
  date?: string,
  time?: string,
): number | null {
  if (!date || !time) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const result = new Date(year, month - 1, day, hour, minute);

  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }

  return result.getTime();
}

function getAppointmentInput(
  command: string,
  existing?: AppointmentInput,
): AppointmentInput | string {
  const state = getState();

  const patientId =
    getValue(command, "patient") ??
    getValue(command, "patientId") ??
    existing?.patientId;

  const doctorId =
    getValue(command, "doctor") ??
    getValue(command, "doctorId") ??
    existing?.doctorId;

  const date = getValue(command, "date");
  const time = getValue(command, "time");

  let start = existing?.start;

  if (date || time) {
    const parsed = parseDateTime(date, time);

    if (parsed === null) {
      return "Use date=YYYY-MM-DD and time=HH:mm.";
    }

    start = parsed;
  }

  if (!patientId || !doctorId || start === undefined) {
    return (
      "Missing appointment details. Provide patient, doctor, date and time. " +
      "Example: book appointment patient=CV-P1001 doctor=DOC-001 " +
      "date=2026-11-07 time=10:00"
    );
  }

  const patient = state.patients.find((p) => p.id === patientId);
  const doctor = state.doctors.find((d) => d.id === doctorId);

  if (!patient) return `Patient ${patientId} was not found.`;
  if (!doctor) return `Doctor ${doctorId} was not found.`;

  const durationValue = getValue(command, "duration");
  const duration = durationValue
    ? Number(durationValue)
    : existing?.duration ?? 30;

  if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
    return "Appointment duration must be between 5 and 480 minutes.";
  }

  const allowedTypes = [
    "Consultation",
    "Follow-up",
    "Lab Review",
    "Procedure",
    "Tele-consult",
  ];

  const type = getValue(command, "type") ?? existing?.type ?? "Consultation";

  if (!allowedTypes.includes(type)) {
    return `Appointment type must be: ${allowedTypes.join(", ")}.`;
  }

  const allowedStatuses = [
    "Scheduled",
    "Confirmed",
    "Completed",
    "Cancelled",
    "No-show",
  ];

  const status =
    getValue(command, "status") ?? existing?.status ?? "Scheduled";

  if (!allowedStatuses.includes(status)) {
    return `Appointment status must be: ${allowedStatuses.join(", ")}.`;
  }

  return {
    patientId,
    doctorId,
    start,
    duration,
    type: type as AppointmentInput["type"],
    status: status as AppointmentInput["status"],
    notes:
      getValue(command, "notes") ??
      existing?.notes ??
      "Appointment created through CareVista AI.",
  };
}

export function parseCareVistaAction(
  command: string,
): ActionParseResult {
  const query = command.trim();

  // Patient deletion is not supported by the existing store.
  if (/^(delete|remove)\s+patient\b/i.test(query)) {
    return {
      error:
        "Patient deletion is not supported by the current store. No changes were made.",
    };
  }

  // CREATE PATIENT
  if (/^(create|add)\s+patient\b/i.test(query)) {
    const name = getValue(query, "name");
    const ageValue = getValue(query, "age");
    const age = Number(ageValue);
    const gender = getValue(query, "gender");
    const bloodGroup = getValue(query, "bloodGroup");
    const doctorId = getValue(query, "doctorId");
    const condition = getValue(query, "condition");
    const status = getValue(query, "status");
    const risk = getValue(query, "risk");
    const phone = getValue(query, "phone");

    if (
      !name ||
      !ageValue ||
      !Number.isInteger(age) ||
      age < 0 ||
      age > 120 ||
      !gender ||
      !bloodGroup ||
      !doctorId ||
      !condition ||
      !status ||
      !risk ||
      !phone
    ) {
      return {
        error:
          'Provide name, age, gender, bloodGroup, doctorId, condition, status, risk and phone. Example: create patient name="Arun Kumar" age=35 gender=Male bloodGroup=O+ doctorId=DOC-001 condition="Fever" status=Admitted risk=Stable phone=9876543210',
      };
    }

    if (!["Male", "Female"].includes(gender)) {
      return { error: "Gender must be Male or Female." };
    }

    if (
      !["Admitted", "Under Observation", "Outpatient", "Discharged"].includes(
        status,
      )
    ) {
      return { error: "Invalid patient status." };
    }

    if (!["Critical", "Warning", "Stable"].includes(risk)) {
      return { error: "Risk must be Critical, Warning or Stable." };
    }

    const doctor = getState().doctors.find((d) => d.id === doctorId);

    if (!doctor) {
      return { error: `Doctor ${doctorId} was not found.` };
    }

    const payload: PatientInput = {
      name,
      age,
      gender: gender as PatientInput["gender"],
      bloodGroup,
      doctorId,
      condition,
      status: status as PatientInput["status"],
      risk: risk as PatientInput["risk"],
      phone,
    };

    return {
      action: {
        kind: "createPatient",
        summary: `Create patient ${name}, age ${age}, assigned to ${doctor.name}, status ${status}, risk ${risk}.`,
        payload,
      },
    };
  }

  // UPDATE PATIENT
  if (/^(update|edit)\s+patient\b/i.test(query)) {
    const id = query.match(/\bCV-P[\w-]+\b/i)?.[0];

    if (!id) {
      return { error: "Provide a patient ID, for example CV-P1001." };
    }

    const patch: Partial<PatientInput> = {};

    const name = getValue(query, "name");
    const ageValue = getValue(query, "age");
    const gender = getValue(query, "gender");
    const bloodGroup = getValue(query, "bloodGroup");
    const doctorId = getValue(query, "doctorId");
    const condition = getValue(query, "condition");
    const status = getValue(query, "status");
    const risk = getValue(query, "risk");
    const phone = getValue(query, "phone");

    if (name !== undefined) patch.name = name;

    if (ageValue !== undefined) {
      const age = Number(ageValue);

      if (!Number.isInteger(age) || age < 0 || age > 120) {
        return { error: "Age must be a number between 0 and 120." };
      }

      patch.age = age;
    }

    if (gender !== undefined) {
      if (!["Male", "Female"].includes(gender)) {
        return { error: "Gender must be Male or Female." };
      }

      patch.gender = gender as PatientInput["gender"];
    }

    if (bloodGroup !== undefined) patch.bloodGroup = bloodGroup;
    if (doctorId !== undefined) patch.doctorId = doctorId;
    if (condition !== undefined) patch.condition = condition;
    if (phone !== undefined) patch.phone = phone;

    if (status !== undefined) {
      if (
        !["Admitted", "Under Observation", "Outpatient", "Discharged"].includes(
          status,
        )
      ) {
        return { error: "Invalid patient status." };
      }

      patch.status = status as PatientInput["status"];
    }

    if (risk !== undefined) {
      if (!["Critical", "Warning", "Stable"].includes(risk)) {
        return { error: "Risk must be Critical, Warning or Stable." };
      }

      patch.risk = risk as PatientInput["risk"];
    }

    if (Object.keys(patch).length === 0) {
      return {
        error:
          'Provide at least one field to update. Example: update patient CV-P1001 risk=Warning condition="Recovering"',
      };
    }

    const patient = getState().patients.find((p) => p.id === id);

    if (!patient) return { error: `Patient ${id} was not found.` };

    if (patch.doctorId) {
      const doctor = getState().doctors.find((d) => d.id === patch.doctorId);

      if (!doctor) return { error: `Doctor ${patch.doctorId} was not found.` };
    }

    return {
      action: {
        kind: "updatePatient",
        id,
        payload: patch,
        summary: `Update patient ${id}: ${Object.entries(patch)
          .map(([key, value]) => `${key} = ${value}`)
          .join(", ")}.`,
      },
    };
  }

  // CANCEL APPOINTMENT
  if (/^cancel\s+appointment\b/i.test(query)) {
    const id = query.match(/\bAPT-[\w-]+\b/i)?.[0];

    if (!id) return { error: "Provide an appointment ID, such as APT-0001." };

    const appointment = getState().appointments.find((a) => a.id === id);

    if (!appointment) return { error: `Appointment ${id} was not found.` };

    const { id: appointmentId, ...existing } = appointment;

    return {
      action: {
        kind: "saveAppointment",
        id: appointmentId,
        payload: { ...existing, status: "Cancelled" },
        summary: `Cancel appointment ${id} for patient ${appointment.patientId}.`,
      },
    };
  }

  // RESCHEDULE APPOINTMENT
  if (/^reschedule\s+appointment\b/i.test(query)) {
    const id = query.match(/\bAPT-[\w-]+\b/i)?.[0];

    if (!id) return { error: "Provide an appointment ID." };

    const appointment = getState().appointments.find((a) => a.id === id);

    if (!appointment) return { error: `Appointment ${id} was not found.` };

    const { id: appointmentId, ...existing } = appointment;
    const payload = getAppointmentInput(query, existing);

    if (typeof payload === "string") return { error: payload };

    return {
      action: {
        kind: "saveAppointment",
        id: appointmentId,
        payload,
        summary: `Reschedule ${id} to ${new Date(payload.start).toLocaleString("en-IN")}.`,
      },
    };
  }

  // BOOK APPOINTMENT
  if (/^(book|create|add)\s+appointment\b/i.test(query)) {
    const payload = getAppointmentInput(query);

    if (typeof payload === "string") return { error: payload };

    const patient = getState().patients.find(
      (p) => p.id === payload.patientId,
    );
    const doctor = getState().doctors.find(
      (d) => d.id === payload.doctorId,
    );

    return {
      action: {
        kind: "saveAppointment",
        payload,
        summary: `Book ${payload.type} for ${patient?.name} with ${doctor?.name} on ${new Date(payload.start).toLocaleString("en-IN")}, duration ${payload.duration} minutes.`,
      },
    };
  }

  // CONFIRM APPOINTMENT
  if (/^confirm\s+appointment\b/i.test(query)) {
    const id = query.match(/\bAPT-[\w-]+\b/i)?.[0];

    if (!id) return { error: "Provide an appointment ID." };

    const appointment = getState().appointments.find((a) => a.id === id);

    if (!appointment) return { error: `Appointment ${id} was not found.` };

    const { id: appointmentId, ...existing } = appointment;

    return {
      action: {
        kind: "saveAppointment",
        id: appointmentId,
        payload: { ...existing, status: "Confirmed" },
        summary: `Confirm appointment ${id}.`,
      },
    };
  }

  // UPDATE DOCTOR AVAILABILITY
  if (/^(set|update)\s+doctor\b/i.test(query)) {
    const id =
      getValue(query, "doctorId") ??
      query.match(/\bDOC-[\w-]+\b/i)?.[0];

    const availability = getValue(query, "availability");

    if (!id || !availability) {
      return {
        error:
          'Provide doctorId and availability. Example: set doctor doctorId=DOC-001 availability="On Leave"',
      };
    }

    const allowed: DoctorAvailability[] = [
      "Available",
      "In Surgery",
      "On Leave",
      "Off Duty",
    ];

    if (!allowed.includes(availability as DoctorAvailability)) {
      return { error: `Availability must be: ${allowed.join(", ")}.` };
    }

    const doctor = getState().doctors.find((d) => d.id === id);

    if (!doctor) return { error: `Doctor ${id} was not found.` };

    return {
      action: {
        kind: "updateDoctor",
        id,
        availability: availability as DoctorAvailability,
        summary: `Change Dr. ${doctor.name}'s availability from ${doctor.availability} to ${availability}.`,
      },
    };
  }

  // ACKNOWLEDGE ALERT
  if (/^acknowledge\s+alert\b/i.test(query)) {
    const id = getValue(query, "id");

    if (!id) {
      return { error: "Provide an alert ID using id=ALERT-ID." };
    }

    const alert = getState().alerts.find((a) => a.id === id);

    if (!alert) return { error: `Alert ${id} was not found.` };

    return {
      action: {
        kind: "acknowledgeAlert",
        id,
        summary: `Acknowledge alert "${alert.title}" (${id}).`,
      },
    };
  }

  // RESOLVE ALERT
  if (/^resolve\s+alert\b/i.test(query)) {
    const id = getValue(query, "id");
    const note = getValue(query, "note");

    if (!id || !note) {
      return {
        error:
          'Provide alert ID and resolution note. Example: resolve alert id=ALT-001 note="Issue checked and resolved"',
      };
    }

    const alert = getState().alerts.find((a) => a.id === id);

    if (!alert) return { error: `Alert ${id} was not found.` };

    return {
      action: {
        kind: "resolveAlert",
        id,
        note,
        summary: `Resolve alert "${alert.title}" (${id}). Note: ${note}.`,
      },
    };
  }

  return null;
}

// This function must only be called after user confirmation.
export function executeCareVistaAction(
  action: CareVistaAction,
): string {
  const state = getState();

  switch (action.kind) {
    case "createPatient": {
      const patient = addPatient(action.payload);
      return `Patient created successfully. Patient ID: ${patient.id}.`;
    }

    case "updatePatient": {
      if (!state.patients.some((p) => p.id === action.id)) {
        throw new Error(`Patient ${action.id} no longer exists.`);
      }

      updatePatient(action.id, action.payload);
      return `Patient ${action.id} updated successfully.`;
    }

    case "saveAppointment": {
      const result = saveAppointment(action.payload, action.id);

      if (!result.ok) throw new Error(result.error);

      return action.id
        ? `Appointment ${result.id} updated successfully.`
        : `Appointment booked successfully. Appointment ID: ${result.id}.`;
    }

    case "updateDoctor": {
      if (!state.doctors.some((d) => d.id === action.id)) {
        throw new Error(`Doctor ${action.id} no longer exists.`);
      }

      updateDoctor(action.id, {
        availability: action.availability,
      });

      return `Doctor ${action.id} availability updated to ${action.availability}.`;
    }

    case "acknowledgeAlert": {
      if (!state.alerts.some((a) => a.id === action.id)) {
        throw new Error(`Alert ${action.id} no longer exists.`);
      }

      acknowledgeAlert(action.id);
      return `Alert ${action.id} acknowledged successfully.`;
    }

    case "resolveAlert": {
      if (!state.alerts.some((a) => a.id === action.id)) {
        throw new Error(`Alert ${action.id} no longer exists.`);
      }

      resolveAlert(action.id, action.note);
      return `Alert ${action.id} resolved successfully.`;
    }
  }
}
