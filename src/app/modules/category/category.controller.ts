import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { CategoryService } from "./category.service";
import { CacheUtils } from "../../utils/cache";

/**
 * @desc Create category
 * @route POST /api/v1/categories
 * @access Admin
 */
const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategory(req.body);

  // Invalidate cache
  await CacheUtils.deleteCache("categories:all");

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

/**
 * @desc Get all active categories
 * @route GET /api/v1/categories
 * @access Public
 */
const getAllCategories = catchAsync(async (_req: Request, res: Response) => {
  const cacheKey = "categories:all";

  // Try to get from cache
  const cachedCategories = await CacheUtils.getCache(cacheKey);
  if (cachedCategories) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Categories retrieved successfully (from cache)",
      data: cachedCategories,
    });
  }

  const result = await CategoryService.getAllCategories();

  // Set cache for 1 hour
  await CacheUtils.setCache(cacheKey, result, 3600);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});

/**
 * @desc Update category
 * @route PATCH /api/v1/categories/:id
 * @access Admin
 */
const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await CategoryService.updateCategory(id as string, req.body);

  // Invalidate cache
  await CacheUtils.deleteCache("categories:all");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

/**
 * @desc Delete category (soft delete)
 * @route DELETE /api/v1/categories/:id
 * @access Admin
 */
const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await CategoryService.deleteCategory(id as string);

  // Invalidate cache
  await CacheUtils.deleteCache("categories:all");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});

/**
 * @desc Admin: Get all categories with optional status filter
 * @route GET /api/v1/categories/admin?status=active|deleted|all
 * @access Admin
 */
const getAllCategoriesAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const statusFilter = req.query.status as
      | "active"
      | "deleted"
      | "all"
      | undefined;

    const result = await CategoryService.getAllCategoriesAdmin(statusFilter);

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Categories fetched successfully",
      data: result,
    });
  },
);

/**
 * @desc Admin: Recover a deleted category
 * @route PATCH /api/v1/categories/admin/recover/:id
 * @access Admin
 */
const recoverCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await CategoryService.recoverCategory(id as string);

  // Invalidate cache
  await CacheUtils.deleteCache("categories:all");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category recovered successfully",
    data: result,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getAllCategoriesAdmin,
  recoverCategory,
};
