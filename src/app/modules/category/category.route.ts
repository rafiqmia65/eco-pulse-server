import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";
import { CategoryController } from "./category.controller";

const categoryRoutes: Router = Router();

/**
 * @desc Create category
 * @route POST /api/v1/categories
 * @access Admin
 */
categoryRoutes.post(
  "/",
  checkAuth(Role.ADMIN),
  validateRequest(createCategorySchema),
  CategoryController.createCategory,
);

/**
 * @desc Get all active categories
 * @route GET /api/v1/categories
 * @access Public
 */
categoryRoutes.get("/", CategoryController.getAllCategories);

/**
 * @desc Update category
 * @route PATCH /api/v1/categories/:id
 * @access Admin
 */
categoryRoutes.patch(
  "/:id",
  checkAuth(Role.ADMIN),
  validateRequest(updateCategorySchema),
  CategoryController.updateCategory,
);

/**
 * @desc Delete category
 * @route DELETE /api/v1/categories/:id
 * @access Admin
 */
categoryRoutes.delete(
  "/:id",
  checkAuth(Role.ADMIN),
  CategoryController.deleteCategory,
);

export default categoryRoutes;
