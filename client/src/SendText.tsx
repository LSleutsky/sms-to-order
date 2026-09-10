import { useState } from "react";

import { sendSms } from "./api";
import { type InboundMessage } from "./types";

interface SendTextProps {
  onSent: (message: InboundMessage) => void;
}

type SendState = { status: "idle" } | { status: "sending" } | { status: "error"; message: string };

/**
 * A stand-in for the SMS provider: types a text and posts it to the inbound endpoint.
 *
 * @param props - Callback with the stored message once the server has it.
 *
 * @returns {JSX.Element} The send form.
 */
export default function SendText({ onSent }: SendTextProps) {
  const [from, setFrom] = useState("+15550100099");
  const [body, setBody] = useState("");
  const [sendState, setSendState] = useState<SendState>({ status: "idle" });
  const canSend = from.trim() !== "" && body.trim() !== "" && sendState.status !== "sending";

  const handleSend = () => {
    setSendState({ status: "sending" });
    sendSms(from.trim(), body)
      .then((message) => {
        setSendState({ status: "idle" });
        setBody("");
        onSent(message);
      })
      .catch((error: unknown) => {
        setSendState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
      });
  };

  return (
    <form
      className="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSend();
      }}
    >
      <p className="text-xs font-medium text-slate-700">Send a text</p>
      <label className="block text-xs text-slate-500" htmlFor="send-from">
        From
      </label>
      <input
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        id="send-from"
        type="tel"
        value={from}
        onChange={(event) => setFrom(event.target.value)}
      />
      <label className="block text-xs text-slate-500" htmlFor="send-body">
        Message
      </label>
      <textarea
        className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-sm"
        id="send-body"
        placeholder="10 1/2 close nip brass"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="min-h-5 text-xs text-red-700">
          {sendState.status === "error" ? `Send failed: ${sendState.message}` : ""}
        </p>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canSend}
          type="submit"
        >
          {sendState.status === "sending" ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
