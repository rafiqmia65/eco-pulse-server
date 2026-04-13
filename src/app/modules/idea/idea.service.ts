/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  IdeaStatus,
  PaymentStatus,
  Role,
} from "../../../../generated/prisma/enums";
import AppError from "../../helpers/errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IIdea } from "./idea.interface";

/**
 * Create a new Idea
 * @desc Member: Create a new Idea
 * @route POST /api/v1/ideas
 * @access Private (Member)
 */

const createIdea = async (payload: IIdea, authorId: string) => {
  const {
    title,
    problem,
    solution,
    description,
    image,
    slug,
    isPaid,
    price,
    categoryId,
    isDraft,
  } = payload;

  //  Check if category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError(
      400,
      "Invalid category. Please choose a valid category.",
    );
  }

  // Step 1: Check slug uniqueness if provided
  if (slug) {
    const existing = await prisma.idea.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new AppError(
        400,
        "Slug already exists. Please choose a different one.",
      );
    }
  }

  // Step 2: Determine initial status
  const status = isDraft ? IdeaStatus.DRAFT : IdeaStatus.REVIEW;

  // Step 3: Create idea in DB
  const idea = await prisma.idea.create({
    data: {
      title,
      problem,
      solution,
      description,
      image: image ?? null,
      slug: slug ?? null,
      isPaid: isPaid ?? false,
      price: isPaid ? price! : null, // strict check for paid ideas
      categoryId,
      authorId,
      status,
    },
  });

  return idea;
};

/**
 * Get all ideas with:
 * - pagination
 * - search
 * - filter (category, isPaid, author, votes range)
 * - sorting (latest, top voted, most commented)
 * - ONLY APPROVED ideas
 * - PAID idea → limited data
 * - VOTING SYSTEM (upvote/downvote/currentUserVote)
 */
const getAllIdeas = async (query: IQueryParams & { userId?: string }) => {
  // 1. Initialize QueryBuilder
  const qb = new QueryBuilder(prisma.idea, query, {
    searchableFields: ["title", "description", "problem", "solution"],
    filterableFields: [
      "categoryId",
      "isPaid",
      "authorId",
      "votesCount",
      "commentsCount",
    ],
  });

  // 2. Sorting Mapping
  const sortMap: Record<string, any> = {
    latest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    top_voted: { votesCount: "desc" },
    most_commented: { commentsCount: "desc" },
  };

  const sortBy = query.sortBy || "latest";

  // 3. Build Query
  qb.search()
    .filter()
    .paginate()
    .where({
      status: IdeaStatus.APPROVED,
    })
    .include({
      author: true,
      category: true,
      votes: true, // 🔥 IMPORTANT (added)
    });

  // override sorting
  (qb as any).query.orderBy = sortMap[sortBy] || { createdAt: "desc" };

  // 4. Execute
  const result = await qb.execute();

  // 5. Transform Response
  const modifiedData = result.data.map((idea: any) => {
    // -----------------------------
    // SHORT DESCRIPTION
    // -----------------------------
    const shortDescription =
      idea.description?.length > 100
        ? idea.description.slice(0, 100) + "..."
        : idea.description;

    // -----------------------------
    // VOTE CALCULATION
    // -----------------------------
    const upvotes = idea.votes?.filter((v: any) => v.value === 1).length || 0;

    const downvotes =
      idea.votes?.filter((v: any) => v.value === -1).length || 0;

    const votesCount = upvotes - downvotes;

    // -----------------------------
    // CURRENT USER VOTE
    // -----------------------------
    let currentUserVote: number | null = null;

    if (query.userId) {
      const vote = idea.votes?.find((v: any) => v.userId === query.userId);

      currentUserVote = vote ? vote.value : null;
    }

    // -----------------------------
    // PAID IDEA
    // -----------------------------
    if (idea.isPaid) {
      return {
        id: idea.id,
        title: idea.title,
        description: shortDescription,
        solution: "Unlock full solution by purchasing this idea",
        isLocked: true,
        image: idea.image,
        price: idea.price,
        isPaid: idea.isPaid,

        upvotes,
        downvotes,
        votesCount,
        currentUserVote,

        commentsCount: idea.commentsCount,
        category: idea.category,
        author: idea.author,
        createdAt: idea.createdAt,
      };
    }

    // -----------------------------
    // FREE IDEA
    // -----------------------------
    const shortSolution =
      idea.solution?.length > 50
        ? idea.solution.slice(0, 50) + "..."
        : idea.solution;

    return {
      id: idea.id,
      title: idea.title,
      description: shortDescription,
      solution: shortSolution,
      isLocked: false,
      image: idea.image,
      price: idea.price,
      isPaid: idea.isPaid,

      upvotes,
      downvotes,
      votesCount,
      currentUserVote,

      commentsCount: idea.commentsCount,
      category: idea.category,
      author: idea.author,
      createdAt: idea.createdAt,
    };
  });

  // 6. Return
  return {
    data: modifiedData,
    meta: result.meta,
  };
};

