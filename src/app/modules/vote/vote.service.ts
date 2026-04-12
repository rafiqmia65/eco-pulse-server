/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import AppError from "../../helpers/errorHelpers/AppError";
import {
  IdeaStatus,
  PaymentStatus,
  Role,
} from "../../../../generated/prisma/enums";

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

export const VoteService = {
  toggleVote,
};
