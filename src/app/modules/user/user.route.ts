import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { updateProfileSchema } from "./user.validation";

const UserRoutes: Router = Router();

/**
 * @desc    Update logged-in user's profile
 * @route   PATCH /api/v1/users/update-profile
 * @access  Private
 */
UserRoutes.patch(
  "/update-profile",
  checkAuth(Role.ADMIN, Role.MEMBER),
  validateRequest(updateProfileSchema),
  UserController.updateProfile,
);

/**
 * @desc Get user dashboard stats
 * @route GET /api/v1/users/stats
 * @access Private (Member)
 */
UserRoutes.get("/stats", checkAuth(Role.MEMBER), UserController.getUserStats);

/**
 * @desc    Promote user to admin
 * @route   PATCH /api/v1/users/make-admin/:id
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
UserRoutes.patch("/block/:id", checkAuth(Role.ADMIN), UserController.blockUser);

/**
 * @desc    Unblock a user
 * @route   PATCH /api/v1/users/unblock/:id
 * @access  Admin only
 */
UserRoutes.patch(
  "/unblock/:id",
  checkAuth(Role.ADMIN),
  UserController.unblockUser,
);

/**
 * @desc    Get a single user by ID
 * @route   GET /api/v1/users/:id
 * @access  Admin only
 */
UserRoutes.get("/:id", checkAuth(Role.ADMIN), UserController.getUserById);

/**
 * @desc    Get all users (search, filter, pagination)
 * @route   GET /api/v1/users
 * @access  Admin only
 *
 * Query Examples:
 *  ?searchTerm=John
 *  ?role=ADMIN
 *  ?role=MEMBER
 *  ?status=ACTIVE
 *  ?status=BLOCKED
 *  ?status=DELETED
 *  ?page=1&limit=10
 */
UserRoutes.get("/", checkAuth(Role.ADMIN), UserController.getAllUsers);

export default UserRoutes;