/**
 * Submit Draft Idea → Review
 * @desc Member: Submit a draft idea for review
 * @route PATCH /api/v1/ideas/:id/submit
 * @access Private (Member)
 */
const submitIdea = async (ideaId: string, userId: string) => {
  // Step 1: Find idea
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // Step 2: Check ownership
  if (idea.authorId !== userId) {
    throw new AppError(403, "You are not authorized to submit this idea");
  }

  // Step 3: Check current status
  if (idea.status !== IdeaStatus.DRAFT) {
    throw new AppError(400, "Only draft ideas can be submitted for review");
  }

  // Step 4: Update status → REVIEW
  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.REVIEW,
    },
  });

  return updatedIdea;
};

/**
 * @desc Update idea
 * @route PATCH /api/v1/ideas/:id
 * @access Private (Member) - Only for Draft or Rejected ideas
 * - Only the author can update
 * - If idea is in REVIEW or APPROVED status, it cannot be updated
 * - If isDraft is changed from true to false, status should change from DRAFT to REVIEW
 */
const updateIdea = async (
  ideaId: string,
  userId: string,
  payload: Partial<IIdea>,
) => {
  // Step 1: Find idea
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // Step 2: Ownership check
  if (idea.authorId !== userId) {
    throw new AppError(403, "You are not authorized to update this idea");
  }

  // Step 3: Status check (only draft or rejected)
  if (idea.status !== IdeaStatus.DRAFT && idea.status !== IdeaStatus.REJECTED) {
    throw new AppError(400, "Only draft or rejected ideas can be updated");
  }

  // Step 4: Slug uniqueness check
  if (payload.slug && payload.slug !== idea.slug) {
    const existing = await prisma.idea.findUnique({
      where: { slug: payload.slug },
    });

    if (existing) {
      throw new AppError(400, "Slug already exists.");
    }
  }

  // Step 5: Category validation
  if (payload.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: payload.categoryId },
    });

    if (!category) {
      throw new AppError(400, "Invalid category.");
    }
  }

  // Step 6: Build update data safely (avoid undefined)
  const updateData: any = {};

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.problem !== undefined) updateData.problem = payload.problem;
  if (payload.solution !== undefined) updateData.solution = payload.solution;
  if (payload.description !== undefined)
    updateData.description = payload.description;
  if (payload.image !== undefined) updateData.image = payload.image;
  if (payload.slug !== undefined) updateData.slug = payload.slug;
  if (payload.categoryId !== undefined)
    updateData.categoryId = payload.categoryId;

  if (payload.isPaid !== undefined) updateData.isPaid = payload.isPaid;

  // Step 7: Price logic
  if (payload.isPaid === true) {
    updateData.price = payload.price;
  } else if (payload.isPaid === false) {
    updateData.price = null;
  }

  // Step 8: 🔥 Status Transition Logic (MAIN PART)
  if (payload.isDraft === true) {
    // user wants to save as draft again
    updateData.status = IdeaStatus.DRAFT;
  } else if (payload.isDraft === false) {
    // user wants to submit for review
    updateData.status = IdeaStatus.REVIEW;
  }

  // Step 9: Update DB
  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: updateData,
  });

  return updatedIdea;
};

/**
 * @desc Get single idea (owner view)
 * @route GET /api/v1/ideas/me/:id
 * @access Private (Member - only owner)
 */
