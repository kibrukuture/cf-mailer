/**
 * Write a single SMTP command line to the socket.
 *
 * SMTP is a line-oriented protocol. Commands are sent as ASCII/UTF-8 text
 * ending with CRLF (`\r\n`). Examples:
 * - `EHLO example.com\r\n`
 * - `MAIL FROM:<sender@example.com>\r\n`
 * - `DATA\r\n`
 *
 * This helper:
 * - Encodes the command using `TextEncoder`.
 * - Appends CRLF.
 * - Writes to the given stream writer.
 *
 * It does not read responses — callers must use `readSmtpResponse()`.
 */
export async function writeSmtpCommand(input: {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  encoder: TextEncoder;
  command: string;
}): Promise<void> {
  const payload = input.encoder.encode(`${input.command}\r\n`);
  await input.writer.write(payload);
}
