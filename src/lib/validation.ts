import { z } from "zod";

/**
 * Shared, minimal validation layer for ASCEND forms.
 * Keep this file small and reusable — UI enforces maxLength, these schemas
 * enforce trimming, required-ness and formats before anything hits the DB.
 */

export const LIMITS = {
  journal: 5000,
  journalTitle: 120,
  chat: 2000,
  workoutName: 100,
  exerciseName: 100,
  workoutNotes: 1000,
  mealName: 120,
  bio: 300,
  squadName: 60,
  squadDescription: 500,
  post: 1000,
  comment: 300,
  displayName: 60,
} as const;

const trimmed = (max: number) => z.string().trim().max(max);

export const usernameSchema = z
  .string({ required_error: "Username is required" })
  .trim()
  .min(1, "Username is required")
  .min(3, "Username must be 3–20 characters")
  .max(20, "Username must be 3–20 characters")
  .regex(/^[A-Za-z0-9_.]+$/, "Only letters, numbers, underscores, and periods are allowed");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(255);

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const profileSchema = z.object({
  display_name: trimmed(LIMITS.displayName).optional(),
  username: usernameSchema,
});

export const journalSchema = z.object({
  title: trimmed(LIMITS.journalTitle).optional(),
  content: z
    .string()
    .trim()
    .min(1, "Write something before saving")
    .max(LIMITS.journal, `Entry must be under ${LIMITS.journal} characters`),
});

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Exercise name is required").max(LIMITS.exerciseName),
  sets: z.number().int().min(0).max(100),
  reps: z.number().int().min(0).max(1000),
  weight: z.number().min(0).max(2000),
});

export const workoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Workout name is required")
    .max(LIMITS.workoutName, `Name must be under ${LIMITS.workoutName} characters`),
  notes: trimmed(LIMITS.workoutNotes).optional(),
  duration_min: z.number().int().min(0).max(1440).nullable().optional(),
  exercises: z.array(exerciseSchema),
});

export const mealSchema = z.object({
  food_name: z.string().trim().min(1, "Meal name is required").max(LIMITS.mealName),
});

export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(LIMITS.post, `Post must be under ${LIMITS.post} characters`),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(LIMITS.comment),
});

export const squadSchema = z.object({
  name: z.string().trim().min(1, "Squad name is required").max(LIMITS.squadName),
  description: trimmed(LIMITS.squadDescription).optional(),
});

export const chatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Say something first")
    .max(LIMITS.chat, `Message must be under ${LIMITS.chat} characters`),
});

/** Returns the first validation error message, or null when valid. */
export function firstError(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid input";
}
