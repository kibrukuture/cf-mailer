import { connect } from "cloudflare:sockets";

import { assertSmtpOk } from "@/core/assert-smtp-ok";
import { createMessage } from "@/core/create-message";
import { dotStuff } from "@/core/dot-stuff";
import { getSmtpSecureTransport } from "@/core/get-smtp-secure-transport";
import { parseSmtpCapabilities } from "@/core/parse-smtp-capabilities";
import { readSmtpResponse } from "@/core/read-smtp-response";
import { smtpAuth } from "@/core/smtp-auth";
import { writeSmtpCommand } from "@/core/write-smtp-command";

const CRLF = "\r\n";

/**
 * Send an email over SMTP using Cloudflare Workers TCP sockets.
 *
 * This function is the low-level SMTP implementation behind `createMailer()`.
 * It opens a TCP connection to the configured SMTP server, performs the SMTP
 * handshake, negotiates TLS if required, authenticates (if credentials are
 * provided), and then sends the email using `MAIL FROM`, `RCPT TO`, and `DATA`.
 *
 * TLS support:
 * - Port 465: implicit TLS (`secureTransport: "on"`).
 * - Port 587: STARTTLS upgrade (`secureTransport: "starttls"` + `startTls()`).
 *
 * Auth support:
 * - AUTH PLAIN (preferred)
 * - AUTH LOGIN (fallback)
 *
 * Important:
 * - Port 25 is blocked on Workers and will throw.
 * - This function throws on unexpected SMTP status codes.
 */
export async function smtpSendMail(input: {
  config: {
    host: string;
    port: number;
    secure?: boolean;
    helo?: string;
    auth?: {
      user: string;
      pass: string;
    };
  };
  mail: {
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
  };
}): Promise<{ messageId: string }> {
  if (input.config.port === 25) {
    throw new Error("Port 25 is not supported on Cloudflare Workers");
  }

  const secureTransport = getSmtpSecureTransport({
    port: input.config.port,
    secure: input.config.secure,
  });

  const socket = connect(
    { hostname: input.config.host, port: input.config.port },
    { secureTransport, allowHalfOpen: false }
  );

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const reader = socket.readable.getReader();
  let writer = socket.writable.getWriter();

  const greeting = await readSmtpResponse({ reader, decoder });
  assertSmtpOk({
    response: greeting,
    expectedCodes: [220],
    context: "Greeting",
  });

  const heloName = input.config.helo ?? "localhost";

  await writeSmtpCommand({ writer, encoder, command: `EHLO ${heloName}` });
  const ehlo = await readSmtpResponse({ reader, decoder });
  assertSmtpOk({ response: ehlo, expectedCodes: [250], context: "EHLO" });
  const capabilities = parseSmtpCapabilities(ehlo);

  if (secureTransport === "starttls") {
    await writeSmtpCommand({ writer, encoder, command: "STARTTLS" });
    const starttls = await readSmtpResponse({ reader, decoder });
    assertSmtpOk({
      response: starttls,
      expectedCodes: [220],
      context: "STARTTLS",
    });

    const secureSocket = socket.startTls();

    // After TLS upgrade, we must recreate reader/writer.
    reader.releaseLock();
    writer.releaseLock();

    const tlsReader = secureSocket.readable.getReader();
    const tlsWriter = secureSocket.writable.getWriter();

    await writeSmtpCommand({
      writer: tlsWriter,
      encoder,
      command: `EHLO ${heloName}`,
    });
    const tlsEhlo = await readSmtpResponse({ reader: tlsReader, decoder });
    assertSmtpOk({
      response: tlsEhlo,
      expectedCodes: [250],
      context: "EHLO (TLS)",
    });

    const tlsCapabilities = parseSmtpCapabilities(tlsEhlo);

    if (input.config.auth) {
      await smtpAuth({
        capabilities: tlsCapabilities,
        auth: input.config.auth,
        reader: tlsReader,
        writer: tlsWriter,
        encoder,
        decoder,
      });
    }

    await writeSmtpCommand({
      writer: tlsWriter,
      encoder,
      command: `MAIL FROM:<${input.mail.from}>`,
    });
    const mailFrom = await readSmtpResponse({ reader: tlsReader, decoder });
    assertSmtpOk({
      response: mailFrom,
      expectedCodes: [250],
      context: "MAIL FROM",
    });

    for (const recipient of input.mail.to) {
      await writeSmtpCommand({
        writer: tlsWriter,
        encoder,
        command: `RCPT TO:<${recipient}>`,
      });
      const rcpt = await readSmtpResponse({ reader: tlsReader, decoder });
      assertSmtpOk({
        response: rcpt,
        expectedCodes: [250, 251],
        context: "RCPT TO",
      });
    }

    await writeSmtpCommand({ writer: tlsWriter, encoder, command: "DATA" });
    const data = await readSmtpResponse({ reader: tlsReader, decoder });
    assertSmtpOk({ response: data, expectedCodes: [354], context: "DATA" });

    const body = createMessage({
      from: input.mail.from,
      to: input.mail.to,
      subject: input.mail.subject,
      text: input.mail.text,
      html: input.mail.html,
    });

    const dotStuffed = dotStuff(body);

    await tlsWriter.write(encoder.encode(dotStuffed + CRLF + "." + CRLF));

    const queued = await readSmtpResponse({ reader: tlsReader, decoder });
    assertSmtpOk({
      response: queued,
      expectedCodes: [250],
      context: "DATA end",
    });

    await writeSmtpCommand({ writer: tlsWriter, encoder, command: "QUIT" });
    await readSmtpResponse({ reader: tlsReader, decoder });

    secureSocket.close();

    return { messageId: crypto.randomUUID() };
  }

  if (input.config.auth) {
    await smtpAuth({
      capabilities,
      auth: input.config.auth,
      reader,
      writer,
      encoder,
      decoder,
    });
  }

  await writeSmtpCommand({
    writer,
    encoder,
    command: `MAIL FROM:<${input.mail.from}>`,
  });
  const mailFrom = await readSmtpResponse({ reader, decoder });
  assertSmtpOk({
    response: mailFrom,
    expectedCodes: [250],
    context: "MAIL FROM",
  });

  for (const recipient of input.mail.to) {
    await writeSmtpCommand({
      writer,
      encoder,
      command: `RCPT TO:<${recipient}>`,
    });
    const rcpt = await readSmtpResponse({ reader, decoder });
    assertSmtpOk({
      response: rcpt,
      expectedCodes: [250, 251],
      context: "RCPT TO",
    });
  }

  await writeSmtpCommand({ writer, encoder, command: "DATA" });
  const data = await readSmtpResponse({ reader, decoder });
  assertSmtpOk({ response: data, expectedCodes: [354], context: "DATA" });

  const body = createMessage({
    from: input.mail.from,
    to: input.mail.to,
    subject: input.mail.subject,
    text: input.mail.text,
    html: input.mail.html,
  });

  const dotStuffed = dotStuff(body);

  await writer.write(encoder.encode(dotStuffed + CRLF + "." + CRLF));

  const queued = await readSmtpResponse({ reader, decoder });
  assertSmtpOk({ response: queued, expectedCodes: [250], context: "DATA end" });

  await writeSmtpCommand({ writer, encoder, command: "QUIT" });
  await readSmtpResponse({ reader, decoder });

  socket.close();

  return { messageId: crypto.randomUUID() };
}
