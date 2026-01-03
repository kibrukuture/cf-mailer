import { z } from "@/core/zod";

const mailerAuthSchema = z.object({
  user: z.string().min(1),
  pass: z.string().min(1),
});

const mailerConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean().optional(),
  helo: z.string().min(1).optional(),
  auth: mailerAuthSchema.optional(),
});

export type ValidatedMailerConfig = z.infer<typeof mailerConfigSchema>;

/**
 * Validate and normalize the Mailer configuration.
 *
 * This function is used at mailer construction time (`createMailer()`), so
 * that once a mailer is created, the SMTP implementation can assume the config
 * is structurally correct.
 *
 * Validation behavior:
 * - Uses Zod `safeParse()`.
 * - Throws on failure (first issue message), never returns error objects.
 * - Returns the validated config (typed).
 *
 * Notes:
 * - Port 25 is rejected later in the SMTP layer (Workers restriction).
 * - `secure` is optional; ports 465/587 imply TLS behavior by default.
 */
export function validateMailerConfig(
  input: ValidatedMailerConfig
): ValidatedMailerConfig {
  const validation = mailerConfigSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(
      validation.error.issues[0]?.message ?? "Invalid mailer config"
    );
  }
  return validation.data;
}
