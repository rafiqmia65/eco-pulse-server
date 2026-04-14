/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import {
  PaymentGateway,
  PaymentStatus,
} from "../../../../generated/prisma/enums";
import { stripe } from "../../config/stripe.config";
import { envVars } from "../../config/env";

/**
 * @desc Service layer for handling payment logic, including Stripe webhook processing and idea purchases
 */
const getTransactionId = (session: Stripe.Checkout.Session) => {
  if (session.id) {
    return session.id;
  }

  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;
};

// Safely stringify and parse data to ensure it's JSON-serializable for database storage
const safeJson = (data: unknown) => JSON.parse(JSON.stringify(data));

/**
 * @desc Handle Stripe webhook events for payment processing
 * @route POST /api/payments/webhook
 * @access Public (Stripe will call this endpoint)
 */
const handlerStripeWebhookEvent = async (event: Stripe.Event) => {
  console.log("Stripe event received:", {
    type: event.type,
    id: event.id,
  });

  switch (event.type) {
    /**
     * MAIN SUCCESS EVENT
     */
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const ideaId = session.metadata?.ideaId;
      const userId = session.metadata?.userId;
      const transactionId = getTransactionId(session);

      if (!ideaId || !userId || !transactionId) return;

      // prevent duplicate webhook processing
      const alreadyProcessed = await prisma.payment.findFirst({
        where: { stripeEventId: event.id },
      });

      if (alreadyProcessed) return;

      await prisma.payment.upsert({
        where: { transactionId },
        create: {
          amount: session.amount_total ? session.amount_total / 100 : 0,
          status: PaymentStatus.PAID,
          transactionId,
          stripeEventId: event.id,
          gateway: "STRIPE",
          gatewayData: safeJson(session),
          paidAt: new Date(),

          userId,
          ideaId,
        },
        update: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          gatewayData: safeJson(session),
          stripeEventId: event.id,
        },
      });

      break;
    }

    /**
     * FALLBACK SUCCESS
     */
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;

      await prisma.payment.updateMany({
        where: { transactionId: intent.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          gatewayData: safeJson(intent),
          stripeEventId: event.id,
        },
      });

      break;
    }

    /**
     * DELAYED PAYMENT SUCCESS
     */
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;

      const transactionId = getTransactionId(session);

      if (!transactionId) return;

      await prisma.payment.updateMany({
        where: { transactionId },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          gatewayData: safeJson(session),
          stripeEventId: event.id,
        },
      });

      break;
    }

    /**
     * FAILED PAYMENT
     */
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const transactionId = getTransactionId(session);

      if (!transactionId) return;

      await prisma.payment.updateMany({
        where: { transactionId },
        data: {
          status: PaymentStatus.FAILED,
          gatewayData: safeJson(session),
          stripeEventId: event.id,
        },
      });

      break;
    }

    default:
      console.log("Unhandled event type:", event.type);
  }
};

/** * @desc Create a Stripe checkout session for purchasing an idea
 * @route POST /api/payments/ideas/:ideaId/purchase
 * @access Private (Authenticated users)
 */

const createIdeaPurchase = async (userId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea) {
    throw new Error("Idea not found");
  }

  if (!idea.price) {
    throw new Error("Idea is free, no payment required");
  }

  const existingPayment = await prisma.payment.findUnique({
    where: {
      userId_ideaId: {
        userId,
        ideaId,
      },
    },
  });

  if (existingPayment?.status === PaymentStatus.PAID) {
    throw new Error("Already purchased this idea");
  }

  // create stripe session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `${envVars.FRONTEND_URL}/ideas/${ideaId}?success=true`,
    cancel_url: `${envVars.FRONTEND_URL}/ideas/${ideaId}?canceled=true`,

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: idea.title,
            description: idea.description,
          },
          unit_amount: Math.round(idea.price * 100),
        },
        quantity: 1,
      },
    ],

    metadata: {
      ideaId,
      userId,
    },
  });

  // Reuse the existing payment row for retries because userId + ideaId is unique.
  const payment = existingPayment
    ? await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount: idea.price,
          status: PaymentStatus.PENDING,
          transactionId: session.id,
          gateway: PaymentGateway.STRIPE,
          gatewayData: session as any,
          stripeEventId: null,
          paidAt: null,
        },
      })
    : await prisma.payment.create({
        data: {
          amount: idea.price,
          status: PaymentStatus.PENDING,
          transactionId: session.id,
          gateway: PaymentGateway.STRIPE,
          gatewayData: session as any,
          userId,
          ideaId,
        },
      });

  return {
    checkoutUrl: session.url,
    payment,
  };
};

export const PaymentService = {
  handlerStripeWebhookEvent,
  createIdeaPurchase,
};
