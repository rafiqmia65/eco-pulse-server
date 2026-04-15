/* eslint-disable @typescript-eslint/no-explicit-any */
import { IdeaStatus, PaymentStatus } from "../../../../generated/prisma/enums";
import AppError from "../../helpers/errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { CommentWithRelations, mapComments } from "../idea/idea.helpers";

/**
 * Admin: Get all ideas (moderation)
 *
 * Features:
 * - Fetch all ideas
 * - Filter by status
 * - Search
 * - Pagination & sorting
 * - Include author & category
 * - Counts for moderation dashboard
 */
const getAllIdeasAdmin = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder(prisma.idea, query, {
    searchableFields: ["title", "description"],
    filterableFields: ["status", "categoryId", "isPaid"],
  });

  const baseWhere = {
    status: {
      in: [IdeaStatus.REVIEW, IdeaStatus.APPROVED, IdeaStatus.REJECTED],
    },
  };

  const result = await queryBuilder
    .search()
    .where(baseWhere)
    .filter()
    .sort()
    .paginate()
    .include({
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      category: true,
    })
    .execute();

  const [total, review, approved, rejected] = await Promise.all([
    prisma.idea.count({ where: baseWhere }),

    prisma.idea.count({
      where: { status: IdeaStatus.REVIEW },
    }),

    prisma.idea.count({
      where: { status: IdeaStatus.APPROVED },
    }),

    prisma.idea.count({
      where: { status: IdeaStatus.REJECTED },
    }),
  ]);

  return {
    data: result.data,
    meta: result.meta,
    counts: {
      total,
      review,
      approved,
      rejected,
    },
  };
};

/**
 * @desc Admin: Approve idea
 * @route PATCH /api/v1/admin/ideas/approve/:id
 * @access Private (Admin)
 */
const approveIdea = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // optional business rule
  if (idea.status === IdeaStatus.APPROVED) {
    throw new AppError(400, "Idea is already approved");
  }

  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.APPROVED,
    },
  });

  return updatedIdea;
};

/**
 * @desc Admin: Reject idea with feedback
 * @route PATCH /api/v1/admin/ideas/reject/:id
 * @access Private (Admin)
 */
const rejectIdea = async (ideaId: string, feedback: string) => {
  if (!feedback) {
    throw new AppError(400, "Feedback is required");
  }
  // Step 1: check idea
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      feedback: true,
    },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  if (idea.status === IdeaStatus.REJECTED) {
    throw new AppError(400, "Idea is already rejected");
  }

  // Step 2: validate status BEFORE update
  if (idea.status !== IdeaStatus.REVIEW) {
    throw new AppError(400, "Only REVIEW ideas can be rejected");
  }

  // Step 3: update idea status
  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.REJECTED,
    },
  });

  // Step 4: save feedback
  await prisma.feedback.upsert({
    where: { ideaId },
    update: {
      message: feedback,
    },
    create: {
      ideaId,
      message: feedback,
    },
  });

  return updatedIdea;
};

/**
 * @desc Get single idea (admin view)
 * @route GET /api/v1/admin/ideas/:id
 * @access Private (Admin)
 */