const getMySingleIdea = async (ideaId: string, userId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      author: true,
      category: true,
      votes: true,
      feedback: true, // one-to-one relation
      comments: {
        include: {
          user: true,
          replies: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // Only owner can access
  if (idea.authorId !== userId) {
    throw new AppError(403, "You are not allowed to view this idea");
  }

  // format response
  return {
    ...idea,
    feedback: idea.feedback
      ? {
          id: idea.feedback.id,
          message: idea.feedback.message,
        }
      : null,
  };
};

/**
 * Get all ideas of logged-in user (Member Dashboard)
 *
 * Features:
 * - Only returns current user's ideas
 * - Includes all statuses:
 *   DRAFT, REVIEW, APPROVED, REJECTED
 * - Supports:
 *   search (title, description)
 *   filter (status and category)
 *   pagination
 *   sorting
 */

const getMyIdeas = async (userId: string, query: IQueryParams) => {
  const queryBuilder = new QueryBuilder(prisma.idea, query, {
    searchableFields: ["title", "description"],
    filterableFields: ["status", "categoryId", "isPaid"],
  });

  const [ideasResult, total, draft, review, approved, rejected] =
    await Promise.all([
      queryBuilder
        .search()
        .filter()
        .sort()
        .paginate()
        .where({
          authorId: userId,
        })
        .include({
          category: true,
        })
        .execute(),

      prisma.idea.count({ where: { authorId: userId } }),

      prisma.idea.count({
        where: { authorId: userId, status: IdeaStatus.DRAFT },
      }),

      prisma.idea.count({
        where: { authorId: userId, status: IdeaStatus.REVIEW },
      }),

      prisma.idea.count({
        where: { authorId: userId, status: IdeaStatus.APPROVED },
      }),

      prisma.idea.count({
        where: { authorId: userId, status: IdeaStatus.REJECTED },
      }),
    ]);

  return {
    data: ideasResult.data,
    meta: ideasResult.meta,
    counts: {
      total,
      draft,
      review,
      approved,
      rejected,
    },
  };
};

/**
 * @desc Get single idea by id
 * @route GET /api/v1/ideas/access/:ideaId
 * @access Public (with different levels of access based on role and ownership)
 * Get single idea by ID
 * - Access depends on role and ownership
 * - If idea is APPROVED → public access
 * - If idea is REVIEW or REJECTED → only owner and admin can access
 * - If idea is PAID → only users who paid can access full details, others get limited view
 * - Comments are included for all users who can access the idea
 */

const getIdeaAccess = async (
  ideaId: string,
  userId?: string,
  role?: Role,
  page = 1,
  limit = 5,
) => {
  // helper: safe truncate
  const truncate = (text: string, length: number) =>
    text?.length > length ? text.slice(0, length) + "..." : text;

  // 1. Fetch idea
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
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
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // 2. Only APPROVED ideas are public
  if (idea.status !== IdeaStatus.APPROVED) {
    throw new AppError(403, "This idea is not publicly available");
  }

  // 3. Comments (shared for all access levels)
  const commentsResult = await new QueryBuilder(
    prisma.comment,
    {
      page: String(page),
      limit: String(limit),
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    {
      searchableFields: ["content"],
    },
  )
    .filter()
    .paginate()
    .sort()
    .where({
      ideaId: idea.id,
      parentId: null,
    })
    .include({
      user: true,
      replies: {
        include: { user: true },
      },
    })
    .execute();

  // 4. ADMIN → FULL ACCESS
  if (role === Role.ADMIN) {
    return {
      id: idea.id,
      title: idea.title,
      description: truncate(idea.description, 120),

      solution: idea.solution,
      isLocked: false,

      image: idea.image,
      price: idea.price,
      isPaid: idea.isPaid,

      votesCount: idea.votesCount,
      commentsCount: idea.commentsCount,

      category: idea.category,
      author: idea.author,
      createdAt: idea.createdAt,

      comments: commentsResult.data,
      commentsMeta: commentsResult.meta,

      accessLevel: "ADMIN_FULL_ACCESS",
      message: "Admin access: full idea visibility granted",
    };
  }

  // 5. OWNER → FULL ACCESS
  const isOwner = userId && idea.authorId === userId;
  if (isOwner) {
    return {
      id: idea.id,
      title: idea.title,
      description: truncate(idea.description, 120),

      solution: idea.solution,
      isLocked: false,

      image: idea.image,
      price: idea.price,
      isPaid: idea.isPaid,

      votesCount: idea.votesCount,
      commentsCount: idea.commentsCount,

      category: idea.category,
      author: idea.author,
      createdAt: idea.createdAt,

      comments: commentsResult.data,
      commentsMeta: commentsResult.meta,

      accessLevel: "OWNER_FULL_ACCESS",
      message: "You are the owner of this idea",
    };
  }

  // 6. FREE idea → FULL ACCESS
  if (!idea.isPaid) {
    return {
      id: idea.id,
      title: idea.title,
      description: truncate(idea.description, 120),

      solution: idea.solution,
      isLocked: false,

      image: idea.image,
      price: idea.price,
      isPaid: idea.isPaid,

      votesCount: idea.votesCount,
      commentsCount: idea.commentsCount,

      category: idea.category,
      author: idea.author,
      createdAt: idea.createdAt,

      comments: commentsResult.data,
      commentsMeta: commentsResult.meta,

      accessLevel: "PUBLIC_FREE",
    };
  }

  // 7. PAID check
  const hasPaid = idea.payments.some(
    (p) => p.userId === userId && p.status === PaymentStatus.PAID,
  );

  // 8. NOT PAID → LIMITED VIEW (CONSISTENT WITH TRENDING API)
  if (!hasPaid) {
    return {
      id: idea.id,
      title: idea.title,
      description: truncate(idea.description, 120),

      image: idea.image,
      price: idea.price,
      isPaid: idea.isPaid,

      votesCount: idea.votesCount,
      commentsCount: idea.commentsCount,

      category: idea.category,
      author: idea.author,
      createdAt: idea.createdAt,

      // locked like trending API
      solution: "Unlock full solution by purchasing this idea",
      isLocked: true,

      comments: commentsResult.data,
      commentsMeta: commentsResult.meta,

      accessLevel: "LIMITED_PREVIEW",
      message: "Buy this idea to unlock full content",
    };
  }

  // 9. PAID USER → FULL ACCESS
  return {
    id: idea.id,
    title: idea.title,
    description: truncate(idea.description, 120),

    solution: idea.solution,
    isLocked: false,

    image: idea.image,
    price: idea.price,
    isPaid: idea.isPaid,

    votesCount: idea.votesCount,
    commentsCount: idea.commentsCount,

    category: idea.category,
    author: idea.author,
    createdAt: idea.createdAt,

    comments: commentsResult.data,
    commentsMeta: commentsResult.meta,

    accessLevel: "PAID_FULL_ACCESS",
    message: "Payment verified - full access granted",
  };
};

/**
 * Get latest 8 approved ideas for homepage
 * @desc Get latest 8 approved ideas for homepage
 * @route GET /api/v1/ideas/latest
 * @access Public
 * @param userId (optional) - for current user vote
 */

const getLatestIdeas = async (userId?: string) => {
  const ideas = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      category: true,
      votes: true,
    },
  });

  const modifiedData = ideas.map((idea: any) => {
    // -----------------------------
    // 1. SHORT DESCRIPTION
    // -----------------------------
    const shortDescription =
      idea.description?.length > 100
        ? idea.description.slice(0, 100) + "..."
        : idea.description;

    // -----------------------------
    // 2. CURRENT USER VOTE
    // -----------------------------
    let currentUserVote: number | null = null;

    if (userId) {
      const vote = idea.votes.find((v: any) => v.userId === userId);
      currentUserVote = vote ? vote.value : null;
    }

    // -----------------------------
    // 3. VOTE CALCULATION
    // -----------------------------
    const upvotes = idea.votes.filter((v: any) => v.value === 1).length;
    const downvotes = idea.votes.filter((v: any) => v.value === -1).length;

    const votesCount = upvotes - downvotes; // net score

    // -----------------------------
    // 4. PAID IDEA HANDLING
    // -----------------------------
    if (idea.isPaid) {
      return {
        id: idea.id,
        title: idea.title,
        description: shortDescription,
        solution: "Unlock full solution by purchasing this idea",
        isLocked: true,
        image: idea.image,
        price: idea.price,
        isPaid: idea.isPaid,

        upvotes,
        downvotes,
        votesCount,
        currentUserVote,

        commentsCount: idea.commentsCount,
        category: idea.category,
        author: idea.author,
        createdAt: idea.createdAt,
      };
    }

    // -----------------------------
    // 5. FREE IDEA HANDLING
    // -----------------------------
    const shortSolution =
      idea.solution?.length > 50
        ? idea.solution.slice(0, 50) + "..."
        : idea.solution;

    return {
      id: idea.id,
      title: idea.title,
      description: shortDescription,
      solution: shortSolution,
      isLocked: false,
      image: idea.image,
      price: idea.price,
      isPaid: idea.isPaid,

      upvotes,
      downvotes,
      votesCount,
      currentUserVote,

      commentsCount: idea.commentsCount,
      category: idea.category,
      author: idea.author,
      createdAt: idea.createdAt,
    };
  });

  return modifiedData;
};

