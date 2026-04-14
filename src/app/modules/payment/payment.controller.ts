import { Request, Response } from "express";
import status from "http-status";
import Stripe from "stripe";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";

const handleStripeWebhookEvent = catchAsync(
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    const webhookSecret = envVars.STRIPE.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(status.BAD_REQUEST).json({
        success: false,
        message: "Missing Stripe signature or webhook secret",
      });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown Stripe error";

      console.error("Stripe webhook signature failed:", message);

      return res.status(status.BAD_REQUEST).json({
        success: false,
        message: "Invalid Stripe webhook signature",
      });
    }

    try {
      await PaymentService.handlerStripeWebhookEvent(event);

      return sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: `Webhook handled: ${event.type}`,
        data: null,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown server error";

      console.error("Webhook handler error:", message);

      return res.status(status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process webhook event",
      });
    }
  },
);

export const PaymentController = {
  handleStripeWebhookEvent,
};
