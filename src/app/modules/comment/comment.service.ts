import { prisma } from "../../lib/prisma";
import AppError from "../../helpers/errorHelpers/AppError";
import {
  IdeaStatus,
  PaymentStatus,
  Role,
} from "../../../../generated/prisma/enums";
import {
  ICreateCommentPayload,
  IUpdateCommentPayload,
} from "./comment.interface";

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

/*
 * @desc Update my comment
 * @route PUT /api/v1/comments/:commentId
 * @access Private (Member, Admin)
 * Steps:
 * 1. comment exist check
 * 2. soft deleted check
 * 3. permission check (only owner can update)
 * 4. update comment
 */
const updateComment = async (payload: IUpdateCommentPayload) => {
  const { userId, commentId, content } = payload;

  // 1️ comment exist check
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  // 2️ soft deleted check
  if (comment.isDeleted) {
    throw new AppError(400, "This comment is deleted");
  }

  // 3️ ONLY OWNER CAN UPDATE
  const isOwner = comment.userId === userId;

  if (!isOwner) {
    throw new AppError(403, "You can only update your own comment");
  }

  // 4️ update comment
  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
    },
    include: {
      user: true,
    },
  });

  return updated;
};

export const CommentService = {
  createComment,
  updateComment,
};
