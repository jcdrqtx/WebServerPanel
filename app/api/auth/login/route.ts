import { createSession, publicUser, roleLabels, verifyPassword } from "@/lib/auth";
import { json, persistStore, pushEvent, store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || "").trim().toLowerCase();
  const user = store.users.find((item) => item.username.toLowerCase() === username);

  if (!user || !verifyPassword(String(body.password || ""), user.passwordHash)) {
    return json({ error: "Неверный логин или пароль" }, 401);
  }

  if (!user.active || user.role === "pending") {
    return json({ error: "Аккаунт ожидает выдачи прав" }, 403);
  }

  user.lastLoginAt = Date.now();
  persistStore();
  pushEvent("auth", `Вход: ${user.username}`, { role: user.role });

  return json({
    token: createSession(user),
    user: publicUser(user),
    roles: roleLabels
  });
}
