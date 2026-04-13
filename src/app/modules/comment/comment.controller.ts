import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { CommentService } from "./comment.service";
import { Role } from "../../../../generated/prisma/enums";
import {
  ICreateCommentPayload,
  IUpdateCommentPayload,
} from "./comment.interface";

/*
* @desc Create a comment for an idea
* @route POST /api/v1/comments/:ideaId
* @access Private (Member, Admin)
* Steps:
1. Get userId and userRole from req.user
*/

const createComment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const userRole = req.user?.role as Role;

  const { ideaId } = req.params;
  const { content, parentId } = req.body;

  const result = await CommentService.createComment({
    userId,
    userRole,
    ideaId,
    content,
    parentId,
  } as ICreateCommentPayload);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment created successfully",
    data: result,
  });
});

/*
 * @desc Update my comment
 * @route PUT /api/v1/comments/:commentId
 * @access Private (Member, Admin)
 */

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const userRole = req.user?.role as Role;

  const { commentId } = req.params;
  const { content } = req.body;

  const result = await CommentService.updateComment({
    userId,
    userRole,
    commentId,
    content,
  } as IUpdateCommentPayload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment updated successfully",
    data: result,
  });
});

export const CommentController = {
  createComment,
  updateComment,
};
