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

/*
 * ============================================
 * CREATE COMMENT / REPLY
 * ============================================
 * Rules:
 * - Only approved ideas can be commented on
 * - Paid ideas require access (purchase/owner/admin)
 * - Cannot reply to a deleted comment
 */
const createComment = async (payload: ICreateCommentPayload) => {
  const { userId, userRole, ideaId, content, parentId } = payload;

  // 1️ Check if the idea exists
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: { payments: true },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // 2️ Only APPROVED ideas are available for commenting
  if (idea.status !== IdeaStatus.APPROVED) {
    throw new AppError(400, "Idea not available for commenting");
  }

  // 3️ Validate access for paid ideas
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

  // 4️ Validate parent comment (for reply)
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
    });

    if (!parentComment) {
      throw new AppError(404, "Parent comment not found");
    }

    // Prevent replying to a deleted comment
    if (parentComment.isDeleted) {
      throw new AppError(400, "Cannot reply to a deleted comment");
    }
  }

  // 5️ Create the comment
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
 * ============================================
 * UPDATE COMMENT
 * ============================================
 * Rules:
 * - Only the owner can update their comment
 * - Deleted comments cannot be updated
 */
const updateComment = async (payload: IUpdateCommentPayload) => {
  const { userId, commentId, content } = payload;

  // 1️ Check if the comment exists
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  // 2️ Prevent updating deleted comments
  if (comment.isDeleted) {
    throw new AppError(400, "This comment is deleted");
  }

  // 3️ Only the owner can update the comment
  if (comment.userId !== userId) {
    throw new AppError(403, "You can only update your own comment");
  }

  // 4️ Update the comment
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

/*
 * ============================================
 * DELETE COMMENT (SOFT DELETE)
 * ============================================
 * Rules:
 * - Both owner and admin can delete a comment
 * - Soft delete is used instead of permanent deletion
 * - Child comments remain even if parent is deleted
 */
const deleteComment = async (
  userId: string,
  userRole: Role,
  commentId: string,
) => {
  // 1️ Check if the comment exists
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  // 2️ Prevent deleting already deleted comments
  if (comment.isDeleted) {
    throw new AppError(400, "Comment already deleted");
  }

  // 3️ Check permission (Owner or Admin)
  const isOwner = comment.userId === userId;
  const isAdmin = userRole === Role.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError(403, "Not allowed to delete this comment");
  }

  // 4️ Perform soft delete
  const deleted = await prisma.comment.update({
    where: { id: commentId },
    data: {
      isDeleted: true,
    },
  });

  return deleted;
};

/*
 * ============================================
 * RESTORE COMMENT
 * ============================================
 * Rules:
 * - Only owner or admin can restore
 * - Only deleted comments can be restored
 */
const restoreComment = async (
  userId: string,
  userRole: Role,
  commentId: string,
) => {
  // 1️ Check if comment exists
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  // 2️ Check if already active
  if (!comment.isDeleted) {
    throw new AppError(400, "Comment is not deleted");
  }

  // 3️ Permission check
  const isOwner = comment.userId === userId;
  const isAdmin = userRole === Role.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError(403, "Not allowed to restore this comment");
  }

  // 4️ Restore
  const restored = await prisma.comment.update({
    where: { id: commentId },
    data: {
      isDeleted: false,
    },
  });

  return restored;
};

export const CommentService = {
  createComment,
  updateComment,
  deleteComment,
  restoreComment,
};