const getSingleIdea = async (ideaId: string, page: number, limit: number) => {
  // 1. Fetch idea
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      author: true,
      category: true,
      votes: {
        select: {
          value: true,
          userId: true,
        },
      },
    },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  if (idea.status === IdeaStatus.DRAFT) {
    throw new AppError(403, "Draft ideas are not accessible to admin");
  }

  // 2. COMMENTS (same QueryBuilder pattern)
  const commentsResult = await new QueryBuilder(prisma.comment as any, {
    page: String(page),
    limit: String(limit),
    sortBy: "createdAt",
    sortOrder: "desc",
  })
    .paginate()
    .sort()
    .where({
      ideaId: idea.id,
      parentId: null,
      // isDeleted filter remove
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

  // 3. SAME COMMENT FORMAT AS OTHER APIs
  const comments = mapComments(commentsResult.data as CommentWithRelations[]);

  return {
    ...idea,
    comments,
    commentsMeta: commentsResult.meta,
  };
};

/**
 * @desc Get admin dashboard statistics
 */
const getAdminStats = async () => {
  // =========================
  // USER STATS
  // =========================
  const totalUsers = await prisma.user.count();

  const activeUsers = await prisma.user.count({
    where: { status: "ACTIVE" },
  });

  const blockedUsers = await prisma.user.count({
    where: { status: "BLOCKED" },
  });

  // =========================
  // IDEA STATS
  // =========================
  const totalIdeas = await prisma.idea.count();

  const approvedIdeas = await prisma.idea.count({
    where: { status: "APPROVED" },
  });

  const reviewIdeas = await prisma.idea.count({
    where: { status: "REVIEW" },
  });

  const rejectedIdeas = await prisma.idea.count({
    where: { status: "REJECTED" },
  });

  const draftIdeas = await prisma.idea.count({
    where: { status: "DRAFT" },
  });

  const paidIdeas = await prisma.idea.count({
    where: { isPaid: true },
  });

  const freeIdeas = await prisma.idea.count({
    where: { isPaid: false },
  });

  // =========================
  // PAYMENT STATS
  // =========================
  const totalPayments = await prisma.payment.count();

  const successfulPayments = await prisma.payment.count({
    where: { status: "PAID" },
  });

  const pendingPayments = await prisma.payment.count({
    where: { status: "PENDING" },
  });

  const failedPayments = await prisma.payment.count({
    where: { status: "FAILED" },
  });

  // Revenue
  const revenueData = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: "PAID" },
  });

  const totalRevenue = revenueData._sum.amount || 0;

  // =========================
  // LAST 7 DAYS DATA
  // =========================
  const last7Days = [...Array(7)]
    .map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);

      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    })
    .reverse();

  // Revenue per day
  const revenueByDay = await Promise.all(
    last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const data = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "PAID",
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      });

      return {
        date: date.toISOString().split("T")[0], // "2026-04-15"
        amount: data._sum.amount || 0,
      };
    }),
  );

  // Ideas created per day
  const ideasByDay = await Promise.all(
    last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const count = await prisma.idea.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      });

      return {
        date,
        count,
      };
    }),
  );

  // =========================
  // TOP IDEAS
  // =========================

  // Top Voted Ideas
  const topVotedIdeas = await prisma.idea.findMany({
    where: { status: "APPROVED" },
    orderBy: {
      votesCount: "desc",
    },
    take: 5,
    select: {
      id: true,
      title: true,
      votesCount: true,
      image: true,
      slug: true,
    },
  });

  // Most Purchased Ideas
  const mostPurchasedIdeas = await prisma.payment.groupBy({
    by: ["ideaId"],
    _count: {
      ideaId: true,
    },
    where: {
      status: "PAID",
    },
    orderBy: {
      _count: {
        ideaId: "desc",
      },
    },
    take: 5,
  });

  // Fetch idea details for purchased ideas
  const purchasedIdeasDetails = await Promise.all(
    mostPurchasedIdeas.map(async (item) => {
      const idea = await prisma.idea.findUnique({
        where: { id: item.ideaId },
        select: {
          id: true,
          title: true,
          image: true,
          slug: true,
        },
      });

      return {
        ...idea,
        purchaseCount: item._count.ideaId,
      };
    }),
  );

  // =========================
  // FINAL RESPONSE
  // =========================
  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      blocked: blockedUsers,
    },

    ideas: {
      total: totalIdeas,
      approved: approvedIdeas,
      review: reviewIdeas,
      rejected: rejectedIdeas,
      draft: draftIdeas,
      paid: paidIdeas,
      free: freeIdeas,
    },

    payments: {
      total: totalPayments,
      success: successfulPayments,
      pending: pendingPayments,
      failed: failedPayments,
    },

    revenue: {
      total: totalRevenue,
      last7Days: revenueByDay,
    },

    charts: {
      ideasLast7Days: ideasByDay,
    },

    topIdeas: {
      mostVoted: topVotedIdeas,
      mostPurchased: purchasedIdeasDetails,
    },
  };
};

