import type { SmtpResponse } from "@/core/read-smtp-response";

export type SmtpCapabilities = {
  auth: {
    plain: boolean;
    login: boolean;
  };
};

/**
 * Parse SMTP server capabilities from an EHLO response.
 *
 * This function consumes the raw response lines returned by the SMTP server
 * after an `EHLO` command and extracts a small, typed capability object.
 *
 * Why we do this:
 * 1) Different SMTP servers support different AUTH mechanisms.
 * 2) For a “generic” SMTP client, we must negotiate based on what the server
 *    advertises, not based on provider-specific code.
 * 3) Capabilities can change after STARTTLS (EHLO before/after TLS can differ).
 *
 * Notes:
 * - SMTP capability lines typically look like: `250-AUTH PLAIN LOGIN`.
 * - We treat auth methods case-insensitively.
 * - We only extract what we need for v1: AUTH PLAIN and AUTH LOGIN.
 */
export function parseSmtpCapabilities(ehlo: SmtpResponse): SmtpCapabilities {
  const normalized = ehlo.lines
    .map((line) =>
      line
        .replace(/^\d{3}[ -]/, "")
        .trim()
        .toUpperCase()
    )
    .filter((line) => line.length > 0);

  const authLine = normalized.find((line) => line.startsWith("AUTH "));
  const methods = authLine ? authLine.slice("AUTH ".length).split(/\s+/) : [];

  return {
    auth: {
      plain: methods.includes("PLAIN"),
      login: methods.includes("LOGIN"),
    },
  };
}
