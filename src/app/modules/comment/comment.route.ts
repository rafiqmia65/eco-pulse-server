import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import { createCommentSchema, updateCommentSchema } from "./comment.validation";
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

/*
 * @desc Update my comment
 * @route PUT /api/v1/comments/:commentId
 * @access Private (Member, Admin)
 */
CommentRoutes.patch(
  "/:commentId",
  checkAuth(Role.MEMBER, Role.ADMIN),
  validateRequest(updateCommentSchema),
  CommentController.updateComment,
);

/*
 * @desc Delete my comment
 * @route DELETE /api/v1/comments/:commentId
 * @access Private (Member, Admin)
 */
CommentRoutes.delete(
  "/:commentId",
  checkAuth(Role.MEMBER, Role.ADMIN),
  CommentController.deleteComment,
);

export default CommentRoutes;
