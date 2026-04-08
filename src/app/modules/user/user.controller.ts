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

export const UserController = {
  updateProfile,
};
