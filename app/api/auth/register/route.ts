import crypto from "crypto";
import { createSession, hashPassword, publicUser, roleLabels, sessionCookie } from "@/lib/auth";
import { json, persistStore, pushEvent, store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
  const body = isForm ? Object.fromEntries((await request.formData()).entries()) : await request.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const displayName = String(body.displayName || username).trim();

  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
    if (isForm) return Response.redirect(new URL("/?authError=login", request.url), 303);
    return json({ error: "Логин: 3-24 символа, латиница/цифры/._-" }, 400);
  }
  if (password.length < 6) {
    if (isForm) return Response.redirect(new URL("/?authError=password", request.url), 303);
    return json({ error: "Пароль должен быть минимум 6 символов" }, 400);
  }
  if (store.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    if (isForm) return Response.redirect(new URL("/?authError=exists", request.url), 303);
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
    if (isForm) return Response.redirect(new URL("/?registered=pending", request.url), 303);
    return json({ ok: true, pending: true, message: "Заявка создана. Владелец должен выдать роль." });
  }

  const token = createSession(user);
  if (isForm) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/",
        "Set-Cookie": sessionCookie(token)
      }
    });
  }

  return Response.json({
    token,
    user: publicUser(user),
    roles: roleLabels
  }, {
    headers: {
      "Set-Cookie": sessionCookie(token)
    }
  });
}
