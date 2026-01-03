export type SmtpSecureTransport = "off" | "on" | "starttls";

/**
 * Decide which Cloudflare socket TLS mode to use for a given SMTP config.
 *
 * Cloudflare Workers `connect()` supports three modes:
 * - `off`: plain TCP
 * - `on`: TLS from the start (implicit TLS)
 * - `starttls`: start plain then upgrade via `startTls()` (opportunistic TLS)
 *
 * For SMTP submission, the practical mapping is:
 * - port 465 => implicit TLS => `on`
 * - port 587 => STARTTLS => `starttls`
 *
 * If the caller explicitly sets `secure`, we respect it for non-standard ports.
 *
 * This helper keeps SMTP config looking like Nodemailer while still mapping to
 * the Workers sockets API.
 */
export function getSmtpSecureTransport(input: {
  port: number;
  secure?: boolean;
}): SmtpSecureTransport {
  if (input.port === 465) {
    return "on";
  }

  if (input.port === 587) {
    return "starttls";
  }

  if (input.secure === true) {
    return "on";
  }

  if (input.secure === false) {
    return "off";
  }

  return "off";
}
