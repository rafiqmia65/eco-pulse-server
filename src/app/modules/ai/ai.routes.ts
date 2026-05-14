import express, { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { AIController } from "./ai.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { AIValidation } from "./ai.validation";

const AIRoutes: Router = Router();

// Ensure JSON parsing for AI routes, even if Content-Type header is missing
AIRoutes.use(express.json({ type: ["application/json", "*/*"] }));

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
AIRoutes.post(
  "/chat",
  checkAuth(Role.ADMIN, Role.MEMBER),
  validateRequest(AIValidation.chatSchema),
  AIController.chat,
);
AIRoutes.post(
  "/chat-stream",
  checkAuth(Role.ADMIN, Role.MEMBER),
  validateRequest(AIValidation.chatSchema),
  AIController.chatStream,
);

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

AIRoutes.post(
  "/generate-content",
  checkAuth(Role.ADMIN, Role.MEMBER),
  validateRequest(AIValidation.generateContentSchema),
  AIController.generateContent,
);

/**
 * @route   POST /api/v1/ai/predict-score
 * @desc    Predict idea success score
 * @access  Private
 */
AIRoutes.post(
  "/predict-score",
  checkAuth(Role.ADMIN, Role.MEMBER),
  validateRequest(AIValidation.predictScoreSchema),
  AIController.predictIdeaScore,
);

/**
 * @route   GET /api/v1/ai/admin/stats
 * @desc    Get AI Analytics for Admin
 * @access  Private (Admin only)
 */
AIRoutes.get("/admin/stats", checkAuth(Role.ADMIN), AIController.getAdminStats);

export default AIRoutes;
