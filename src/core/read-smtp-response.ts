export type SmtpResponse = {
  code: number;
  lines: string[];
};

export type SmtpReader = {
  read: () => Promise<ReadableStreamReadResult<Uint8Array>>;
  releaseLock: () => void;
};

/**
 * Read a complete SMTP response (single-line or multi-line).
 *
 * SMTP replies can be:
 * - single-line: `250 OK`
 * - multi-line:  `250-PIPELINING`, `250-AUTH PLAIN LOGIN`, ..., `250 SIZE ...`
 *
 * Multi-line responses start with `XYZ-...` and end when a line begins with
 * `XYZ ...` (same 3-digit code + space).
 *
 * This function:
 * - reads from a stream reader until it has complete line(s)
 * - returns the numeric status code and all lines
 * - throws if the socket closes unexpectedly or if the response is malformed
 */
export async function readSmtpResponse(input: {
  reader: SmtpReader;
  decoder: TextDecoder;
}): Promise<SmtpResponse> {
  let buffer = "";
  const lines: string[] = [];

  const readLine = async (): Promise<string> => {
    // Keep reading until we have a full line
    while (!buffer.includes("\n")) {
      const result = await input.reader.read();
      if (result.done) {
        throw new Error("SMTP connection closed unexpectedly");
      }
      buffer += input.decoder.decode(result.value, { stream: true });
    }

    const newlineIndex = buffer.indexOf("\n");
    const rawLine = buffer.slice(0, newlineIndex + 1);
    buffer = buffer.slice(newlineIndex + 1);

    return rawLine.replace(/\r?\n$/, "");
  };

  const first = await readLine();
  lines.push(first);

  const codeStr = first.slice(0, 3);
  const code = Number(codeStr);
  if (!Number.isFinite(code) || codeStr.length !== 3) {
    throw new Error(`Invalid SMTP response line: ${first}`);
  }

  const isMultiline = first[3] === "-";
  if (!isMultiline) {
    return { code, lines };
  }

  // Multiline format: 250-....
  // Final line: 250 ....
  while (true) {
    const line = await readLine();
    lines.push(line);
    if (line.startsWith(codeStr + " ")) {
      break;
    }
  }

  return { code, lines };
}
