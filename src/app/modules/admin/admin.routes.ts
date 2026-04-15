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
 * @desc Admin: Approve idea
 * @route PATCH /api/v1/admin/ideas/approve/:id
 * @access Private (Admin)
 */
adminRoutes.patch(
  "/ideas/approve/:id",
  checkAuth(Role.ADMIN),
  AdminController.approveIdea,
);

/**
 * @desc Admin: Reject idea with feedback
 * @route PATCH /api/v1/admin/ideas/reject/:id
 * @access Private (Admin)
 */
adminRoutes.patch(
  "/ideas/reject/:id",
  checkAuth(Role.ADMIN),
  AdminController.rejectIdea,
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

/**
 * @desc Admin Dashboard Stats
 * @route GET /api/v1/admin/stats
 * @access Private (Admin)
 */
adminRoutes.get("/stats", checkAuth(Role.ADMIN), AdminController.getAdminStats);

/**
 * @desc Admin: Get all payments with stats
 * @route GET /api/v1/admin/payments
 * @access Private (Admin)
 */
adminRoutes.get(
  "/payments-admin",
  checkAuth(Role.ADMIN),
  AdminController.getAllPaymentsAdmin,
);

export default adminRoutes;
