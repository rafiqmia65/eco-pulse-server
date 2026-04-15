import { prisma } from "../../lib/prisma";
import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { IUpdateProfilePayload } from "./user.interface";
import { Role, UserStatus } from "../../../../generated/prisma/enums";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";

/** * @desc    Update logged-in user's profile
 * @route   PATCH /api/v1/users/update-profile
 * @access  Private
 * Features:
 * - Validate input (handled in route validation)
 * - Check for email uniqueness if email is being updated
 * - Return updated user data
 */
const updateProfile = async (
  userId: string,
  payload: IUpdateProfilePayload,
) => {
  const { name, email, image } = payload;

  // Find the user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(status.NOT_FOUND, "User not found");

  // If email is being updated, ensure it's unique
  if (email && email !== user.email) {
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists)
      throw new AppError(status.CONFLICT, "Email already in use");
  }

  // Update the user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name ?? user.name,
      email: email ?? user.email,
      image: image ?? user.image,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

/**
 * @desc Get logged-in user dashboard stats
 * @route GET /api/v1/users/stats
 * @access Private (Member)
 */
const getUserStats = async (userId: string) => {
  // =========================
  // IDEA STATS
  // =========================
  const myIdeas = await prisma.idea.findMany({
    where: { authorId: userId },
    select: {
      id: true,
      status: true,
      isPaid: true,
      votesCount: true,
      commentsCount: true,
    },
  });

  const totalIdeas = myIdeas.length;

  const approvedIdeas = myIdeas.filter((i) => i.status === "APPROVED").length;
  const reviewIdeas = myIdeas.filter((i) => i.status === "REVIEW").length;
  const rejectedIdeas = myIdeas.filter((i) => i.status === "REJECTED").length;
  const draftIdeas = myIdeas.filter((i) => i.status === "DRAFT").length;

  const paidIdeas = myIdeas.filter((i) => i.isPaid).length;
  const freeIdeas = myIdeas.filter((i) => !i.isPaid).length;

  // Engagement
  const totalVotesReceived = myIdeas.reduce((sum, i) => sum + i.votesCount, 0);
  const totalCommentsReceived = myIdeas.reduce(
    (sum, i) => sum + i.commentsCount,
    0,
  );

  // =========================
  // PAYMENT (PURCHASE)
  // =========================
  const myPayments = await prisma.payment.findMany({
    where: { userId },
  });

  const totalPayments = myPayments.length;

  const successPayments = myPayments.filter((p) => p.status === "PAID").length;
  const pendingPayments = myPayments.filter(
    (p) => p.status === "PENDING",
  ).length;

  const totalSpent = myPayments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  // =========================
  //  EARNINGS (VERY IMPORTANT FOR OUR ECO-PULSE HEROES)
  // =========================
  const earningsData = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: "PAID",
      idea: {
        authorId: userId,
      },
    },
  });

  const totalEarnings = earningsData._sum.amount || 0;

  // =========================
  // LAST 7 DAYS
  // =========================
  const last7Days = [...Array(7)]
    .map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    })
    .reverse();

  const ideasByDay = await Promise.all(
    last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const count = await prisma.idea.count({
        where: {
          authorId: userId,
          createdAt: { gte: date, lt: nextDay },
        },
      });

      return { date, count };
    }),
  );

  const spendingByDay = await Promise.all(
    last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const data = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          status: "PAID",
          createdAt: { gte: date, lt: nextDay },
        },
      });

      return { date, amount: data._sum.amount || 0 };
    }),
  );

  // =========================
  //  BEST IDEA
  // =========================
  const bestIdea = await prisma.idea.findFirst({
    where: { authorId: userId },
    orderBy: { votesCount: "desc" },
    select: {
      id: true,
      title: true,
      votesCount: true,
      commentsCount: true,
      slug: true,
    },
  });

  // =========================
  // RECENT PURCHASES
  // =========================
  const recentPurchases = await prisma.payment.findMany({
    where: { userId, status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      idea: {
        select: {
          id: true,
          title: true,
          image: true,
          slug: true,
        },
      },
    },
  });

  // =========================
  // SIMPLE PERFORMANCE SCORE
  // =========================
  const performanceScore =
    totalVotesReceived + totalCommentsReceived + totalIdeas * 5;

  // =========================
  // FINAL RESPONSE
  // =========================
  return {
    ideas: {
      total: totalIdeas,
      approved: approvedIdeas,
      review: reviewIdeas,
      rejected: rejectedIdeas,
      draft: draftIdeas,
      paid: paidIdeas,
      free: freeIdeas,
    },

    engagement: {
      totalVotesReceived,
      totalCommentsReceived,
    },

    payments: {
      total: totalPayments,
      success: successPayments,
      pending: pendingPayments,
    },

    spending: {
      total: totalSpent,
      last7Days: spendingByDay,
    },

    earnings: {
      total: totalEarnings,
    },

    charts: {
      ideasLast7Days: ideasByDay,
    },

    performance: {
      score: performanceScore,
    },

    bestIdea,
    recentPurchases,
  };
};

/**
 * @desc    Promote user to admin
 * @route   PATCH /api/v1/users/make-admin/:id
 * @access  Admin only
 */

const makeAdmin = async (userId: string) => {
  // check user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // already admin check
  if (user.role === "ADMIN") {
    throw new AppError(status.BAD_REQUEST, "User is already an admin");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      role: "ADMIN",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
    },
  });

  return updatedUser;
};

const blockUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // already blocked
  if (user.status === "BLOCKED") {
    throw new AppError(status.BAD_REQUEST, "User is already blocked");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: "BLOCKED",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
    },
  });

  return updatedUser;
};

/**
 * @desc    Unblock a user
 * @route   PATCH /api/v1/users/unblock/:id
 * @access  Admin only
 */
const unblockUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // already active
  if (user.status === UserStatus.ACTIVE) {
    throw new AppError(status.BAD_REQUEST, "User is already active");
  }

  if (user.status === UserStatus.DELETED) {
    throw new AppError(status.BAD_REQUEST, "Deleted user cannot be unblocked");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
    },
  });

  return updatedUser;
};

/**
 * Get a single user by ID
 * @param userId - ID of the user to fetch
 */
const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

/**
 * @desc Get all users with advanced query features
 */
const getAllUsers = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder(prisma.user, query, {
    searchableFields: ["name", "email"],
    filterableFields: ["role", "status"],
  });

  const result = await queryBuilder
    .search()
    .filter()
    .sort()
    .paginate()
    .execute();

  // =========================
  // USERS STATS (ADMIN DASHBOARD)
  // =========================
  const [totalUsers, activeUsers, blockedUsers, adminUsers, memberUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { status: UserStatus.ACTIVE },
      }),
      prisma.user.count({
        where: { status: UserStatus.BLOCKED },
      }),
      prisma.user.count({
        where: { role: Role.ADMIN },
      }),
      prisma.user.count({
        where: { role: Role.MEMBER },
      }),
    ]);

  const stats = {
    totalUsers,
    activeUsers,
    blockedUsers,
    adminUsers,
    memberUsers,
  };

  // FINAL RETURN
  return {
    meta: result.meta,
    data: {
      users: result.data,
      stats,
    },
  };
};

export const UserService = {
  updateProfile,
  makeAdmin,
  blockUser,
  unblockUser,
  getUserById,
  getAllUsers,
  getUserStats,
};
