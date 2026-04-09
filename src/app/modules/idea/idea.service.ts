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

export const IdeaService = {
  createIdea,
};
