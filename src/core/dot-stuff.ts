const CRLF = "\r\n";

/**
 * Apply SMTP dot-stuffing to a message body.
 *
 * SMTP's DATA command terminates when the server receives a line containing
 * only a single dot (`.`). To prevent accidental termination, RFC-compliant
 * clients must "dot-stuff" the payload:
 *
 * - If a line begins with `.`, prefix it with another `.`.
 * - Preserve CRLF line endings.
 *
 * This function operates on an already-built RFC822-ish message string and
 * returns the dot-stuffed version, ready to be sent after `DATA`.
 *
 * Why this matters:
 * - Without dot-stuffing, user content that contains a leading `.` on a
 *   line could prematurely end the DATA transfer.
 * - Servers interpret `\r\n.\r\n` as end-of-data.
 * - Dot-stuffing is required by RFC 5321 for correctness.
 *
 * The caller is responsible for appending the final terminator line:
 * `\r\n.\r\n` after the dot-stuffed content.
 */
export function dotStuff(message: string): string {
  return message
    .split(CRLF)
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join(CRLF);
}
