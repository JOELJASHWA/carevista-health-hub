import { afterEach, describe, expect, it, vi } from "vitest";

const { generateContent, constructor } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  constructor: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
    constructor(config: unknown) { constructor(config); }
  },
}));
import { generateAIResponse } from "@/lib/ai.server";

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("Gemini Flash Lite server configuration", () => {
  it("uses the available stable Flash Lite model and the existing key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-real-credential");
    vi.stubEnv("GEMINI_MODEL", "");
    generateContent.mockResolvedValue({ text: "Hospital summary" });
    expect(await generateAIResponse("Summarize occupancy", "{}" )).toBe("Hospital summary");
    expect(constructor).toHaveBeenCalledWith({ apiKey: "test-key-not-a-real-credential" });
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3.5-flash-lite" }));
  });

  it("shows the exact provider quota message without exposing a key", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-real-credential");
    vi.stubEnv("GEMINI_MODEL", "");
    generateContent.mockRejectedValue({ status: 429, message: JSON.stringify({ error: { message: "Quota exceeded: generate_content_free_tier_requests, limit: 0." } }) });
    const request = generateAIResponse("Summarize occupancy", "{}");
    const assertion = expect(request).rejects.toThrow("Gemini quota error (HTTP 429, model gemini-3.5-flash-lite):\nQuota exceeded: generate_content_free_tier_requests, limit: 0.");
    await vi.runAllTimersAsync();
    await assertion;
  });
});