/**
 * Get trending ideas for homepage (Bonus)
 * - Trending = most votes + comments in last 7 days
 * @desc Get trending ideas for homepage
 * @route GET /api/v1/ideas/trending
 * @access Public
 */
const getTrendingIdeas = async (userId?: string) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const ideas = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      category: true,
      votes: true,
    },
  });

  // -----------------------------
  // ENGAGEMENT CALCULATION
  // -----------------------------
  const rankedIdeas = ideas
    .map((idea: any) => ({
      ...idea,
      engagementScore:
        idea.votesCount * 3 + idea.commentsCount * 2 + idea.watchListCount * 4,
    }))
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 6);

  // -----------------------------
  // TRANSFORM RESPONSE
  // -----------------------------
  const modifiedData = rankedIdeas.map((idea: any) => {
    const shortDescription =
      idea.description?.length > 100
        ? idea.description.slice(0, 100) + "..."
        : idea.description;

    // -----------------------------
    // CURRENT USER VOTE
    // -----------------------------
    let currentUserVote: number | null = null;

    if (userId) {
      const vote = idea.votes.find((v: any) => v.userId === userId);
      currentUserVote = vote ? vote.value : null;
    }

    // -----------------------------
    // VOTE STATS
    // -----------------------------
    const upvotes = idea.votes.filter((v: any) => v.value === 1).length;
    const downvotes = idea.votes.filter((v: any) => v.value === -1).length;

    const votesCount = upvotes - downvotes;

    // -----------------------------
    // PAID IDEA
    // -----------------------------
    if (idea.isPaid) {
      return {
        id: idea.id,
        title: idea.title,
        description: shortDescription,
        solution: "Unlock full solution by purchasing this idea",
        isLocked: true,
        image: idea.image,
        price: idea.price,
        isPaid: idea.isPaid,

        upvotes,
        downvotes,
        votesCount,
        currentUserVote,

        commentsCount: idea.commentsCount,
        category: idea.category,
        author: idea.author,
        createdAt: idea.createdAt,
      };
    }

    // -----------------------------
    // FREE IDEA
    // -----------------------------
    const shortSolution =
      idea.solution?.length > 50
        ? idea.solution.slice(0, 50) + "..."
        : idea.solution;

    return {
      id: idea.id,
      title: idea.title,
      description: shortDescription,
      solution: shortSolution,
      isLocked: false,
      image: idea.image,
      price: idea.price,
      isPaid: idea.isPaid,

      upvotes,
      downvotes,
      votesCount,
      currentUserVote,

      commentsCount: idea.commentsCount,
      category: idea.category,
      author: idea.author,
      createdAt: idea.createdAt,
    };
  });

  return modifiedData;
};

/**
 * @desc Delete Idea (Only unpublished)
 * @route DELETE /api/v1/ideas/:id
 * @access Private (Member - only owner)
 */
const deleteIdea = async (ideaId: string, userId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea) {
    throw new AppError(404, "Idea not found");
  }

  // only owner
  if (idea.authorId !== userId) {
    throw new AppError(403, "You are not allowed to delete this idea");
  }

  // only NOT approved
  if (idea.status === IdeaStatus.APPROVED) {
    throw new AppError(400, "Approved idea cannot be deleted");
  }

  await prisma.idea.delete({
    where: { id: ideaId },
  });

  return null;
};

export const IdeaService = {
  createIdea,
  getAllIdeas,
  submitIdea,
  updateIdea,
  getIdeaAccess,
  getMySingleIdea,
  getMyIdeas,
  getLatestIdeas,
  getTrendingIdeas,
  deleteIdea,
};
