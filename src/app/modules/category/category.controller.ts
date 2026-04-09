import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { CategoryService } from "./category.service";

/**
 * @desc Create category
 * @route POST /api/v1/categories
 * @access Admin
 */
const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategory(req.body);

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
  const result = await CategoryService.getAllCategories();

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

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  updateCategory,
};
