import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { type InboundSms } from "./messages.js";

/**
 * Reads every fixture text as an inbound SMS, with the filename as the provider message ID.
 *
 * @param fixturesDir - Directory holding the .txt fixtures.
 *
 * @returns {InboundSms[]} Fixtures in filename order.
 */
export const readFixtureMessages = (fixturesDir: string): InboundSms[] =>
  readdirSync(fixturesDir)
    .filter((fileName) => fileName.endsWith(".txt"))
    .sort()
    .map((fileName, index) => ({
      from: `+1555010${String(index + 1).padStart(4, "0")}`,
      body: readFileSync(path.join(fixturesDir, fileName), "utf8").trim(),
      providerMessageId: fileName
    }));
