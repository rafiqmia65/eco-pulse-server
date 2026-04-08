import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { updateProfileSchema } from "./user.validation";

const UserRoutes: Router = Router();

// PATCH /api/v1/users/update-profile
UserRoutes.patch(
  "/update-profile",
  checkAuth(Role.ADMIN, Role.MEMBER),
  validateRequest(updateProfileSchema),
  UserController.updateProfile,
);

/**
 * @desc    Promote user to admin
 * @route   PATCH /api/v1/user/make-admin/:id
 * @access  Admin only
 */
UserRoutes.patch(
  "/make-admin/:id",
  checkAuth(Role.ADMIN),
  UserController.makeAdmin,
);

/**
 * @desc    Block a user
 * @route   PATCH /api/v1/users/block/:id
 * @access  Admin only
 */
UserRoutes.patch(
  "/block/:id",
  checkAuth(Role.ADMIN), // only admin
  UserController.blockUser,
);

export default UserRoutes;
