import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { PaymentStatus } from "../../../../generated/prisma/enums";

const getTransactionId = (session: Stripe.Checkout.Session) => {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;
};

const safeJson = (data: unknown) => JSON.parse(JSON.stringify(data));

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
        },
      });

      break;
    }

    default:
      console.log("Unhandled event type:", event.type);
  }
};

export const PaymentService = {
  handlerStripeWebhookEvent,
};
