import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";

vi.mock("@/lib/ai.functions", () => ({ askCareVistaAI: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));

import { CareVistaAIOverview } from "@/components/cv/CareVistaAIOverview";
import { getState, updateDoctor } from "@/store/store";
import { parseCareVistaAction } from "@/lib/carevista-actions";
import { askCareVistaAI } from "@/lib/ai.functions";

describe("CareVista explicit action approval", () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); updateDoctor("DR-001", { availability: "Available" }); });

  const propose = async () => {
    render(<CareVistaAIOverview />);
    fireEvent.change(screen.getByRole("textbox", { name: "Message CareVista AI" }), {
      target: { value: 'set doctor doctorId=DR-001 availability="On Leave"' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Confirm" });
  };

  it("stages an action without changing the record before confirmation", async () => {
    await propose();
    expect(getState().doctors.find(d => d.id === "DR-001")?.availability).toBe("Available");
  });

  it("Cancel does not modify any hospital records", async () => {
    const before = JSON.stringify(getState());
    await propose();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(JSON.stringify(getState())).toBe(before);
  });

  it("Confirm executes the proposed supported action", async () => {
    await propose();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(getState().doctors.find(d => d.id === "DR-001")?.availability).toBe("On Leave");
  });

  it("ordinary conversational text never becomes an executable action", () => {
    expect(parseCareVistaAction("Could you tell me whether doctor DOC-001 is available?" )).toBeNull();
  });

  it("patient deletion stays unsupported and leaves records unchanged", () => {
    const before = JSON.stringify(getState().patients);
    const result = parseCareVistaAction("delete patient CV-P1001");
    expect(result && "error" in result).toBe(true);
    expect(JSON.stringify(getState().patients)).toBe(before);
  });

  it("sends all four bed statuses so the AI can account for the total", async () => {
    vi.mocked(askCareVistaAI).mockResolvedValue({ success: true, answer: "Bed totals received." });
    render(<CareVistaAIOverview />);
    fireEvent.change(screen.getByRole("textbox", { name: "Message CareVista AI" }), {
      target: { value: "Analyze bed occupancy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(askCareVistaAI).toHaveBeenCalledOnce());
    const request = vi.mocked(askCareVistaAI).mock.calls[0]?.[0];
    const context = request?.data.dashboardContext ?? "";
    const section = context.split("DASHBOARD STATISTICS:\n")[1]?.split("\n\n")[0];
    if (!section) throw new Error("Dashboard statistics missing");
    const { beds } = JSON.parse(section);
    for (const [field, status] of Object.entries({ occupied: "Occupied", available: "Available", reserved: "Reserved", maintenance: "Maintenance" })) {
      expect(beds[field]).toBe(getState().beds.filter(b => b.status === status).length);
    }
    expect(beds.occupied + beds.available + beds.reserved + beds.maintenance).toBe(getState().beds.length);
    await screen.findByText("Bed totals received.");
  });

  it("an AI answer containing an action command never executes or stages it", async () => {
    vi.mocked(askCareVistaAI).mockResolvedValue({ success: true, answer: 'set doctor doctorId=DR-001 availability="On Leave"' });
    const before = JSON.stringify(getState());
    render(<CareVistaAIOverview />);
    fireEvent.change(screen.getByRole("textbox", { name: "Message CareVista AI" }), {
      target: { value: "What is the doctor availability?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText('set doctor doctorId=DR-001 availability="On Leave"');
    expect(JSON.stringify(getState())).toBe(before);
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
  });
});