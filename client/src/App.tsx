import { useCallback, useEffect, useState } from "react";

import { fetchQueue } from "./api";
import MessageDetail from "./MessageDetail";
import Queue from "./Queue";
import SendText from "./SendText";
import { type QueueEntry } from "./types";

type QueueState =
  { status: "loading" } | { status: "error"; message: string } | { status: "ready"; entries: QueueEntry[] };

/**
 * The review page: the message queue on the left, the selected message on the right.
 *
 * @returns {JSX.Element} The page.
 */
export default function App() {
  const [queueState, setQueueState] = useState<QueueState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadQueue = useCallback(() => {
    fetchQueue()
      .then((entries) => {
        setQueueState({ status: "ready", entries });
      })
      .catch((error: unknown) => {
        setQueueState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
      });
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">SMS to order</h1>
        <span className="text-sm text-slate-500">Review queue</span>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-96 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {queueState.status === "loading" && <p className="p-4 text-sm text-slate-500">Loading queue...</p>}
            {queueState.status === "error" && (
              <p className="p-4 text-sm text-red-700">
                Could not load the queue: {queueState.message}. Check the server and reload.
              </p>
            )}
            {queueState.status === "ready" && (
              <Queue entries={queueState.entries} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
          <SendText
            onSent={(message) => {
              loadQueue();
              setSelectedId(message.id);
            }}
          />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {selectedId === null ? (
            <p className="text-sm text-slate-500">Pick a message from the queue.</p>
          ) : (
            <MessageDetail key={selectedId} messageId={selectedId} onChanged={loadQueue} />
          )}
        </main>
      </div>
    </div>
  );
}
