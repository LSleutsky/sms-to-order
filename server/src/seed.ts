import { loadConfig } from "./config.js";
import { readFixtureMessages } from "./fixtures.js";
import { type InboundMessage } from "./messages.js";

const config = loadConfig();
const endpoint = `http://localhost:${config.port}/api/inbound/sms`;

const printMessage = (message: InboundMessage): void => {
  console.log(
    `\n== ${message.providerMessageId}  status ${message.status}${message.unparsedReason ? ` (${message.unparsedReason})` : ""}`
  );
  console.log(`raw: ${message.body.replace(/\n/g, "\n     ")}`);

  for (const line of message.lines) {
    const quantity = line.quantity === null ? "-" : String(line.quantity);
    const unit = line.unit ?? "-";
    const partNumber = line.partNumber ?? "-";

    console.log(
      `line ${line.position}: qty ${quantity}  unit ${unit}  part ${partNumber}  desc "${line.description}"  <- "${line.rawText}"`
    );
  }

  console.log(`notes: ${message.notes.length === 0 ? "-" : message.notes.map((note) => `"${note}"`).join(" | ")}`);
};

for (const sms of readFixtureMessages(config.fixturesDir)) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sms)
  });

  if (!response.ok) {
    throw new Error(`${endpoint} answered ${response.status} for ${sms.providerMessageId}. Is the server running?`);
  }

  printMessage((await response.json()) as InboundMessage);
}
