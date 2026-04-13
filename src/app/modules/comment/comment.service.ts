import { prisma } from "../../lib/prisma";
import AppError from "../../helpers/errorHelpers/AppError";
import {
  IdeaStatus,
  PaymentStatus,
  Role,
} from "../../../../generated/prisma/enums";
import { ICreateCommentPayload } from "./comment.interface";

const createComment = async (payload: ICreateCommentPayload) => {
  const { userId, userRole, ideaId, content, parentId } = payload;

  // 1 idea check
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: { payments: true },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // 2 only approved idea
  if (idea.status !== IdeaStatus.APPROVED) {
    throw new AppError(400, "Idea not available for commenting");
  }

  // 3 paid access check
  if (idea.isPaid) {
    const hasPaid = idea.payments.some(
      (p) => p.userId === userId && p.status === PaymentStatus.PAID,
    );

    const hasAccess =
      userRole === Role.ADMIN || idea.authorId === userId || hasPaid;

    if (!hasAccess) {
      throw new AppError(403, "You must purchase this idea to comment");
    }
  }

  // 4️ parent comment check
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
    });

    if (!parentComment) {
      throw new AppError(404, "Parent comment not found");
    }
  }

  // 5️ create comment
  const comment = await prisma.comment.create({
    data: {
      content,
      userId,
      ideaId,
      parentId: parentId || null,
    },
    include: {
      user: true,
    },
  });

  return comment;
};

export const CommentService = {
  createComment,
};
