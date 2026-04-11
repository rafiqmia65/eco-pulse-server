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
 * @desc Get all approved ideas with advanced filtering, search, sorting & pagination
 * @route GET /api/v1/ideas
 * @access Public
 */
ideaRoutes.get("/", IdeaController.getAllIdeas);

/**
 * @desc Get my ideas (member dashboard)
 * @route GET /api/v1/ideas/my-ideas
 * @access Private (Member)
 */
ideaRoutes.get("/my-ideas", checkAuth(Role.MEMBER), IdeaController.getMyIdeas);

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

/**
 * @desc Get single idea (owner view)
 * @route GET /api/v1/ideas/my-idea/:id
 * @access Private (Member - only owner)
 */
ideaRoutes.get(
  "/my-idea/:id",
  checkAuth(Role.MEMBER),
  IdeaController.getMySingleIdea,
);

/**
 * @desc Get single idea with access control
 * @route GET /api/v1/ideas/access/:id
 * @access Public (with different levels of access based on role and ownership)
 */
ideaRoutes.get(
  "/access/:id",
  checkAuth(Role.MEMBER, Role.ADMIN), // IMPORTANT
  IdeaController.getIdeaAccess,
);

/**
 * @desc Get latest 8 approved ideas for homepage
 * @route GET /api/v1/ideas/latest
 * @access Public
 */
ideaRoutes.get("/latest", IdeaController.getLatestIdeas);

/**
 * @desc Get trending ideas (based on votes and comments in last 7 days)
 * @route GET /api/v1/ideas/trending
 * @access Public
 */
ideaRoutes.get("/trending", IdeaController.getTrendingIdeas);

export default ideaRoutes;
