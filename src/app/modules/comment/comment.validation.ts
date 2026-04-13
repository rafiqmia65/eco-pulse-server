import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment too long"),

  parentId: z.string().uuid("Invalid parent comment ID").optional(),
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, "Comment cannot be empty")
      .max(1000, "Comment too long"),
  }),
});
