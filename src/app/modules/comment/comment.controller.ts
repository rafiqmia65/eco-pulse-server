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

/**
 * @desc    Create a new comment or reply on an idea
 * @route   POST /api/v1/comments/:ideaId
 * @access  Private (Member, Admin)
 *
 * Flow:
 * 1. Extract authenticated user info (userId, role)
 * 2. Get ideaId from params
 * 3. Get content & optional parentId from body
 * 4. Call service to handle business logic (validation, paid access, etc.)
 * 5. Return created comment
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

/**
 * @desc    Update an existing comment (only owner)
 * @route   PATCH /api/v1/comments/:commentId
 * @access  Private (Member, Admin)
 *
 * Rules:
 * - Only the comment owner can update
 * - Deleted comments cannot be updated
 *
 * Flow:
 * 1. Extract user info
 * 2. Get commentId from params
 * 3. Get updated content from body
 * 4. Call service for validation & update
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

/**
 * @desc    Delete a comment (soft delete)
 * @route   DELETE /api/v1/comments/:commentId
 * @access  Private (Member, Admin)
 *
 * Rules:
 * - Owner can delete their own comment
 * - Admin can delete any comment
 * - Soft delete is applied (content replaced + isDeleted = true)
 *
 * Important:
 * - Child comments will remain visible (if using onDelete: SetNull)
 * - UI should display: "This comment has been deleted"
 *
 * Flow:
 * 1. Extract user info
 * 2. Get commentId from params
 * 3. Call service for permission check & soft delete
 */
const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const userRole = req.user?.role as Role;

  const { commentId } = req.params;

  const result = await CommentService.deleteComment(
    userId,
    userRole,
    commentId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment deleted successfully",
    data: result,
  });
});

export const CommentController = {
  createComment,
  updateComment,
  deleteComment,
};
