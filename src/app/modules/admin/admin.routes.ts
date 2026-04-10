import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { AdminController } from "./admin.controller";

const adminRoutes: Router = Router();

/**
 * @desc Admin: Get all ideas (moderation panel)
 * @route GET /api/v1/admin/ideas
 * @access Private (Admin)
 */
adminRoutes.get(
  "/ideas",
  checkAuth(Role.ADMIN),
  AdminController.getAllIdeasAdmin,
);

/**
 * @desc Get single idea (admin view)
 * @route GET /api/v1/admin/ideas/:id
 * @access Private (Admin)
 */
adminRoutes.get(
  "/ideas/:id",
  checkAuth(Role.ADMIN),
  AdminController.getSingleIdea,
);

export default adminRoutes;
