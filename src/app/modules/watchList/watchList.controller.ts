import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { WatchListService } from "./watchList.service";

const addToWatchList = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const ideaId = req.params.id;

  const result = await WatchListService.addToWatchList(
    userId,
    ideaId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea added to watchList successfully",
    data: result,
  });
});

export const WatchListController = {
  addToWatchList,
};
