/* eslint-disable @typescript-eslint/no-explicit-any */
import { IdeaStatus } from "../../../../generated/prisma/enums";
import AppError from "../../helpers/errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";

/**
 * Admin: Get all ideas (moderation)
 *
 * Features:
 * - Fetch all ideas
 * - Filter by status
 * - Search
 * - Pagination & sorting
 * - Include author & category
 * - Counts for moderation dashboard
 */
const getAllIdeasAdmin = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder(prisma.idea, query, {
    searchableFields: ["title", "description"],
    filterableFields: ["status", "categoryId", "isPaid"],
  });

  const baseWhere = {
    status: {
      in: [IdeaStatus.REVIEW, IdeaStatus.APPROVED, IdeaStatus.REJECTED],
    },
  };

  const result = await queryBuilder
    .search()
    .where(baseWhere)
    .filter()
    .sort()
    .paginate()
    .include({
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      category: true,
    })
    .execute();

  const [total, review, approved, rejected] = await Promise.all([
    prisma.idea.count({ where: baseWhere }),

    prisma.idea.count({
      where: { status: IdeaStatus.REVIEW },
    }),

    prisma.idea.count({
      where: { status: IdeaStatus.APPROVED },
    }),

    prisma.idea.count({
      where: { status: IdeaStatus.REJECTED },
    }),
  ]);

  return {
    data: result.data,
    meta: result.meta,
    counts: {
      total,
      review,
      approved,
      rejected,
    },
  };
};

/**
 * @desc Admin: Approve idea
 * @route PATCH /api/v1/admin/ideas/approve/:id
 * @access Private (Admin)
 */
const approveIdea = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // optional business rule
  if (idea.status === IdeaStatus.APPROVED) {
    throw new AppError(400, "Idea is already approved");
  }

  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.APPROVED,
    },
  });

  return updatedIdea;
};

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
  getAllIdeasAdmin,
  approveIdea,
};
