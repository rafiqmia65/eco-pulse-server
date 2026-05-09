import { Request, Response } from "express";
import { VoteService } from "./vote.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { Role } from "../../../../generated/prisma/enums";
import { IQueryParams } from "../../interfaces/query.interface";
import { CacheUtils } from "../../utils/cache";

/* 
 *@desc Toggle vote (upvote/downvote) for an idea
 * @route POST /api/v1/votes/:ideaId
 * @access Private (Member)
 * Steps:
 1. Get userId from req.user
    2. Get ideaId from req.params
    3. Call service layer to toggle vote
    4. Send response with action (upvoted/downvoted/removed) and current vote counts
 */
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

  // Invalidate user's voted ideas cache
  await CacheUtils.clearCacheByPattern(`votes:${userId}:*`);
  // Also clear idea-specific caches as vote counts might have changed
  await CacheUtils.clearCacheByPattern("ideas:*");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote updated successfully",
    data: result,
  });
});

/**@desc Get my voted ideas
* @route GET /api/v1/votes/my-ideas
* @access Private (Member)
* Steps:
1. Get userId from req.user
2. Call service layer to get voted ideas with pagination
3. Send response with data and meta
*/
const getMyVotedIdeas = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const query = req.query as IQueryParams;
  const cacheKey = `votes:${userId}:${JSON.stringify(query)}`;

  const cachedVoted = await CacheUtils.getCache(cacheKey);
  if (cachedVoted) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "My voted ideas fetched successfully (from cache)",
      // @ts-expect-error - cached data structure matches result
      data: cachedVoted.data,
      // @ts-expect-error - cached data structure matches result
      meta: cachedVoted.meta,
      // @ts-expect-error - cached data structure matches result
      counts: cachedVoted.counts,
    });
  }

  const result = await VoteService.getMyVotedIdeas(userId, query);

  // Cache for 5 minutes
  await CacheUtils.setCache(cacheKey, result, 300);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My voted ideas fetched successfully",
    data: result.data,
    meta: result.meta,
    counts: result.counts,
  });
});

export const VoteController = {
  toggleVote,
  getMyVotedIdeas,
};
