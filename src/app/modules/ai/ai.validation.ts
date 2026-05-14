import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional(),
});

const generateContentSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  categoryId: z.string().min(1, "Category ID is required"),
});

const predictScoreSchema = z.object({
  title: z.string().min(1, "Title is required"),
  problem: z.string().min(1, "Problem is required"),
  solution: z.string().min(1, "Solution is required"),
  categoryName: z.string().min(1, "Category name is required"),
});

export const AIValidation = {
  chatSchema,
  generateContentSchema,
  predictScoreSchema,
};
