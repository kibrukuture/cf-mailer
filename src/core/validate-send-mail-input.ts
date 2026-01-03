import { z } from "@/core/zod";

const sendMailInputSchema = z.object({
  from: z.string().min(1),
  to: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  subject: z.string().min(1),
  text: z.string().min(1).optional(),
  html: z.string().min(1).optional(),
});

export type ValidatedSendMailInput = z.infer<typeof sendMailInputSchema>;

/**
 * Validate the input passed to `mailer.send()`.
 *
 * This library is intentionally strict about inputs:
 * - `from`, `to`, and `subject` must be non-empty strings.
 * - `to` can be a single string or an array of strings.
 * - At least one of `text` or `html` should be provided for meaningful emails.
 *
 * Validation behavior:
 * - Uses Zod `safeParse()`.
 * - Throws on failure (first issue message).
 * - Returns a typed object so the rest of the code never reads raw input.
 */
export function validateSendMailInput(
  input: ValidatedSendMailInput
): ValidatedSendMailInput {
  const validation = sendMailInputSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(
      validation.error.issues[0]?.message ?? "Invalid send mail input"
    );
  }
  return validation.data;
}
