import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { AIService } from "./ai.service";

/**
 * @desc    Get smart recommendations for user
 * @route   GET /api/v1/ai/recommendations
 * @access  Private
 */
const getRecommendations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await AIService.getRecommendations(userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Smart recommendations fetched successfully",
    data: result,
  });
});

/**
 * @desc    AI Chat Assistant
 * @route   POST /api/v1/ai/chat
 * @access  Private
 */
const chat = catchAsync(async (req: Request, res: Response) => {
  const { message, conversationId } = req.body;
  const userId = req.user?.userId;

  if (!message) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Message is required",
    });
  }

  const result = await AIService.chat(
    userId as string,
    message,
    conversationId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI responded successfully",
    data: result,
  });
});

/**
 * @desc    Analyze idea performance
 * @route   GET /api/v1/ai/analyze/:ideaId
 * @access  Private (Admin or Creator)
 */
const analyzeIdea = catchAsync(async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  const userId = req.user?.userId;

  if (!ideaId || typeof ideaId !== "string") {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Valid Idea ID is required",
    });
  }

  const result = await AIService.analyzeIdea(userId as string, ideaId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea analysis completed",
    data: result,
  });
});

/**
 * @desc    Fetch user's conversation history
 * @route   GET /api/v1/ai/conversations
 * @access  Private
 */
const getConversations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await AIService.getConversations(userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Conversations fetched successfully",
    data: result,
  });
});

/**
 * @desc    Fetch messages for a specific conversation
 * @route   GET /api/v1/ai/conversations/:id
 * @access  Private
 */
const getMessages = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!id || typeof id !== "string") {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Valid Conversation ID is required",
    });
  }

  const result = await AIService.getMessages(id, userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Messages fetched successfully",
    data: result,
  });
});

/**
 * @desc    Generate eco-idea content using AI
 * @route   POST /api/v1/ai/generate-content
 * @access  Private
 */
const generateContent = catchAsync(async (req: Request, res: Response) => {
  const { topic, categoryId } = req.body;
  const userId = req.user?.userId;

  if (!topic || typeof topic !== "string") {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Topic is required",
    });
  }

  if (!categoryId || typeof categoryId !== "string") {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Category ID is required",
    });
  }

  const result = await AIService.generateContent(
    userId as string,
    topic,
    categoryId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Content generated and idea created successfully",
    data: result,
  });
});

export const AIController = {
  getRecommendations,
  chat,
  analyzeIdea,
  generateContent,
  getConversations,
  getMessages,
};
