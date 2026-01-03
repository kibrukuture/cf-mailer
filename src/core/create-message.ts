/**
 * Build an email message string suitable for SMTP `DATA`.
 *
 * This function generates a simple RFC822-ish message with common headers:
 * - `From`
 * - `To`
 * - `Subject`
 * - `MIME-Version`
 *
 * Body behavior:
 * - If only `text` is provided, the message is `text/plain`.
 * - If only `html` is provided, the message is `text/html`.
 * - If both are provided, a `multipart/alternative` message is created.
 *
 * Notes:
 * - The resulting string uses CRLF (`\r\n`) line endings.
 * - The output is intended to be passed through SMTP dot-stuffing before send.
 */
export function createMessage(input: {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
}): string {
  const headers: string[] = [];

  headers.push(`From: ${input.from}`);
  headers.push(`To: ${input.to.join(", ")}`);
  headers.push(`Subject: ${input.subject}`);
  headers.push(`MIME-Version: 1.0`);

  if (input.html && input.text) {
    const boundary = `cf-mailer-${crypto.randomUUID()}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    const parts: string[] = [];
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: text/plain; charset="utf-8"`);
    parts.push("");
    parts.push(input.text);

    parts.push(`--${boundary}`);
    parts.push(`Content-Type: text/html; charset="utf-8"`);
    parts.push("");
    parts.push(input.html);

    parts.push(`--${boundary}--`);

    return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
  }

  if (input.html) {
    headers.push(`Content-Type: text/html; charset="utf-8"`);
    return `${headers.join("\r\n")}\r\n\r\n${input.html}`;
  }

  headers.push(`Content-Type: text/plain; charset="utf-8"`);
  return `${headers.join("\r\n")}\r\n\r\n${input.text ?? ""}`;
}
