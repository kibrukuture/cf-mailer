import type { SmtpResponse } from "@/core/read-smtp-response";

/**
 * Assert that an SMTP response code is one of the expected codes.
 *
 * SMTP servers respond with numeric status codes (e.g. 220, 250, 354, 535).
 * For a robust client, we must validate each step:
 * - 220: greeting / STARTTLS ready
 * - 250: OK / capabilities / queued
 * - 354: start mail input (after DATA)
 * - 235: authentication succeeded
 *
 * This helper throws a readable error that includes:
 * - the context label (which SMTP stage failed)
 * - the numeric code
 * - all response lines
 */
export function assertSmtpOk(input: {
  response: SmtpResponse;
  expectedCodes: number[];
  context: string;
}): void {
  if (input.expectedCodes.includes(input.response.code)) {
    return;
  }

  throw new Error(
    `${input.context} failed with code ${
      input.response.code
    }: ${input.response.lines.join(" | ")}`
  );
}
