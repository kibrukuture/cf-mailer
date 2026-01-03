# @tolbel/cf-mailer

A lightweight, zero-dependency SMTP client designed specifically for **Cloudflare Workers**. It uses the `cloudflare:sockets` API to send emails directly from your Worker without needing a third-party HTTP API wrapper (like Resend or SendGrid APIs), letting you use _any_ standard SMTP provider (Gmail, Outlook, Amazon SES, Mailgun, etc.).

## Features

- ⚡️ **Zero Runtime Dependencies**: Built on standard Web APIs and `cloudflare:sockets`.
- 🔒 **Secure**: Supports `Implicit TLS` (465) and `STARTTLS` (587).
- 📧 **HTML & Text**: Send rich HTML emails with plain text fallback.
- 🛡️ **Type-Safe**: Written in TypeScript with strict Zod validation (internal).
- ☁️ **Workers Ready**: Handles the specific constraints of the Workers runtime (no `net` module, no port 25).

## Installation

```bash
bun add @tolbel/cf-mailer
# or
npm install @tolbel/cf-mailer
```

## Usage

### Basic Example (Text Email)

```ts
import { createMailer } from "@tolbel/cf-mailer";

export default {
  async fetch(req, env) {
    const mailer = createMailer({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: {
        user: "me@example.com",
        pass: env.SMTP_PASSWORD, // Use safe secrets!
      },
    });

    try {
      const result = await mailer.send({
        from: "me@example.com",
        to: "you@example.com",
        subject: "Hello from Cloudflare!",
        text: "This email was sent directly from a Worker.",
      });

      return Response.json({ success: true, id: result.messageId });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  },
};
```

### HTML Email Example

You can send rich HTML emails. It is recommended to always include a `text` fallback for accessibility.

```ts
await mailer.send({
  from: "newsletter@mysite.com",
  to: ["subscriber@gmail.com"],
  subject: "Welcome to our platform! 🚀",
  text: "Welcome! We are unmatched in speed.", // Fallback
  html: `
    <div style="font-family: sans-serif; padding: 20px;">
      <h1>Welcome!</h1>
      <p>We are <strong>unmatched</strong> in speed.</p>
      <a href="https://mysite.com" style="button">Get Started</a>
    </div>
  `,
});
```

### Error Handling

The library throws descriptive errors if the SMTP handshake fails or the connection times out.

```ts
try {
  await mailer.send({ ... });
} catch (e) {
  if (e.message.includes("ETIMEDOUT")) {
    console.error("Connection timed out. Check firewall or port.");
  } else if (e.message.includes("535")) {
    console.error("Authentication failed. Check username/password.");
  } else {
    console.error("SMTP Error:", e);
  }
}
```

## Cloudflare Constraints

Cloudflare Workers enforce specific networking rules:

1.  **Port 25 is BLOCKED**: You cannot use port 25. This is a platform limitation to prevent spam.
    - ✅ Use **Port 465** (Implicit TLS) - _Preferred_
    - ✅ Use **Port 587** (STARTTLS)
2.  **`cloudflare:sockets`**: This package usually requires the `connect()` capability.
    - Ensure your `wrangler.toml` or `wrangler.jsonc` has a recent `compatibility_date` (e.g., `2023-01-01` or later).

## API Reference

### `createMailer(config)`

Creates a new mailer instance.

| Property | Type      | Description                                          |
| :------- | :-------- | :--------------------------------------------------- |
| `host`   | `string`  | SMTP server hostname (e.g., `smtp.gmail.com`)        |
| `port`   | `number`  | Port number (`465` or `587`)                         |
| `secure` | `boolean` | `true` for Port 465. `false` (or omit) for Port 587. |
| `auth`   | `object`  | `{ user, pass }` credentials for SMTP AUTH.          |

### `mailer.send(options)`

Sends an email. Returns `Promise<{ messageId: string }>`.

| Property  | Type                   | Description           |
| :-------- | :--------------------- | :-------------------- |
| `from`    | `string`               | Sender email address. |
| `to`      | `string` \| `string[]` | Recipient email(s).   |
| `subject` | `string`               | Email subject line.   |
| `text`    | `string`               | Plain text content.   |
| `html`    | `string`               | HTML content.         |

## License

MIT
