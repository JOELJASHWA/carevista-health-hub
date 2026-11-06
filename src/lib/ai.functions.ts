

import { createServerFn } from "@tanstack/react-start";
import { generateAIResponse } from "./ai.server";

export const askCareVistaAI = createServerFn({ method: "POST" })
  .inputValidator((data: {
    message: string;
    dashboardContext: string;
  }) => {
    if (
      !data ||
      typeof data.message !== "string" ||
      !data.message.trim()
    ) {
      throw new Error("Please enter a valid message.");
    }

    if (data.message.length > 4000) {
      throw new Error("Message must be under 4000 characters.");
    }

    if (
      typeof data.dashboardContext !== "string" ||
      data.dashboardContext.length > 12000
    ) {
      throw new Error("Invalid dashboard context.");
    }

    return {
      message: data.message.trim(),
      dashboardContext: data.dashboardContext,
    };
  })
  .handler(async ({ data }) => {
    try {
      const answer = await generateAIResponse(
        data.message,
        data.dashboardContext,
      );

      return {
        success: true,
        answer,
      };
    } catch (error) {
      console.error("CareVista AI server function error:", error);

      throw new Error(
        error instanceof Error
          ? error.message
          : "CareVista AI could not generate a response.",
      );
    }
  });
