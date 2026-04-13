import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { CommentService } from "./comment.service";
import { Role } from "../../../../generated/prisma/enums";
import { ICreateCommentPayload } from "./comment.interface";

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

export const CommentController = {
  createComment,
};
