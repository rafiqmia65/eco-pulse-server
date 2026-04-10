import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { AdminController } from "./admin.controller";

const adminRoutes: Router = Router();

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