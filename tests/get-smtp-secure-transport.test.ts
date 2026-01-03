import { describe, expect, test } from "bun:test";

import { getSmtpSecureTransport } from "@/core/get-smtp-secure-transport";

export function getSmtpSecureTransportTest(): void {
  describe("getSmtpSecureTransport", () => {
    test("port 465 => on", () => {
      expect(getSmtpSecureTransport({ port: 465 })).toBe("on");
    });

    test("port 587 => starttls", () => {
      expect(getSmtpSecureTransport({ port: 587 })).toBe("starttls");
    });

    test("secure true => on", () => {
      expect(getSmtpSecureTransport({ port: 2525, secure: true })).toBe("on");
    });

    test("secure false => off", () => {
      expect(getSmtpSecureTransport({ port: 2525, secure: false })).toBe("off");
    });
  });
}

getSmtpSecureTransportTest();
