import { requirePlugin } from "@/lib/http";
import { json, touchPlugin } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();
  return json({ ok: true, server_time: Date.now(), project: "RUST .NET" });
}

export async function POST(request: Request) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();
  return json({ ttl: 60, token: process.env.PLUGIN_TOKEN || "local-dev-token" });
}
