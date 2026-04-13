import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import { createCommentSchema } from "./comment.validation";
import { CommentController } from "./comment.controller";

const CommentRoutes: Router = Router();

/**
 * @desc Create comment / reply
 * @route POST /api/v1/comments/:ideaId
 * @access Private (Member, Admin)
 */
CommentRoutes.post(
  "/:ideaId",
  checkAuth(Role.MEMBER, Role.ADMIN),
  validateRequest(createCommentSchema),
  CommentController.createComment,
);

// CommentRoutes.get("/:ideaId", CommentController.getComments);

// CommentRoutes.patch(
//   "/:commentId",
//   checkAuth(Role.MEMBER, Role.ADMIN),
//   validateRequest(updateCommentSchema),
//   CommentController.updateComment,
// );

// CommentRoutes.delete(
//   "/:commentId",
//   checkAuth(Role.MEMBER, Role.ADMIN),
//   CommentController.deleteComment,
// );

export default CommentRoutes;
