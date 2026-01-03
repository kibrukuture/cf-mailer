import { smtpSendMail } from "@/core/smtp-send-mail";
import { validateMailerConfig } from "@/core/validate-mailer-config";
import { validateSendMailInput } from "@/core/validate-send-mail-input";

export type MailerConfig = {
  host: string;
  port: number;
  secure?: boolean;
  helo?: string;
  auth?: {
    user: string;
    pass: string;
  };
};

export type SendMailInput = {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export type SendMailResult = {
  messageId: string;
};

export type Mailer = {
  send: (input: SendMailInput) => Promise<SendMailResult>;
};

/**
 * Create a Cloudflare-Workers compatible SMTP mailer.
 *
 * This is the main entry point of `@tolbel/cf-mailer`.
 *
 * It creates a stateless mailer instance that can be used to send emails
 * from a Cloudflare Worker. It is designed to be lightweight and type-safe.
 *
 * @param config - The SMTP server configuration.
 * @param config.host - The hostname of the SMTP server (e.g., `smtp.gmail.com`).
 * @param config.port - The port to connect to. **Must be 465 or 587**. Port 25 is not supported.
 * @param config.secure - Explicitly force TLS mode.
 *                        - If `true`, uses implicit TLS (port 465).
 *                        - If `false`, uses STARTTLS (port 587).
 *                        - If omitted, inferred from port: 465 -> true, 587 -> false.
 * @param config.auth - Optional credentials for SMTP AUTH (PLAIN or LOGIN).
 * @param config.helo - Optional hostname to use in EHLO command (defaults to `localhost`).
 *
 * @returns A `Mailer` instance with a `send()` method.
 *
 * @example
 * ```ts
 * const mailer = createMailer({
 *   host: "smtp.resend.com",
 *   port: 465,
 *   secure: true,
 *   auth: { user: "resend", pass: env.SMTP_PASS },
 * });
 * ```
 */
export function createMailer(config: MailerConfig): Mailer {
  const parsedConfig = validateMailerConfig(config);

  return {
    send: async (input) => {
      const parsed = validateSendMailInput(input);

      const to = Array.isArray(parsed.to) ? parsed.to : [parsed.to];

      const result = await smtpSendMail({
        config: parsedConfig,
        mail: {
          from: parsed.from,
          to,
          subject: parsed.subject,
          text: parsed.text,
          html: parsed.html,
        },
      });

      return { messageId: result.messageId };
    },
  };
}
