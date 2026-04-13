import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IdeaService } from "./idea.service";
import { IQueryParams } from "../../interfaces/query.interface";
import { Role } from "../../../../generated/prisma/enums";

/**
 * @desc Member: Create a new Idea
 * @route POST /api/v1/ideas
 * @access Private (Member)
 */
const createIdea = catchAsync(async (req: Request, res: Response) => {
  const authorId = req.user?.userId;
  const payload = req.body;

  const idea = await IdeaService.createIdea(payload, authorId as string);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: payload.isDraft
      ? "Idea saved as draft"
      : "Idea submitted for review",
    data: idea,
  });
});

/**
 * @desc Get all ideas (public listing)
 * @route GET /api/v1/ideas
 * @access Public
 * Features:
 * - Search by title and description
 * - Filter by status, category, author, date range
 * - Pagination
 * - Sorting by newest, most voted, etc.
 */
const getAllIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getAllIdeas(req.query as IQueryParams);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc Submit draft idea
 * @route PATCH /api/v1/ideas/:id/submit
 * @access Private (Member)
 */
const submitIdea = catchAsync(async (req: Request, res: Response) => {
  const ideaId = req.params.id;
  const userId = req.user?.userId;

  const result = await IdeaService.submitIdea(
    ideaId as string,
    userId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea submitted for review successfully",
    data: result,
  });
});

/**
 * @desc Update idea
 * @route PATCH /api/v1/ideas/:id
 * @access Private (Member) - Only for Draft or Rejected ideas
 * - Only the author can update
 * - If idea is in REVIEW or APPROVED status, it cannot be updated
 */
const updateIdea = catchAsync(async (req: Request, res: Response) => {
  const ideaId = req.params.id;
  const userId = req.user?.userId;
  const payload = req.body;

  const result = await IdeaService.updateIdea(
    ideaId as string,
    userId as string,
    payload,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea updated successfully",
    data: result,
  });
});

/**
 * @desc Get single idea (owner view)
 * @route GET /api/v1/ideas/me/:id
 * @access Private (Member - only owner)
 */
const getMySingleIdea = catchAsync(async (req: Request, res: Response) => {
  const ideaId = req.params.id;
  const userId = req.user?.userId as string;

  const result = await IdeaService.getMySingleIdea(ideaId as string, userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My idea fetched successfully",
    data: result,
  });
});

/**
 * @desc Get all ideas of logged-in user
 * @route GET /api/v1/ideas/my-ideas
 * @access Private (Member)
 *
 * Features:
 * - Search
 * - Filter (status and category)
 * - Pagination
 * - Sorting
 */
const getMyIdeas = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;

  const result = await IdeaService.getMyIdeas(
    userId,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My ideas fetched successfully",
    data: result.data,
    meta: result.meta,
    counts: result.counts,
  });
});

/**
 * @desc Get single idea with access control
 * @route GET /api/v1/ideas/access/:id
 * @access Public (with different levels of access based on role and ownership)
 */
const getIdeaAccess = catchAsync(async (req: Request, res: Response) => {
  const ideaId = req.params.id;
  const userId = req.user?.userId;
  const role = req.user?.role as Role;

  const result = await IdeaService.getIdeaAccess(
    ideaId as string,
    userId,
    role,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea access fetched successfully",
    data: result,
  });
});

/**
 * @desc Get latest 8 approved ideas for homepage
 * @route GET /api/v1/ideas/latest
 * @access Public (user optional)
 */
const getLatestIdeas = catchAsync(async (req: Request, res: Response) => {
  // user optional (not logged in users will see the same latest ideas, but we can use userId to personalize if needed)
  const userId = req.user?.userId;

  const result = await IdeaService.getLatestIdeas(userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Latest ideas fetched successfully",
    data: result,
  });
});

/**
 * @desc Get trending ideas for homepage
 * @route GET /api/v1/ideas/trending
 * @access Public
 *
 * - Trending = most votes + comments in last 7 days
 */
const getTrendingIdeas = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId; // optional user

  const result = await IdeaService.getTrendingIdeas(userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Trending ideas (last 7 days) fetched successfully",
    data: result,
  });
});

/**
 * @desc Delete Idea (Only unpublished)
 * @route DELETE /api/v1/ideas/:id
 * @access Private (Member - only owner)
 */
const deleteIdea = catchAsync(async (req: Request, res: Response) => {
  const ideaId = req.params.id;
  const userId = req.user?.userId;

  const result = await IdeaService.deleteIdea(
    ideaId as string,
    userId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea deleted successfully",
    data: result,
  });
});

export const IdeaController = {
  createIdea,
  getAllIdeas,
  submitIdea,
  updateIdea,
  getMySingleIdea,
  getMyIdeas,
  getIdeaAccess,
  getLatestIdeas,
  getTrendingIdeas,
  deleteIdea,
};
