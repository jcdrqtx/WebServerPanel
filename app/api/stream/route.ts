import { requireUser } from "@/lib/http";
import { broadcast, listeners, snapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response, user } = requireUser(request);
  if (response) return response;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (type: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`));
      };
      const listener = (event: { type: string; payload: unknown }) => send(event.type, event.payload);
      listeners.add(listener);
      send("snapshot", snapshot(user));
      const keepAlive = setInterval(() => send("ping", { now: Date.now() }), 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        listeners.delete(listener);
      });
    }
  });

  broadcast("presence", { panel: "connected" });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
