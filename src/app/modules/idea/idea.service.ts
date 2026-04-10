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

export const IdeaService = {
  createIdea,
  submitIdea,
};
