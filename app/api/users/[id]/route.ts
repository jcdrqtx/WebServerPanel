import { publicUser, rolePermissions } from "@/lib/auth";
import { requireUser } from "@/lib/http";
import { broadcast, json, persistStore, pushEvent, snapshot, store } from "@/lib/store";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response, user } = requireUser(request, "manage_users");
  if (response) return response;

  const { id } = await context.params;
  const body = await request.json();
  const target = store.users.find((item) => item.id === id);
  if (!target) return json({ error: "user not found" }, 404);
  if (target.role === "owner" && user.role !== "owner") return json({ error: "owner can be changed only by owner" }, 403);

  if (body.role && Object.prototype.hasOwnProperty.call(rolePermissions, body.role)) {
    target.role = body.role as Role;
  }
  if (typeof body.active === "boolean") target.active = body.active;
  if (body.displayName) target.displayName = String(body.displayName).trim();

  persistStore();
  pushEvent("auth", `Права обновлены: ${target.username}`, { role: target.role, active: target.active });
  broadcast("snapshot", snapshot());

  return json({ user: publicUser(target) });
}
