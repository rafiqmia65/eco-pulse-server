import { Request, Response } from "express";
import status from "http-status";
import Stripe from "stripe";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { IQueryParams } from "../../interfaces/query.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";

/**
 * @desc Handle Stripe webhook events for payment processing
 * @route POST /api/payments/webhook
 * @access Public (Stripe will call this endpoint)
 *
 */
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

/**
 * @desc Create a Stripe checkout session for purchasing an idea
 * @route POST /api/payments/ideas/:ideaId/purchase
 * @access Private (Authenticated users)
 */
const createIdeaPurchase = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId; // from auth middleware
  const { ideaId } = req.params;

  const result = await PaymentService.createIdeaPurchase(
    userId as string,
    ideaId as string,
  );

  return sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Checkout session created successfully",
    data: result,
  });
});

const getMyPurchasedIdeas = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;

  const result = await PaymentService.getMyPurchasedIdeas(
    userId,
    req.query as IQueryParams,
  );

  return sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchased ideas fetched successfully",
    data: result.data,
    meta: result.meta,
    counts: result.summary,
  });
});

const getMyPurchasedIdeaDetails = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const { ideaId } = req.params;

    const result = await PaymentService.getMyPurchasedIdeaDetails(
      userId,
      ideaId as string,
      req.query as IQueryParams,
    );

    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Purchased idea details fetched successfully",
      data: result,
    });
  },
);

export const PaymentController = {
  handleStripeWebhookEvent,
  createIdeaPurchase,
  getMyPurchasedIdeas,
  getMyPurchasedIdeaDetails,
};
