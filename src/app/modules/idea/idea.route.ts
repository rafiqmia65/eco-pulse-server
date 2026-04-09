import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { createIdeaSchema } from "./idea.validation";
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

export default ideaRoutes;
