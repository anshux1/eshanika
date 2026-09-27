import { z } from "zod";

// Client copies of the server rules, with messages written for the form.
export const nameField = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(120, "Keep it under 120 characters");

export const slugField = z
  .string()
  .min(1, "Enter a slug")
  .max(120, "Keep it under 120 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens",
  );

export const descriptionField = z
  .string()
  .max(5000, "Keep it under 5000 characters");

// Empty text clears a nullable field on the server.
export function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
