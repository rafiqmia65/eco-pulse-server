/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { envVars } from "../../config/env";
import { prisma } from "../../lib/prisma";
import {
  AIInteractionType,
  MessageRole,
} from "../../../../generated/prisma/enums";
import { Prisma } from "../../../../generated/prisma/client";
import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";

const genAI = new GoogleGenerativeAI(envVars.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const MAX_DAILY_AI_LIMIT = 10;

/**
 * Professional AI error handler
 */
const handleAIError = (error: any) => {
  const errorMessage = error?.message || String(error);

  if (
    errorMessage.includes("429") ||
    errorMessage.includes("Quota exceeded") ||
    errorMessage.includes("Too Many Requests")
  ) {
    throw new AppError(
      status.TOO_MANY_REQUESTS,
      "Daily AI limit reached. Please try again tomorrow.",
    );
  }

  if (errorMessage.includes("GoogleGenerativeAI Error")) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "The AI service is currently busy. Please try again in a few moments.",
    );
  }

  throw new AppError(
    status.INTERNAL_SERVER_ERROR,
    "Our AI consultant is taking a short break. Please try again shortly.",
  );
};

/**
 * Validate daily AI usage
 */
const validateAIUsage = async (userId: string) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const usageCount = await prisma.aIMessage.count({
    where: {
      conversation: {
        userId,
      },
      role: MessageRole.USER,
      createdAt: {
        gte: startOfDay,
      },
    },
  });

  if (usageCount >= MAX_DAILY_AI_LIMIT) {
    throw new AppError(
      status.TOO_MANY_REQUESTS,
      "Daily AI limit reached. Please try again tomorrow.",
    );
  }
};

/**
 * Helper to save conversation and messages
 */
const saveInteraction = async (
  userId: string,
  type: AIInteractionType,
  userMessage: string,
  assistantResponse: string,
  metadata?: Prisma.JsonValue,
  conversationId?: string,
) => {
  let conversation;

  if (conversationId) {
    conversation = await prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });
  }

  if (!conversation) {
    conversation = await prisma.aIConversation.create({
      data: {
        userId,
        type,
      },
    });
  }

  await prisma.aIMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: userMessage,
      },
      {
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: assistantResponse,
        metadata: metadata as Prisma.InputJsonValue,
      },
    ],
  });

  return conversation;
};

/**
 * 1. AI Smart Recommendations
 */
const getRecommendations = async (userId: string) => {
  await validateAIUsage(userId);

  // Fetch user's watchlist and votes to provide context
  const userActivity = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      watchLists: {
        include: {
          idea: {
            include: { category: true },
          },
        },
      },
      votes: {
        include: {
          idea: {
            include: { category: true },
          },
        },
      },
    },
  });

  const watchedCategories =
    userActivity?.watchLists.map((w) => w.idea.category.name) || [];
  const votedCategories =
    userActivity?.votes.map((v) => v.idea.category.name) || [];
  const interests = [
    ...new Set([...watchedCategories, ...votedCategories]),
  ].join(", ");

  // Fetch some trending ideas for the AI to pick from or inspire
  const topIdeas = await prisma.idea.findMany({
    where: { status: "APPROVED" },
    take: 10,
    orderBy: { upvotesCount: "desc" },
    include: { category: true },
  });

  const ideasContext = topIdeas
    .map((i) => `${i.title} (${i.category.name}) - ID: ${i.id}`)
    .join("\n");

  const prompt = `Based on the user's interests in these categories: [${interests}].
    And considering these available top ideas:
    ${ideasContext}
    
    Recommend 3 ideas that the user might like.
    Return the response in valid JSON format as an array of objects:
    [
      { "ideaId": "id", "title": "title", "reason": "why this matches their interests" }
    ]
    Ensure the JSON is valid and do not include markdown formatting.`;

  let text: string;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    text = response.text();
  } catch (error) {
    return handleAIError(error);
  }

  let recommendations;
  try {
    recommendations = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse AI recommendations:", text);
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "AI failed to generate recommendations.",
    );
  }

  await saveInteraction(
    userId,
    AIInteractionType.RECOMMENDATION,
    "Get smart recommendations",
    "I found some eco-ideas you might like based on your activity.",
    { recommendations },
  );

  return recommendations;
};

/**
 * 2. AI Chat Assistant
 */
const chat = async (
  userId: string,
  userMessage: string,
  conversationId?: string,
) => {
  await validateAIUsage(userId);

  // Fetch limited history if conversationId exists
  let history: { role: string; parts: { text: string }[] }[] = [];

  if (conversationId) {
    const messages = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 6, // smaller history = better focus
    });

    history = messages.map((m) => ({
      role: m.role === MessageRole.USER ? "user" : "model",
      parts: [{ text: m.content }],
    }));
  }

  const chatSession = model.startChat({
    history,

    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2000,
      topP: 0.9,
    },

    systemInstruction: {
      role: "system",
      parts: [
        {
          text: `
You are EcoPulse AI, an advanced sustainability and eco-innovation assistant.

Rules:
- Always give complete answers.
- Never stop after an introduction.
- Never repeat the user's question.
- Never summarize the user's request.
- Always provide practical and actionable eco-friendly insights.
- If the user asks for ideas, provide at least 3 detailed ideas.
- Use numbered lists or bullet points when appropriate.
- Keep responses professional, engaging, and informative.
- Avoid vague or generic responses.
- Always finish the response properly.
`,
        },
      ],
    },
  });

  // Enhanced prompt
  const enhancedMessage = `
User Request:
${userMessage}

Response Instructions:
- Give a complete response.
- Provide detailed explanations.
- If applicable, provide at least 3 ideas.
- Use formatting for readability.
- Avoid generic introductions.
`;

  let assistantResponse: string;
  try {
    const result = await chatSession.sendMessage(enhancedMessage);
    assistantResponse = result.response.text()?.trim();
  } catch (error) {
    return handleAIError(error);
  }

  // Validation
  if (!assistantResponse || assistantResponse.length < 120) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "AI returned an incomplete response. Please try again.",
    );
  }

  const conversation = await saveInteraction(
    userId,
    AIInteractionType.CHAT,
    userMessage,
    assistantResponse,
    null,
    conversationId,
  );

  return {
    conversationId: conversation.id,
    response: assistantResponse,
  };
};

