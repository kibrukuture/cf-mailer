import { describe, expect, test } from "bun:test";

import { createMessage } from "@/core/create-message";

export function createMessageTest(): void {
  describe("createMessage", () => {
    test("creates a plain text message with headers", () => {
      const msg = createMessage({
        from: "hello@schnl.com",
        to: ["kibru@schnl.com"],
        subject: "Hello",
        text: "Hi",
      });

      expect(msg).toContain("From: hello@schnl.com");
      expect(msg).toContain("To: kibru@schnl.com");
      expect(msg).toContain("Subject: Hello");
      expect(msg).toContain("Content-Type: text/plain");
      expect(msg).toContain("\r\n\r\nHi");
    });

    test("creates multipart/alternative when both html and text exist", () => {
      const msg = createMessage({
        from: "hello@schnl.com",
        to: ["kibru@schnl.com"],
        subject: "Hello",
        text: "Hi",
        html: "<b>Hi</b>",
      });

      expect(msg).toContain("Content-Type: multipart/alternative");
      expect(msg).toContain("Content-Type: text/plain");
      expect(msg).toContain("Content-Type: text/html");
    });
  });
}

createMessageTest();
