/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import {
  PaymentGateway,
  PaymentStatus,
} from "../../../../generated/prisma/enums";
import { stripe } from "../../config/stripe.config";
import { envVars } from "../../config/env";
import AppError from "../../helpers/errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
  CommentWithRelations,
  getVoteData,
  mapComments,
} from "../idea/idea.helpers";

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

/**
 * @desc Get all purchased ideas for the authenticated user
 * @route GET /api/payments/my-purchases-ideas
 * @access Private (Authenticated users)
 */
const getMyPurchasedIdeas = async (userId: string, query: IQueryParams) => {
  const sortAliases: Record<
    string,
    { sortBy: string; sortOrder: "asc" | "desc" }
  > = {
    latest: { sortBy: "paidAt", sortOrder: "desc" },
    oldest: { sortBy: "paidAt", sortOrder: "asc" },
    highest_amount: { sortBy: "amount", sortOrder: "desc" },
    lowest_amount: { sortBy: "amount", sortOrder: "asc" },
    title_asc: { sortBy: "idea.title", sortOrder: "asc" },
    title_desc: { sortBy: "idea.title", sortOrder: "desc" },
  };

  const normalizedQuery: IQueryParams = { ...query };
  const aliasSort = query.sortBy ? sortAliases[query.sortBy] : undefined;

  if (aliasSort) {
    normalizedQuery.sortBy = aliasSort.sortBy;
    normalizedQuery.sortOrder = aliasSort.sortOrder;
  }

  const queryBuilder = new QueryBuilder(prisma.payment, normalizedQuery, {
    searchableFields: ["idea.title", "idea.description"],
    filterableFields: [
      "ideaId",
      "gateway",
      "amount",
      "paidAt",
      "idea.categoryId",
    ],
  });

  const result = await queryBuilder
    .search()
    .filter()
    .sort()
    .paginate()
    .include({
      idea: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: true,
        },
      },
    })
    .where({
      userId,
      status: PaymentStatus.PAID,
    })
    .execute();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    aggregate,
    last7DaysPurchases,
    last30DaysPurchases,
    thisMonthPurchases,
    highestPurchase,
    uniquePurchasedIdeas,
    uniquePurchasedCategories,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        userId,
        status: PaymentStatus.PAID,
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
    }),
    prisma.payment.count({
      where: {
        userId,
        status: PaymentStatus.PAID,
        paidAt: {
          gte: sevenDaysAgo,
        },
      },
    }),
    prisma.payment.count({
      where: {
        userId,
        status: PaymentStatus.PAID,
        paidAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.payment.count({
      where: {
        userId,
        status: PaymentStatus.PAID,
        paidAt: {
          gte: monthStart,
        },
      },
    }),
    prisma.payment.findFirst({
      where: {
        userId,
        status: PaymentStatus.PAID,
      },
      orderBy: {
        amount: "desc",
      },
      select: {
        amount: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        userId,
        status: PaymentStatus.PAID,
      },
      select: {
        ideaId: true,
      },
      distinct: ["ideaId"],
    }),
    prisma.payment.findMany({
      where: {
        userId,
        status: PaymentStatus.PAID,
      },
      select: {
        idea: {
          select: {
            categoryId: true,
          },
        },
      },
      distinct: ["ideaId"],
    }),
  ]);

  const data = result.data.map((payment: any) => ({
    paymentId: payment.id,
    transactionId: payment.transactionId,
    amount: payment.amount,
    status: payment.status,
    paidAt: payment.paidAt,
    purchasedAt: payment.paidAt ?? payment.createdAt,
    idea: {
      id: payment.idea.id,
      title: payment.idea.title,
      slug: payment.idea.slug,
      description: payment.idea.description,
      image: payment.idea.image,
      price: payment.idea.price,
      isPaid: payment.idea.isPaid,
      createdAt: payment.idea.createdAt,
      category: payment.idea.category,
      author: payment.idea.author,
    },
  }));

  return {
    data,
    meta: result.meta,
    summary: {
      totalPurchased: uniquePurchasedIdeas.length,
      totalSpent: aggregate._sum.amount ?? 0,
      averageSpend: Number((aggregate._avg.amount ?? 0).toFixed(2)),
      highestPurchaseAmount: highestPurchase?.amount ?? 0,
      last7DaysPurchases,
      last30DaysPurchases,
      thisMonthPurchases,
      uniqueCategoriesPurchased: new Set(
        uniquePurchasedCategories.map((payment) => payment.idea.categoryId),
      ).size,
    },
  };
};

/**
 * @desc Get details of a specific purchased idea for the authenticated user
 * @route GET /api/payments/my-purchases-ideas/:ideaId
 * @access Private (Authenticated users)
 */
const getMyPurchasedIdeaDetails = async (
  userId: string,
  ideaId: string,
  query: IQueryParams,
) => {
  const payment = await prisma.payment.findFirst({
    where: {
      userId,
      ideaId,
      status: PaymentStatus.PAID,
    },
  });

  if (!payment) {
    throw new AppError(403, "You have not purchased this idea");
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      author: true,
      category: true,
      votes: {
        select: {
          value: true,
          userId: true,
          id: true,
          ideaId: true,
        },
      },
    },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  const queryBuilder = new QueryBuilder(prisma.comment as any, {
    page: query.page || "1",
    limit: query.limit || "5",
    sortBy: "createdAt",
    sortOrder: "desc",
  }).paginate();

  const commentsResult = await queryBuilder
    .sort()
    .where({
      ideaId: idea.id,
      parentId: null,
    })
    .include({
      user: true,
      replies: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    })
    .execute();

  const comments = mapComments(commentsResult.data as CommentWithRelations[]);
  const voteData = getVoteData(idea.votes as any, userId);

  return {
    id: idea.id,
    title: idea.title,
    problem: idea.problem,
    solution: idea.solution,
    description: idea.description,
    image: idea.image,
    slug: idea.slug,
    isPaid: idea.isPaid,
    price: idea.price,
    status: idea.status,
    isLocked: false,
    accessLevel: "PURCHASED_FULL_ACCESS",
    purchasedAt: payment.paidAt ?? payment.createdAt,
    paymentInfo: {
      paymentId: payment.id,
      transactionId: payment.transactionId,
      amount: payment.amount,
      paidAt: payment.paidAt,
      gateway: payment.gateway,
      status: payment.status,
    },
    ...voteData,
    comments,
    commentsMeta: commentsResult.meta,
    category: idea.category,
    author: idea.author,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
  };
};

export const PaymentService = {
  handlerStripeWebhookEvent,
  createIdeaPurchase,
  getMyPurchasedIdeas,
  getMyPurchasedIdeaDetails,
};
