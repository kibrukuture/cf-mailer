import { describe, expect, test } from "bun:test";

import { parseSmtpCapabilities } from "@/core/parse-smtp-capabilities";

export function parseSmtpCapabilitiesTest(): void {
  describe("parseSmtpCapabilities", () => {
    test("detects AUTH PLAIN and LOGIN", () => {
      const caps = parseSmtpCapabilities({
        code: 250,
        lines: ["250-example.com", "250-AUTH PLAIN LOGIN", "250 SIZE 35882577"],
      });

      expect(caps.auth.plain).toBe(true);
      expect(caps.auth.login).toBe(true);
    });

    test("returns false when AUTH not present", () => {
      const caps = parseSmtpCapabilities({
        code: 250,
        lines: ["250-example.com", "250 SIZE 35882577"],
      });

      expect(caps.auth.plain).toBe(false);
      expect(caps.auth.login).toBe(false);
    });
  });
}

parseSmtpCapabilitiesTest();
