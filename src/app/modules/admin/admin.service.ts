/* eslint-disable @typescript-eslint/no-explicit-any */
import { IdeaStatus } from "../../../../generated/prisma/enums";
import AppError from "../../helpers/errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";

/**
 * @desc Get single idea (admin view)
 * @route GET /api/v1/admin/ideas/:id
 * @access Private (Admin)
 */

const getSingleIdea = async (ideaId: string, page: number, limit: number) => {
  // Fetch idea
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

  // Not found check
  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // BLOCK only DRAFT
  if (idea.status === IdeaStatus.DRAFT) {
    throw new AppError(403, "Draft ideas are not accessible to admin");
  }

  // Comments (pagination via QueryBuilder)
  const comments = await new QueryBuilder(prisma.comment as any, {
    page: page.toString(),
    limit: limit.toString(),
    sortBy: "createdAt",
    sortOrder: "desc",
  })
    .paginate()
    .sort()
    .where({
      ideaId: idea.id,
      parentId: null,
    })
    .include({
      user: true,
      replies: {
        include: {
          user: true,
        },
      },
    })
    .execute();

  return {
    ...idea,
    comments: comments.data,
    commentsMeta: comments.meta,
  };
};

export const AdminService = {
  getSingleIdea,
};
