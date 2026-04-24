import { destroySession } from "@/lib/auth";
import { requireUser } from "@/lib/http";
import { json } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response, token } = requireUser(request);
  if (response) return response;
  destroySession(token);
  return json({ ok: true });
}
