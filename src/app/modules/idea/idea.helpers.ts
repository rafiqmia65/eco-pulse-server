/* eslint-disable @typescript-eslint/no-explicit-any */

import { Comment, User } from "../../../../generated/prisma/client";

/**
 * =========================
 * TYPES
 * =========================
 */
export type VoteType = {
  id: string;
  userId: string;
  ideaId: string;
  value: number;
};

export type CommentWithRelations = Comment & {
  user: User;
  replies: (Comment & { user: User })[];
};

/**
 * =========================
 * VOTE HELPER
 * =========================
 */
export const getVoteData = (votes: VoteType[] = [], userId?: string) => {
  const upvotes = votes.filter((v) => v.value === 1).length;
  const downvotes = votes.filter((v) => v.value === -1).length;

  const votesCount = upvotes - downvotes;

  let currentUserVote: number | null = null;

  if (userId) {
    const myVote = votes.find((v) => v.userId === userId);
    currentUserVote = myVote ? myVote.value : null;
  }

  return {
    upvotes,
    downvotes,
    votesCount,
    currentUserVote,
  };
};

/**
 * =========================
 * COMMENT MAPPER
 * =========================
 */
export const mapComments = (comments: CommentWithRelations[] = []) => {
  return comments.map((c) => ({
    id: c.id,
    content: c.isDeleted ? "This comment has been deleted" : c.content,
    isDeleted: c.isDeleted,

    user: c.user,

    replies: (c.replies || []).map((r: any) => ({
      id: r.id,
      content: r.isDeleted ? "This reply has been deleted" : r.content,
      isDeleted: r.isDeleted,
      user: r.user,
      createdAt: r.createdAt,
    })),

    createdAt: c.createdAt,
  }));
};

/**
 * =========================
 * DESCRIPTION SHORTENER
 * =========================
 */
export const truncateText = (text: string, length = 100) => {
  if (!text) return "";
  return text.length > length ? text.slice(0, length) + "..." : text;
};
