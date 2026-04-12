import { Request, Response } from "express";
import { VoteService } from "./vote.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { Role } from "../../../../generated/prisma/enums";

const toggleVote = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  const { ideaId } = req.params;
  const { value } = req.body;

  const result = await VoteService.toggleVote(
    userId as string,
    ideaId as string,
    Number(value),
    userRole as Role,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote updated successfully",
    data: result,
  });
});

export const VoteController = {
  toggleVote,
};
