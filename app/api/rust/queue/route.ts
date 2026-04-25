import { requirePlugin } from "@/lib/http";
import { completeTasks, json, store, touchPlugin } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();

  return json(store.tasks
    .filter((task) => task.status === "pending")
    .map((task) => ({ id: task.id, request: task.request })));
}

export async function PUT(request: Request) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();

  const body = await request.json().catch(() => ({}));
  completeTasks(body.data && typeof body.data === "object" ? body.data : body);
  return json({ ok: true });
}
