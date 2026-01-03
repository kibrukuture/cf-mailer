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
