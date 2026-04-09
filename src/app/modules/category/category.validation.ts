import { z } from "zod";

/**
 * Create Category Validation
 */

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name cannot exceed 50 characters")
    .trim(),
});
