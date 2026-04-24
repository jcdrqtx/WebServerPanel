import { publicUser, roleLabels, rolePermissions } from "@/lib/auth";
import { requireUser } from "@/lib/http";
import { json, store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireUser(request, "manage_users");
  if (response) return response;
  return json({
    users: store.users.map(publicUser),
    roles: roleLabels,
    permissions: rolePermissions
  });
}
