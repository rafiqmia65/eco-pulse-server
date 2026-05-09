import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { UserService } from "./user.service";
import { CacheUtils } from "../../utils/cache";

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

  // Invalidate user caches
  await CacheUtils.deleteCache(`user_me:${userId}`);
  await CacheUtils.deleteCache(`user_stats:${userId}`);
  await CacheUtils.clearCacheByPattern("users:*");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

/**
 * @desc Get logged-in user stats
 * @route GET /api/v1/users/stats
 * @access Private (Member)
 */
const getUserStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const cacheKey = `user_stats:${userId}`;

  const cachedStats = await CacheUtils.getCache(cacheKey);
  if (cachedStats) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "User stats fetched successfully (from cache)",
      data: cachedStats,
    });
  }

  const result = await UserService.getUserStats(userId as string);

  // Cache for 10 minutes
  await CacheUtils.setCache(cacheKey, result, 600);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User stats fetched successfully",
    data: result,
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

  // Invalidate user caches
  await CacheUtils.deleteCache(`user_me:${targetUserId}`);
  await CacheUtils.deleteCache(`user_stats:${targetUserId}`);
  await CacheUtils.clearCacheByPattern("users:*");

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

  // Invalidate user caches
  await CacheUtils.deleteCache(`user_me:${targetUserId}`);
  await CacheUtils.deleteCache(`user_stats:${targetUserId}`);
  await CacheUtils.clearCacheByPattern("users:*");

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

  // Invalidate user caches
  await CacheUtils.deleteCache(`user_me:${targetUserId}`);
  await CacheUtils.deleteCache(`user_stats:${targetUserId}`);
  await CacheUtils.clearCacheByPattern("users:*");

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
  const cacheKey = `users:id:${id}`;

  const cachedUser = await CacheUtils.getCache(cacheKey);
  if (cachedUser) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "User fetched successfully (from cache)",
      data: cachedUser,
    });
  }

  const user = await UserService.getUserById(id as string);

  // Cache for 5 minutes
  await CacheUtils.setCache(cacheKey, user, 300);

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
  const query = req.query as Record<string, string>;
  const cacheKey = `users:all:${JSON.stringify(query)}`;

  const cachedUsers = await CacheUtils.getCache(cacheKey);
  if (cachedUsers) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Users retrieved successfully (from cache)",
      // @ts-expect-error - cached data structure matches result
      meta: cachedUsers.meta,
      // @ts-expect-error - cached data structure matches result
      data: cachedUsers.data,
    });
  }

  const result = await UserService.getAllUsers(query);

  // Cache for 5 minutes
  await CacheUtils.setCache(cacheKey, result, 300);

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
  getUserStats,
};
