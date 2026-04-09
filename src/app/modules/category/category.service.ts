/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { ICategory, IUpdateCategory } from "./category.interface";

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

/**
 * @desc Update category
 */
const updateCategory = async (id: string, payload: IUpdateCategory) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category || category.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  return await prisma.category.update({
    where: { id },
    data: {
      name: payload.name ?? category.name,
    },
  });
};

/**
 * @desc Soft delete category
 * @route DELETE /api/v1/categories/:id
 * @access Admin
 */
const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category || category.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  return await prisma.category.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
};

/**
 * @desc Admin: Get all categories with optional status filter
 * @param status "active" | "deleted" | "all"
 * @return List of categories based on filter
 */
const getAllCategoriesAdmin = async (status?: "active" | "deleted" | "all") => {
  // Prisma query
  const whereFilter: any = {};

  if (status === "active") whereFilter.isDeleted = false;
  else if (status === "deleted") whereFilter.isDeleted = true;
  // 'all' or undefined → no filter

  return await prisma.category.findMany({
    where: whereFilter,
    orderBy: { createdAt: "desc" },
  });
};

/**
 * @desc Admin: Recover a deleted category
 * @param id Category ID
 */
const recoverCategory = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category || !category.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Category not found or not deleted");
  }

  return await prisma.category.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null },
  });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getAllCategoriesAdmin,
  recoverCategory,
};
