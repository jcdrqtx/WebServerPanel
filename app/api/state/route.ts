import { requireUser } from "@/lib/http";
import { json, snapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response, user } = requireUser(request);
  if (response) return response;
  return json(snapshot(user));
}
