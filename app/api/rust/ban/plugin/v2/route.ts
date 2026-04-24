import { requirePlugin } from "@/lib/http";
import { activeBanDtos, json, touchPlugin } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();

  const body = await request.json().catch(() => ({}));
  return json({ entries: activeBanDtos(Array.isArray(body.players) ? body.players : []) });
}
