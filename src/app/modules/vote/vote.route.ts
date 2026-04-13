import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { VoteController } from "./vote.controller";

const VoteRoutes: Router = Router();

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
VoteRoutes.post("/:ideaId", checkAuth(Role.MEMBER), VoteController.toggleVote);

/**@desc Get my voted ideas
* @route GET /api/v1/votes/my-ideas
* @access Private (Member)
* Steps:
1. Get userId from req.user
2. Call service layer to get voted ideas with pagination
3. Send response with data and meta
*/
VoteRoutes.get(
  "/my-voted-ideas",
  checkAuth(Role.MEMBER),
  VoteController.getMyVotedIdeas,
);

export default VoteRoutes;
