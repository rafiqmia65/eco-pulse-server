import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminService } from "./admin.service";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";
import { CacheUtils } from "../../utils/cache";

/**
 * @desc Admin: Get all ideas for moderation
 * @route GET /api/v1/admin/ideas
 * @access Private (Admin)
 *
 * Features:
 * - Search
 * - Filter by status
 * - Pagination
 * - Sorting
 */
const getAllIdeasAdmin = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as IQueryParams;
  const cacheKey = `admin:ideas:${JSON.stringify(query)}`;

  const cachedIdeas = await CacheUtils.getCache(cacheKey);
  if (cachedIdeas) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "All ideas fetched successfully (Admin) (from cache)",
      // @ts-expect-error - cached data structure matches result
      data: cachedIdeas.data,
      // @ts-expect-error - cached data structure matches result
      meta: cachedIdeas.meta,
      // @ts-expect-error - cached data structure matches result
      counts: cachedIdeas.counts,
    });
  }

  const result = await AdminService.getAllIdeasAdmin(query);

  // Cache for 5 minutes
  await CacheUtils.setCache(cacheKey, result, 300);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All ideas fetched successfully (Admin)",
    data: result.data,
    meta: result.meta,
    counts: result.counts,
  });
});

/**
 * @desc Admin: Approve idea
 * @route PATCH /api/v1/admin/ideas/approve/:id
 * @access Private (Admin)
 */
const approveIdea = catchAsync(async (req: Request, res: Response) => {
  const ideaId = req.params.id;

  const result = await AdminService.approveIdea(ideaId as string);

  // Invalidate admin and public idea caches
  await CacheUtils.clearCacheByPattern("admin:*");
  await CacheUtils.clearCacheByPattern("ideas:*");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea approved successfully",
    data: result,
  });
});

/**
 * @desc Admin: Reject idea with feedback
 * @route PATCH /api/v1/admin/ideas/reject/:id
 * @access Private (Admin)
 */
const rejectIdea = catchAsync(async (req: Request, res: Response) => {
  const ideaId = req.params.id;
  const { feedback } = req.body;

  const result = await AdminService.rejectIdea(ideaId as string, feedback);

  // Invalidate admin and public idea caches
  await CacheUtils.clearCacheByPattern("admin:*");
  await CacheUtils.clearCacheByPattern("ideas:*");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea rejected successfully",
    data: result,
  });
});

/**
 * @desc Get single idea (admin view)
 * @route GET /api/v1/admin/ideas/:id
 * @access Private (Admin)
 */
const getSingleIdea = catchAsync(async (req: Request, res: Response) => {
  const ideaId = req.params.id;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;

  const result = await AdminService.getSingleIdea(
    ideaId as string,
    page,
    limit,
  );

  sendResponse(res, {
    httpStatusCode: 200,
    success: true,
    message: "Admin idea fetched successfully",
    data: result,
  });
});

/**
 * @desc Get admin dashboard stats
 * @route GET /api/v1/admin/stats
 * @access Private (Admin)
 */
const getAdminStats = catchAsync(async (req: Request, res: Response) => {
  const cacheKey = "admin:stats";

  const cachedStats = await CacheUtils.getCache(cacheKey);
  if (cachedStats) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Admin stats fetched successfully (from cache)",
      data: cachedStats,
    });
  }

  const result = await AdminService.getAdminStats();

  // Cache for 15 minutes
  await CacheUtils.setCache(cacheKey, result, 900);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin stats fetched successfully",
    data: result,
  });
});

/**
 * @desc Admin: Get all payments with stats
 * @route GET /api/v1/admin/payments
 * @access Private (Admin)
 */
const getAllPaymentsAdmin = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as IQueryParams;
  const cacheKey = `admin:payments:${JSON.stringify(query)}`;

  const cachedPayments = await CacheUtils.getCache(cacheKey);
  if (cachedPayments) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "All payments fetched successfully (from cache)",
      data: cachedPayments,
    });
  }

  const result = await AdminService.getAllPaymentsAdmin(query);

  const responseData = {
    payments: result.data,
    stats: result.stats,
    meta: result.meta,
  };

  // Cache for 5 minutes
  await CacheUtils.setCache(cacheKey, responseData, 300);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All payments fetched successfully",
    data: {
      payments: result.data,
      stats: result.stats,
    },
    meta: result.meta,
  });
});

export const AdminController = {
  getSingleIdea,
  getAllIdeasAdmin,
  rejectIdea,
  approveIdea,
  getAdminStats,
  getAllPaymentsAdmin,
};
