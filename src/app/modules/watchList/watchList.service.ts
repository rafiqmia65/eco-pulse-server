/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import AppError from "../../helpers/errorHelpers/AppError";
import { IdeaStatus, PaymentStatus } from "../../../../generated/prisma/enums";
import { IQueryParams } from "../../interfaces/query.interface";

/*Toggle idea in watchList (add/remove)
Steps:
1. Check idea exists
2. Only approved idea allowed
3. Prevent owner
4. Check existing watchList entry
5. If exists -> remove from watchList & decrement count
6. If not exists -> add to watchList & increment count
7. Return action (added/removed) and isInWatchList boolean
*/
const toggleWatchList = async (userId: string, ideaId: string) => {
  // 1. Check idea exists
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // 2. Only approved idea allowed
  if (idea.status !== IdeaStatus.APPROVED) {
    throw new AppError(400, "Only approved ideas can be added to watchList");
  }

  // 3. Prevent owner
  if (idea.authorId === userId) {
    throw new AppError(403, "You cannot add your own idea to watchList");
  }

  // 4. Check existing watchlist entry
  const existing = await prisma.watchList.findUnique({
    where: {
      userId_ideaId: {
        userId,
        ideaId,
      },
    },
  });

  // =========================
  // REMOVE (if exists)
  // =========================
  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.watchList.delete({
        where: {
          userId_ideaId: {
            userId,
            ideaId,
          },
        },
      });

      await tx.idea.update({
        where: { id: ideaId },
        data: {
          watchListCount: {
            decrement: 1,
          },
        },
      });
    });

    return {
      action: "removed",
      isInWatchList: false,
    };
  }

  // =========================
  // ADD (if not exists)
  // =========================
  await prisma.$transaction(async (tx) => {
    await tx.watchList.create({
      data: {
        userId,
        ideaId,
      },
    });

    await tx.idea.update({
      where: { id: ideaId },
      data: {
        watchListCount: {
          increment: 1,
        },
      },
    });
  });

  return {
    action: "added",
    isInWatchList: true,
  };
};

/*
Get my watchList
Steps:
1. Build where condition based on search and category filter
2. Get total count for pagination
3. Fetch data with pagination
4. Map data to include short description, short solution, isLocked etc
5. Return data with meta
*/

const getMyWatchList = async (userId: string, query: IQueryParams) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const search = query.search || "";
  const categoryId = query.categoryId;

  const whereCondition: any = {
    userId,
    idea: {
      title: {
        contains: search,
        mode: "insensitive",
      },
    },
  };

  if (categoryId) {
    whereCondition.idea.categoryId = categoryId;
  }

  // ----------------------------
  // TOTAL
  // ----------------------------
  const total = await prisma.watchList.count({
    where: whereCondition,
  });

  // ----------------------------
  // DASHBOARD STATS
  // ----------------------------

  const totalPaidIdeas = await prisma.watchList.count({
    where: {
      userId,
      idea: { isPaid: true },
    },
  });

  const totalFreeIdeas = await prisma.watchList.count({
    where: {
      userId,
      idea: { isPaid: false },
    },
  });

  // NEW: UNLOCKED (PAID + PURCHASED)
  const totalUnlockedIdeas = await prisma.watchList.count({
    where: {
      userId,
      idea: {
        isPaid: true,
        payments: {
          some: {
            userId,
            status: PaymentStatus.PAID,
          },
        },
      },
    },
  });

  // ----------------------------
  // DATA
  // ----------------------------
  const result = (await prisma.watchList.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      idea: {
        include: {
          author: true,
          category: true,
          payments: {
            select: {
              userId: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: {
      idea: {
        createdAt: "desc",
      },
    },
  })) as any;

  const data = result.map((item: any) => {
    const idea = item.idea;

    const shortDescription =
      idea.description?.length > 100
        ? idea.description.slice(0, 100) + "..."
        : idea.description;

    const hasPaid = idea.payments?.some(
      (p: any) => p.userId === userId && p.status === PaymentStatus.PAID,
    );

    const isLocked = idea.isPaid && !hasPaid;

    const shortSolution =
      idea.solution?.length > 50
        ? idea.solution.slice(0, 50) + "..."
        : idea.solution;

    return {
      id: idea.id,
      title: idea.title,
      description: shortDescription,
      solution: isLocked
        ? "Unlock full solution by purchasing this idea"
        : shortSolution,

      isLocked,
      image: idea.image,
      price: idea.price,
      isPaid: idea.isPaid,

      votesCount: idea.votesCount,
      commentsCount: idea.commentsCount,
      watchListCount: idea.watchListCount,

      category: idea.category,
      author: idea.author,
      createdAt: idea.createdAt,
    };
  });

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),

      // dashboard stats
      totalPaidIdeas,
      totalFreeIdeas,
      totalUnlockedIdeas,
    },
  };
};

export const WatchListService = {
  toggleWatchList,
  getMyWatchList,
};
