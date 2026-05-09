import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { AIController } from "./ai.controller";

const AIRoutes: Router = Router();

/**
 * @route   GET /api/v1/ai/recommendations
 * @desc    Get smart recommendations for user
 * @access  Private
 */
AIRoutes.get(
  "/recommendations",
  checkAuth(Role.ADMIN, Role.MEMBER),
  AIController.getRecommendations,
);

/**
 * @route   POST /api/v1/ai/chat
 * @desc    AI Chat Assistant
 * @access  Private
 */
AIRoutes.post("/chat", checkAuth(Role.ADMIN, Role.MEMBER), AIController.chat);

/**
 * @route   GET /api/v1/ai/analyze/:ideaId
 * @desc    Analyze idea performance
 * @access  Private
 */
AIRoutes.get(
  "/analyze/:ideaId",
  checkAuth(Role.ADMIN, Role.MEMBER),
  AIController.analyzeIdea,
);

/**
 * @route   GET /api/v1/ai/conversations
 * @desc    Fetch user's conversation history
 * @access  Private
 */
AIRoutes.get(
  "/conversations",
  checkAuth(Role.ADMIN, Role.MEMBER),
  AIController.getConversations,
);

/**
 * @route   GET /api/v1/ai/conversations/:id
 * @desc    Fetch messages for a specific conversation
 * @access  Private
 */
AIRoutes.get(
  "/conversations/:id",
  checkAuth(Role.ADMIN, Role.MEMBER),
  AIController.getMessages,
);

/**
 * @route   POST /api/v1/ai/generate-content
 * @desc    Generate eco-idea content using AI
 * @access  Private
 */
AIRoutes.post(
  "/generate-content",
  checkAuth(Role.ADMIN, Role.MEMBER),
  AIController.generateContent,
);

export default AIRoutes;
