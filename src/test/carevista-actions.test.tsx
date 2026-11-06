import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";

vi.mock("@/lib/ai.functions", () => ({ askCareVistaAI: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));

import { CareVistaAIOverview } from "@/components/cv/CareVistaAIOverview";
import { getState, updateDoctor } from "@/store/store";
import { parseCareVistaAction } from "@/lib/carevista-actions";

describe("CareVista explicit action approval", () => {
  beforeEach(() => { cleanup(); updateDoctor("DOC-001", { availability: "Available" }); });

  const propose = async () => {
    render(<CareVistaAIOverview />);
    fireEvent.change(screen.getByRole("textbox", { name: "Message CareVista AI" }), {
      target: { value: 'set doctor doctorId=DOC-001 availability="On Leave"' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Confirm", exact: true });
  };

  it("stages an action without changing the record before confirmation", async () => {
    await propose();
    expect(getState().doctors.find(d => d.id === "DOC-001")?.availability).toBe("Available");
  });

  it("Cancel does not modify any hospital records", async () => {
    const before = JSON.stringify(getState());
    await propose();
    fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
    expect(JSON.stringify(getState())).toBe(before);
  });

  it("Confirm executes the proposed supported action", async () => {
    await propose();
    fireEvent.click(screen.getByRole("button", { name: "Confirm", exact: true }));
    expect(getState().doctors.find(d => d.id === "DOC-001")?.availability).toBe("On Leave");
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
});