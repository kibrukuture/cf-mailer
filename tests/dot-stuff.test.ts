import { describe, expect, test } from "bun:test";

import { dotStuff } from "@/core/dot-stuff";

export function dotStuffTest(): void {
  describe("dotStuff", () => {
    test("prefixes lines that start with a dot", () => {
      const input = "Hello\r\n.World\r\n..Two\r\nEnd";
      const out = dotStuff(input);
      expect(out).toBe("Hello\r\n..World\r\n...Two\r\nEnd");
    });
  });
}

dotStuffTest();
