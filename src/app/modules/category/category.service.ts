import { prisma } from "../../lib/prisma";
import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { ICategory } from "./category.interface";

/**
 * @desc Create category
 * @route POST /api/v1/categories
 * @access Admin
 */
const createCategory = async (payload: ICategory) => {
  const { name } = payload;

  // Prevent duplicate category
  const exists = await prisma.category.findUnique({
    where: { name },
  });

  if (exists) {
    throw new AppError(status.CONFLICT, "Category already exists");
  }

  return await prisma.category.create({
    data: { name },
  });
};

/**
 * @desc Get all active categories
 * @route GET /api/v1/categories
 * @access Public
 */
const getAllCategories = async () => {
  return await prisma.category.findMany({
    where: {
      isDeleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
};
