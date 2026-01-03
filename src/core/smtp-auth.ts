import { assertSmtpOk } from "@/core/assert-smtp-ok";
import type { SmtpCapabilities } from "@/core/parse-smtp-capabilities";
import type { SmtpReader } from "@/core/read-smtp-response";
import { readSmtpResponse } from "@/core/read-smtp-response";
import { writeSmtpCommand } from "@/core/write-smtp-command";

export type SmtpAuthInput = {
  capabilities: SmtpCapabilities;
  auth: {
    user: string;
    pass: string;
  };
  reader: SmtpReader;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  encoder: TextEncoder;
  decoder: TextDecoder;
};

/**
 * Authenticate with an SMTP server using advertised EHLO capabilities.
 *
 * This function implements SMTP AUTH negotiation in a provider-agnostic way.
 * It will pick the best supported mechanism in this order:
 * 1) AUTH PLAIN (simple and widely supported)
 * 2) AUTH LOGIN (fallback)
 *
 * Why negotiation matters:
 * - Some servers disable AUTH pre-TLS, then enable it post-STARTTLS.
 * - Some servers only support LOGIN.
 * - A universal SMTP client must adapt based on capabilities, not hardcode.
 *
 * Behavior:
 * - Throws if no supported mechanism exists.
 * - Throws if the server replies with non-success codes.
 * - Does not attempt OAuth2 in this version (user/pass only).
 */
export async function smtpAuth(input: SmtpAuthInput): Promise<void> {
  if (input.capabilities.auth.plain) {
    const authPlain = btoa(`\u0000${input.auth.user}\u0000${input.auth.pass}`);
    await writeSmtpCommand({
      writer: input.writer,
      encoder: input.encoder,
      command: `AUTH PLAIN ${authPlain}`,
    });

    const resp = await readSmtpResponse({
      reader: input.reader,
      decoder: input.decoder,
    });
    assertSmtpOk({
      response: resp,
      expectedCodes: [235],
      context: "AUTH PLAIN",
    });
    return;
  }

  if (input.capabilities.auth.login) {
    await writeSmtpCommand({
      writer: input.writer,
      encoder: input.encoder,
      command: "AUTH LOGIN",
    });

    const challenge1 = await readSmtpResponse({
      reader: input.reader,
      decoder: input.decoder,
    });
    assertSmtpOk({
      response: challenge1,
      expectedCodes: [334],
      context: "AUTH LOGIN (challenge user)",
    });

    await writeSmtpCommand({
      writer: input.writer,
      encoder: input.encoder,
      command: btoa(input.auth.user),
    });

    const challenge2 = await readSmtpResponse({
      reader: input.reader,
      decoder: input.decoder,
    });
    assertSmtpOk({
      response: challenge2,
      expectedCodes: [334],
      context: "AUTH LOGIN (challenge pass)",
    });

    await writeSmtpCommand({
      writer: input.writer,
      encoder: input.encoder,
      command: btoa(input.auth.pass),
    });

    const ok = await readSmtpResponse({
      reader: input.reader,
      decoder: input.decoder,
    });
    assertSmtpOk({ response: ok, expectedCodes: [235], context: "AUTH LOGIN" });
    return;
  }

  throw new Error("SMTP server does not support AUTH PLAIN or AUTH LOGIN");
}
