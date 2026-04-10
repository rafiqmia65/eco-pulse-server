import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IdeaService } from "./idea.service";

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
 * @desc Submit draft idea
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

export const IdeaController = {
  createIdea,
  submitIdea,
};