/**
 * 3. AI Data Analyzer
 */
const analyzeIdea = async (userId: string, ideaId: string) => {
  await validateAIUsage(userId);

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      category: true,
      comments: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  const commentsContext = idea.comments.map((c) => c.content).join("\n- ");

  const prompt = `Analyze the performance and impact of this eco-idea:
    Title: ${idea.title}
    Category: ${idea.category.name}
    Net Votes: ${idea.votesCount} (Up: ${idea.upvotesCount}, Down: ${idea.downvotesCount})
    Comments Count: ${idea.commentsCount}
    Recent Comments: 
    - ${commentsContext}
    
    Provide a professional impact analysis in JSON format with:
    - impactScore: 1-100
    - sentimentAnalysis: "Positive", "Mixed", or "Negative"
    - keyStrengths: array of strengths
    - improvementSuggestions: array of suggestions
    - overallInsight: a short summary
    
    Ensure the JSON is valid and do not include markdown formatting.`;

  let text: string;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    text = response.text();
  } catch (error) {
    return handleAIError(error);
  }

  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse AI analysis:", text);
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "AI failed to analyze idea data.",
    );
  }

  await saveInteraction(
    userId,
    AIInteractionType.DATA_ANALYSIS,
    `Analyze idea: ${idea.title}`,
    `Impact analysis for ${idea.title} completed.`,
    analysis,
  );

  return analysis;
};

/**
 * Fetch user's conversation history
 */
const getConversations = async (userId: string) => {
  return await prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
};

/**
 * Fetch messages for a specific conversation
 */
const getMessages = async (conversationId: string, userId: string) => {
  const conversation = await prisma.aIConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.userId !== userId) {
    throw new AppError(
      status.NOT_FOUND,
      "Conversation not found or unauthorized.",
    );
  }

  return await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * 4. AI Content Generator
 * Generates title, problem, solution, description, and slug for a given
 * topic and category. Returns the content only — the user fills in
 * price and submits the idea themselves.
 */
const generateContent = async (
  userId: string,
  topic: string,
  categoryId: string,
) => {
  await validateAIUsage(userId);

  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    throw new AppError(status.NOT_FOUND, "Selected category not found.");
  }

  const prompt = `You are an eco-innovation content writer. Generate a compelling eco-idea based on the following topic and category.

Topic: ${topic}
Category: ${category.name}

Return ONLY valid JSON with these exact fields and strict character limits:
{
  "title": "concise catchy title — max 150 characters",
  "slug": "url-friendly lowercase kebab-case version of the title — no special characters",
  "problem": "clear environmental problem being addressed — max 250 characters",
  "solution": "detailed actionable eco-friendly solution — max 500 characters",
  "description": "engaging overview of the idea for readers — max 500 characters"
}

Rules:
- Every field MUST be present.
- title must not exceed 150 characters.
- slug must be lowercase, hyphenated, and derived from the title.
- problem must not exceed 250 characters.
- solution must not exceed 500 characters.
- description must not exceed 500 characters.
- Do NOT include markdown formatting or code fences.
- Return only the raw JSON object.`;

  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    raw = response.text().trim();
  } catch (error) {
    return handleAIError(error);
  }

  let content: {
    title: string;
    slug: string;
    problem: string;
    solution: string;
    description: string;
  };

  try {
    content = JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse AI generated content:", raw);
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "AI failed to generate content. Please try again.",
    );
  }

  // Enforce hard character limits
  if (content.title?.length > 150) {
    content.title = content.title.slice(0, 150);
  }
  if (content.problem?.length > 250) {
    content.problem = content.problem.slice(0, 250);
  }
  if (content.solution?.length > 500) {
    content.solution = content.solution.slice(0, 500);
  }
  if (content.description?.length > 500) {
    content.description = content.description.slice(0, 500);
  }

  // Sanitize slug: ensure lowercase kebab-case
  content.slug = content.slug
    ?.toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  await saveInteraction(
    userId,
    AIInteractionType.CONTENT_GEN,
    `Generate eco-idea for topic: ${topic}`,
    JSON.stringify(content),
    { categoryId, ...content },
  );

  // Return generated content — user submits the idea with price themselves
  return {
    ...content,
    categoryId,
    categoryName: category.name,
  };
};

export const AIService = {
  getRecommendations,
  chat,
  analyzeIdea,
  generateContent,
  getConversations,
  getMessages,
};
