import { prisma } from "../../lib/prisma";
import AppError from "../../helpers/errorHelpers/AppError";
import { IdeaStatus } from "../../../../generated/prisma/enums";

const addToWatchList = async (userId: string, ideaId: string) => {
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

  // 3. Prevent duplicate
  const alreadyExists = await prisma.watchList.findUnique({
    where: {
      userId_ideaId: {
        userId,
        ideaId,
      },
    },
  });

  if (alreadyExists) {
    throw new AppError(400, "Idea already in watchList");
  }

  // 4. TRANSACTION (MAIN PART)
  const result = await prisma.$transaction(async (tx) => {
    const watchList = await tx.watchList.create({
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

    return watchList;
  });

  return result;
};

export const WatchListService = {
  addToWatchList,
};
