import crypto from "crypto";
import { createSession, hashPassword, publicUser, roleLabels } from "@/lib/auth";
import { json, persistStore, pushEvent, store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const displayName = String(body.displayName || username).trim();

  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
    return json({ error: "Логин: 3-24 символа, латиница/цифры/._-" }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Пароль должен быть минимум 6 символов" }, 400);
  }
  if (store.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    return json({ error: "Пользователь уже существует" }, 409);
  }

  const firstUser = store.users.length === 0;
  const user = {
    id: crypto.randomUUID(),
    username,
    displayName,
    role: firstUser ? "owner" as const : "pending" as const,
    active: firstUser,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
    lastLoginAt: null
  };

  store.users.push(user);
  persistStore();
  pushEvent("auth", `Регистрация: ${username}`, { role: user.role });

  if (!user.active) {
    return json({ ok: true, pending: true, message: "Заявка создана. Владелец должен выдать роль." });
  }

  return json({
    token: createSession(user),
    user: publicUser(user),
    roles: roleLabels
  });
}
