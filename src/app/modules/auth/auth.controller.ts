import status from "http-status";
import { Request, Response } from "express";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";
import { catchAsync } from "../../shared/catchAsync";

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "User registration completed successfully",
    data: result,
  });
});

/**
 * @desc    Authenticate user and create session
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User login successful",
    data: result,
  });
});

/**
 * @desc    Logout user and invalidate session
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.["better-auth.session_token"];

  const result = await AuthService.logoutUser(token);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logout successful",
    data: result,
  });
});

export const AuthController = {
  registerUser,
  loginUser,
  logoutUser,
};
