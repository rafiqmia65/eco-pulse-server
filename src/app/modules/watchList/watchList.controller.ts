import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { WatchListService } from "./watchList.service";
import { IQueryParams } from "../../interfaces/query.interface";

/*@desc Toggle idea in watchList (add/remove)
* @route POST /api/v1/watchList/toggle/:id 
* @access Private (Member)
* Steps:
1. Get userId from req.user
2. Get ideaId from req.params
3. Call service layer to toggle watchList
4. Send response with action (added/removed) and isInWatchList boolean
*/
const toggleWatchList = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const ideaId = req.params.id;

  const result = await WatchListService.toggleWatchList(
    userId,
    ideaId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message:
      result.action === "added"
        ? "Idea added to watchList"
        : "Idea removed from watchList",
    data: result,
  });
});

/*
*@desc Get my watchList
* @route GET /api/v1/watchList/my 
* @access Private (Member)
* Steps:
1. Get userId from req.user
2. Call service layer to get watchList
3. Send response
*/
const getMyWatchList = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;

  const result = await WatchListService.getMyWatchList(
    userId,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "WatchList fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const WatchListController = {
  toggleWatchList,
  getMyWatchList,
};
