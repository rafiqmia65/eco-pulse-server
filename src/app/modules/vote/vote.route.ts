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

export default VoteRoutes;
