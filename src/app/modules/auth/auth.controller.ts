import status from "http-status";
import { Request, Response } from "express";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";
import { catchAsync } from "../../shared/catchAsync";
import { tokenUtils } from "../../utils/token";
import { CookieUtils } from "../../utils/cookie";

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body);

  // Set cookies
  tokenUtils.setAccessTokenCookie(res, result.accessToken);
  tokenUtils.setRefreshTokenCookie(res, result.refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, result.token as string);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "User registration completed successfully",
    data: {
      token: result.token,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    },
  });
});

/**
 * @desc    Authenticate user and create session
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  // Set cookies
  tokenUtils.setAccessTokenCookie(res, result.accessToken);
  tokenUtils.setRefreshTokenCookie(res, result.refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, result.token);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      token: result.token,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    },
  });
});

/**
 * @desc    Logout user and invalidate session
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.["better-auth.session_token"];

  const result = await AuthService.logoutUser(sessionToken);

  // Clear cookies
  CookieUtils.clearCookie(res, "accessToken", { path: "/" });
  CookieUtils.clearCookie(res, "refreshToken", { path: "/" });
  CookieUtils.clearCookie(res, "better-auth.session_token", { path: "/" });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logged out successfully",
    data: result,
  });
});

/**
 * @desc    Get current logged-in user info
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = catchAsync(async (req: Request, res: Response) => {
  // Ensure middleware has populated req.user
  if (!req.user) {
    return sendResponse(res, {
      httpStatusCode: status.UNAUTHORIZED,
      success: false,
      message: "Unauthorized! User info not found",
    });
  }

  // Fetch user info from database
  const user = await AuthService.getMe(req.user.userId);

  // Send user info response
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User info retrieved successfully",
    data: user,
  });
});

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user's password
 * @access  Private
 */

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const betterAuthSessionToken = req.cookies["better-auth.session_token"];

  const result = await AuthService.changePassword(
    payload,
    betterAuthSessionToken,
  );

  const { accessToken, refreshToken, token } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

export const AuthController = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  changePassword,
};
