/* eslint-disable @typescript-eslint/no-explicit-any */
import { IdeaStatus } from "../../../../generated/prisma/enums";
import AppError from "../../helpers/errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
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
 */
/**
 * @desc Update idea
 * Rules:
 * - Only author can update
 * - Only DRAFT or REJECTED ideas can be updated
 * - User can:
 *    → save as draft again
 *    → or submit for review
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

export const IdeaService = {
  createIdea,
  submitIdea,
  updateIdea,
};
