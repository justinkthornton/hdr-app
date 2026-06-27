import { z } from "zod";

export type Shoot = {
  id: string;
  name: string;
  clientName: string | null;
  propertyAddress: string | null;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

const nullableText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.toLowerCase());

export const createShootSchema = z.object({
  name: z.string().trim().min(1, "Shoot name is required"),
  clientName: nullableText,
  propertyAddress: nullableText,
  notes: nullableText,
  tags: z.array(tagSchema).default([])
});

export const updateShootSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    clientName: nullableText,
    propertyAddress: nullableText,
    notes: nullableText,
    tags: z.array(tagSchema).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one shoot field must be provided"
  });

export type CreateShootInput = z.infer<typeof createShootSchema>;
export type UpdateShootInput = z.infer<typeof updateShootSchema>;
