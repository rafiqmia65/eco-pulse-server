import z from "zod";

export const createIdeaSchema = z
  .object({
    title: z.string().min(5).max(150).trim(),
    problem: z.string().min(20).trim(),
    solution: z.string().min(20).trim(),
    description: z.string().min(20).trim(),
    image: z.string().url().optional(),

    slug: z
      .string()
      .min(3)
      .max(200)
      .regex(/^[a-z0-9-]+$/)
      .nullable()
      .optional(),

    isPaid: z.boolean().optional().default(false),

    price: z
      .number()
      .nullable()
      .optional()
      .refine((val) => val == null || val > 0, {
        // check null or >0
        message: "Price must be positive",
      }),

    categoryId: z.string(),
    isDraft: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.isPaid) return data.price != null; // required for paid
      return true;
    },
    {
      message: "Price is required when idea is paid",
      path: ["price"],
    },
  )
  .refine(
    (data) => {
      if (!data.isPaid) return data.price == null; // must be empty for free
      return true;
    },
    {
      message: "Price should not be provided when idea is free",
      path: ["price"],
    },
  );
