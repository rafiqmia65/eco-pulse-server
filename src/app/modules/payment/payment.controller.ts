import { Request, Response } from "express";
import status from "http-status";
import Stripe from "stripe";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { IQueryParams } from "../../interfaces/query.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";
import { CacheUtils } from "../../utils/cache";

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

      // Invalidate payment and purchase caches on success
      // Since webhooks can affect multiple users (though usually one),
      // and we don't have the userId directly in the event object here
      // without parsing the metadata inside the service, we clear all for safety
      // or we could clear specific patterns if we extracted userId.
      await CacheUtils.clearCacheByPattern("payments:*");
      await CacheUtils.clearCacheByPattern("purchases:*");
      await CacheUtils.clearCacheByPattern("admin:*");

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

/**
 * @desc Get all purchased ideas for the authenticated user
 * @route GET /api/payments/my-purchases-ideas
 * @access Private (Authenticated users)
 */
const getMyPurchasedIdeas = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const query = req.query as IQueryParams;
  const cacheKey = `purchases:ideas:${userId}:${JSON.stringify(query)}`;

  const cachedPurchases = await CacheUtils.getCache(cacheKey);
  if (cachedPurchases) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Purchased ideas fetched successfully (from cache)",
      // @ts-expect-error - cached data structure matches result
      data: cachedPurchases.data,
      // @ts-expect-error - cached data structure matches result
      meta: cachedPurchases.meta,
      // @ts-expect-error - cached data structure matches result
      counts: cachedPurchases.summary,
    });
  }

  const result = await PaymentService.getMyPurchasedIdeas(userId, query);

  // Cache for 5 minutes
  await CacheUtils.setCache(cacheKey, result, 300);

  return sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchased ideas fetched successfully",
    data: result.data,
    meta: result.meta,
    counts: result.summary,
  });
});

/**
 * @desc Get details of a specific purchased idea for the authenticated user
 * @route GET /api/payments/my-purchases-ideas/:ideaId
 * @access Private (Authenticated users)
 */
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

/**
 * @desc Get payment history of logged-in user
 * @route GET /api/v1/payments/history
 * @access Private (Member)
 */
const getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const query = req.query;
  const cacheKey = `payments:history:${userId}:${JSON.stringify(query)}`;

  const cachedHistory = await CacheUtils.getCache(cacheKey);
  if (cachedHistory) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Payment history fetched successfully (from cache)",
      data: {
        // @ts-expect-error - cached data structure matches result
        list: cachedHistory.data,
        // @ts-expect-error - cached data structure matches result
        stats: cachedHistory.stats,
      },
      // @ts-expect-error - cached data structure matches result
      meta: cachedHistory.meta,
    });
  }

  const result = await PaymentService.getPaymentHistory(userId, query);

  // Cache for 5 minutes
  await CacheUtils.setCache(cacheKey, result, 300);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment history fetched successfully",
    data: {
      list: result.data,
      stats: result.stats,
    },
    meta: result.meta,
  });
});

export const PaymentController = {
  handleStripeWebhookEvent,
  createIdeaPurchase,
  getMyPurchasedIdeas,
  getMyPurchasedIdeaDetails,
  getPaymentHistory,
};