/**
 * @desc Admin payment analytics + history
 * @route GET /api/v1/admin/payments
 * @access Private (Admin)
 */
const getAllPaymentsAdmin = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<any, any, any>(prisma.payment, query, {
    searchableFields: ["transactionId", "user.name", "idea.title"],
    filterableFields: ["status", "gateway", "user.name", "idea.title"],
  });

  const paymentsResult = await queryBuilder
    .search()
    .filter()
    .sort()
    .paginate()
    .include({
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      idea: {
        select: {
          id: true,
          title: true,
          price: true,
          slug: true,
          category: {
            select: { name: true },
          },
        },
      },
    })
    .execute();

  const { data: payments, meta } = paymentsResult;

  // ======================
  // GLOBAL STATS (FAST GROUP BY)
  // ======================
  const stats = await prisma.payment.groupBy({
    by: ["status"],
    _count: { status: true },
    _sum: { amount: true },
  });

  const getCount = (st: PaymentStatus) =>
    stats.find((s) => s.status === st)?._count.status ?? 0;

  const getSum = (st: PaymentStatus) =>
    stats.find((s) => s.status === st)?._sum.amount ?? 0;

  const totalRevenue = getSum(PaymentStatus.PAID);
  const successfulPayments = getCount(PaymentStatus.PAID);
  const failedPayments = getCount(PaymentStatus.FAILED);
  const pendingPayments = getCount(PaymentStatus.PENDING);

  const totalTransactions = stats.reduce(
    (acc, cur) => acc + (cur._count.status ?? 0),
    0,
  );

  // ======================
  // LAST 7 DAYS REVENUE (CHART)
  // ======================
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const revenueRaw = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  const revenueMap: Record<string, number> = {};

  revenueRaw.forEach((p) => {
    const date = p.createdAt.toISOString().split("T")[0]!;
    revenueMap[date] = (revenueMap[date] || 0) + p.amount;
  });

  const revenueChart = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().split("T")[0]!;

    return {
      date,
      revenue: revenueMap[date] || 0,
    };
  });

  // ======================
  // TOP IDEAS (MOST PURCHASED)
  // ======================
  const topIdeas = await prisma.payment.groupBy({
    by: ["ideaId"],
    where: {
      status: PaymentStatus.PAID,
    },
    _count: {
      ideaId: true,
    },
    orderBy: {
      _count: {
        ideaId: "desc",
      },
    },
    take: 5,
  });

  const ideaIds = topIdeas.map((i) => i.ideaId);

  const ideas = await prisma.idea.findMany({
    where: { id: { in: ideaIds } },
    select: {
      id: true,
      title: true,
    },
  });

  const topIdeasDetails = topIdeas.map((t) => ({
    ideaId: t.ideaId,
    title: ideas.find((i) => i.id === t.ideaId)?.title || "Unknown",
    purchases: t._count.ideaId,
  }));

  const formattedData = payments.map((p) => ({
    paymentId: p.id,
    transactionId: p.transactionId,
    amount: p.amount,
    status: p.status,
    gateway: p.gateway,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
    user: {
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      image: p.user.image,
    },
    idea: {
      id: p.idea.id,
      title: p.idea.title,
      price: p.idea.price,
      slug: p.idea.slug,
      category: p.idea.category?.name,
    },
  }));

  return {
    meta,
    stats: {
      totalRevenue,
      totalTransactions,
      successfulPayments,
      failedPayments,
      pendingPayments,
      revenueChart,
      topIdeas: topIdeasDetails,
    },
    data: formattedData,
  };
};

export const AdminService = {
  getSingleIdea,
  getAllIdeasAdmin,
  rejectIdea,
  approveIdea,
  getAdminStats,
  getAllPaymentsAdmin,
};
