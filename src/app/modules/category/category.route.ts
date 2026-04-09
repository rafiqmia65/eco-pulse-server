import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import { createCategorySchema } from "./category.validation";
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

export default categoryRoutes;
