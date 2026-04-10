import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { createIdeaSchema, ideaUpdateSchema } from "./idea.validation";
import { IdeaController } from "./idea.controller";
import { Role } from "../../../../generated/prisma/enums";

const ideaRoutes: Router = Router();

/**
 * @desc Create a new Idea
 * @route POST /api/v1/ideas
 * @access Private (Member)
 */
ideaRoutes.post(
  "/",
  checkAuth(Role.MEMBER),
  validateRequest(createIdeaSchema),
  IdeaController.createIdea,
);

/**
 * @desc Submit draft idea for review
 * @route PATCH /api/v1/ideas/:id/submit
 * @access Private (Member)
 */
ideaRoutes.patch(
  "/:id/submit",
  checkAuth(Role.MEMBER),
  IdeaController.submitIdea,
);

/**
 * @desc Update idea
 * @route PATCH /api/v1/ideas/:id
 * @access Private (Member) - Only for Draft or Rejected ideas
 * - Only the author can update
 * - If idea is in REVIEW or APPROVED status, it cannot be updated
 */
ideaRoutes.patch(
  "/:id",
  checkAuth(Role.MEMBER),
  validateRequest(ideaUpdateSchema),
  IdeaController.updateIdea,
);

export default ideaRoutes;
