/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import AppError from "../../helpers/errorHelpers/AppError";
import {
  IdeaStatus,
  PaymentStatus,
  Role,
} from "../../../../generated/prisma/enums";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IQueryParams } from "../../interfaces/query.interface";

/* 
 *@desc Toggle vote (upvote/downvote) for an idea
 * @route POST /api/v1/votes/:ideaId
 * @access Private (Member)
 * Steps:
 1. Get userId from req.user
    2. Get ideaId from req.params
    3. Call service layer to toggle vote
    4. Send response with action (upvoted/downvoted/removed) and current vote counts
 */
const toggleVote = async (
  userId: string,
  ideaId: string,
  value: number,
  userRole: Role,
) => {
  if (value !== 1 && value !== -1) {
    throw new AppError(400, "Invalid vote value");
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: { payments: true },
  });

  if (!idea) throw new AppError(404, "Idea not found");

  if (userRole === Role.ADMIN) {
    throw new AppError(403, "Admin cannot vote");
  }

  if (idea.status !== IdeaStatus.APPROVED) {
    throw new AppError(400, "Idea not available for voting yet");
  }

  if (idea.isPaid) {
    const hasPaid = idea.payments.some(
      (p) => p.userId === userId && p.status === PaymentStatus.PAID,
    );

    if (!hasPaid) {
      throw new AppError(403, "You must purchase this idea first");
    }
  }

  const existingVote = await prisma.vote.findUnique({
    where: { userId_ideaId: { userId, ideaId } },
  });

  // helper builder (important fix)
  const buildUpdate = (up?: any, down?: any, net?: number) => {
    const data: any = {
      votesCount: net,
    };

    if (up) data.upvotesCount = up;
    if (down) data.downvotesCount = down;

    return data;
  };

  // ================= REMOVE =================
  if (existingVote && existingVote.value === value) {
    await prisma.$transaction(async (tx) => {
      await tx.vote.delete({
        where: { userId_ideaId: { userId, ideaId } },
      });

      await tx.idea.update({
        where: { id: ideaId },
        data:
          value === 1
            ? buildUpdate({ decrement: 1 }, undefined, idea.votesCount - value)
            : buildUpdate(undefined, { decrement: 1 }, idea.votesCount - value),
      });
    });

    return { action: "removed", currentVote: 0 };
  }

  // ================= CREATE / UPDATE =================
  await prisma.$transaction(async (tx) => {
    if (!existingVote) {
      // NEW
      await tx.vote.create({
        data: { userId, ideaId, value },
      });

      await tx.idea.update({
        where: { id: ideaId },
        data:
          value === 1
            ? buildUpdate({ increment: 1 }, undefined, idea.votesCount + 1)
            : buildUpdate(undefined, { increment: 1 }, idea.votesCount - 1),
      });
    } else {
      // CHANGE
      const prevValue = existingVote.value;

      await tx.vote.update({
        where: { userId_ideaId: { userId, ideaId } },
        data: { value },
      });

      const diff = value - prevValue;

      await tx.idea.update({
        where: { id: ideaId },
        data: {
          votesCount: { increment: diff },

          ...(prevValue === 1 && value === -1
            ? {
                upvotesCount: { decrement: 1 },
                downvotesCount: { increment: 1 },
              }
            : prevValue === -1 && value === 1
              ? {
                  downvotesCount: { decrement: 1 },
                  upvotesCount: { increment: 1 },
                }
              : {}),
        },
      });
    }
  });

  return {
    action: existingVote ? "updated" : "added",
    currentVote: value,
  };
};

/**@desc Get my voted ideas
* @route GET /api/v1/votes/my-ideas
* @access Private (Member)
* Steps:
1. Get userId from req.user
2. Call service layer to get voted ideas with pagination
3. Send response with data and meta
*/
const getMyVotedIdeas = async (userId: string, query: IQueryParams) => {
  // ==============================
  // QUERY BUILDER INIT
  // ==============================
  const queryBuilder = new QueryBuilder(prisma.vote, query, {
    searchableFields: ["idea.title"],
    filterableFields: ["idea.categoryId"],
  });

  // ==============================
  // MAIN DATA QUERY
  // ==============================
  const result = await queryBuilder
    .search() // search
    .filter() // filter
    .paginate() // pagination
    .sort() // sorting
    .include({
      idea: {
        include: {
          author: true,
          category: true,
        },
      },
    })
    .where({
      userId, // logged user filter
    })
    .execute();

  // ==============================
  // DASHBOARD STATS
  // ==============================

  // group by vote type
  const stats = await prisma.vote.groupBy({
    by: ["value"],
    where: { userId },
    _count: true,
  });

  const upvotes = stats.find((s) => s.value === 1)?._count || 0;
  const downvotes = stats.find((s) => s.value === -1)?._count || 0;

  // additional stats
  const totalVotes = upvotes + downvotes;

  // last 7 days votes (trend useful)
  const last7DaysVotes = await prisma.vote.count({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  // unique ideas voted
  const uniqueIdeas = await prisma.vote.findMany({
    where: { userId },
    select: { ideaId: true },
    distinct: ["ideaId"],
  });

  return {
    data: result.data,
    meta: result.meta,

    // dashboard counts
    counts: {
      upvotes,
      downvotes,
      totalVotes,
      last7DaysVotes,
      totalIdeasVoted: uniqueIdeas.length,
    },
  };
};

export const VoteService = {
  toggleVote,
  getMyVotedIdeas,
};
