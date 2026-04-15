import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminService } from "./admin.service";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

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
  const result = await AdminService.getAllIdeasAdmin(req.query as IQueryParams);

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
  const result = await AdminService.getAdminStats();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin stats fetched successfully",
    data: result,
  });
});

export const AdminController = {
  getSingleIdea,
  getAllIdeasAdmin,
  rejectIdea,
  approveIdea,
  getAdminStats,
};
