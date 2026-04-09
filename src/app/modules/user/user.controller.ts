import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { UserService } from "./user.service";

/**
 * @desc    Update logged-in user's profile
 * @route   PATCH /api/v1/users/profile
 * @access  Private
 */
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return sendResponse(res, {
      httpStatusCode: status.UNAUTHORIZED,
      success: false,
      message: "Unauthorized",
    });
  }

  const updatedUser = await UserService.updateProfile(userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

/**
 * @desc    Promote user to admin
 * @route   PATCH /api/v1/users/make-admin/:id
 * @access  Admin only
 */
const makeAdmin = catchAsync(async (req: Request, res: Response) => {
  const targetUserId = req.params.id;

  const updatedUser = await UserService.makeAdmin(targetUserId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User promoted to admin successfully",
    data: updatedUser,
  });
});

/**
 * @desc    Block a user
 * @route   PATCH /api/v1/users/block/:id
 * @access  Admin only
 */
const blockUser = catchAsync(async (req: Request, res: Response) => {
  const targetUserId = req.params.id;

  const result = await UserService.blockUser(targetUserId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User blocked successfully",
    data: result,
  });
});

/**
 * @desc    Unblock a user
 * @route   PATCH /api/v1/users/unblock/:id
 * @access  Admin only
 */
const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const targetUserId = req.params.id;

  const result = await UserService.unblockUser(targetUserId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User unblocked successfully",
    data: result,
  });
});

/**
 * @desc    Get a single user by ID
 * @route   GET /api/v1/users/:id
 * @access  Admin only
 */
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserService.getUserById(id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

/**
 * @desc    Get all users with search, filter, pagination
 * @route   GET /api/v1/users
 * @access  Admin only
 */
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers(
    req.query as Record<string, string>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const UserController = {
  updateProfile,
  makeAdmin,
  blockUser,
  unblockUser,
  getUserById,
  getAllUsers,
};
