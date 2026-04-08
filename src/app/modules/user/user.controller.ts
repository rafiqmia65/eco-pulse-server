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

export const UserController = {
  updateProfile,
  makeAdmin,
};
