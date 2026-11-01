import { z } from "zod";
import type { User } from "@supabase/supabase-js";

/** Public identity exposed by the application; credentials remain in Supabase Auth. */
export type AuthIdentity = { id: string; email: string };
/** The session guard verifies both fields at runtime before returning this type. */
export type VerifiedAuthUser = User & {
  email: string;
  email_confirmed_at: string;
};
export const emailAuthInputSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().max(128).optional(),
  })
  .strict();
export const passwordUpdateSchema = z
  .object({ password: z.string().min(12).max(128) })
  .strict();
