import { useEffect, useState } from "react";

interface HealthResponse {
  ok: boolean;
  extraction: "ready" | "no_api_key";
}

type HealthState =
  { status: "loading" } | { status: "error"; message: string } | { status: "ready"; health: HealthResponse };

/**
 * Root component. For now it only shows whether the server is reachable.
 *
 * @returns {JSX.Element} The page.
 */
export default function App() {
  const [healthState, setHealthState] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        return (await response.json()) as HealthResponse;
      })
      .then((health) => {
        if (!cancelled) {
          setHealthState({ status: "ready", health });
        }
      })
      .catch((error: Error | unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error";

          setHealthState({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6 font-sans text-gray-900">
      <h1 className="text-2xl font-semibold">SMS to order</h1>
      <p className="mt-2 min-h-6 text-sm text-gray-600">
        {healthState.status === "loading" && "Checking server..."}
        {healthState.status === "error" && `Server unreachable: ${healthState.message}. Start the server and reload.`}
        {healthState.status === "ready" &&
          (healthState.health.extraction === "ready"
            ? "Server up. Extraction ready."
            : "Server up. No API key set, so extraction is off.")}
      </p>
    </main>
  );
}
