/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "./errorHelpers/AppError";

/**
 * Robust retry utility with exponential backoff
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;

    const errorMessage = error?.message || String(error);
    const isRetryable =
      errorMessage.includes("429") ||
      errorMessage.includes("Quota exceeded") ||
      errorMessage.includes("503") ||
      errorMessage.includes("Service Unavailable") ||
      errorMessage.includes("deadline exceeded");

    if (!isRetryable) throw error;

    console.log(`AI Retrying... attempts left: ${retries}, delay: ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

/**
 * Handle AI Errors with professional messaging
 */
export const handleAIError = (error: any) => {
  const errorMessage = error?.message || String(error);

  if (
    errorMessage.includes("429") ||
    errorMessage.includes("Quota exceeded") ||
    errorMessage.includes("Too Many Requests")
  ) {
    throw new AppError(
      status.TOO_MANY_REQUESTS,
      "Daily AI limit reached. Please try again tomorrow.",
    );
  }

  if (errorMessage.includes("GoogleGenerativeAI Error") || errorMessage.includes("503")) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "The AI service is currently busy. Please try again in a few moments.",
    );
  }

  throw new AppError(
    status.INTERNAL_SERVER_ERROR,
    "Our AI consultant is taking a short break. Please try again shortly.",
  );
};
