import { createSession, publicUser, roleLabels, sessionCookie, verifyPassword } from "@/lib/auth";
import { json, persistStore, pushEvent, store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
  const body = isForm ? Object.fromEntries((await request.formData()).entries()) : await request.json();
  const username = String(body.username || "").trim().toLowerCase();
  const user = store.users.find((item) => item.username.toLowerCase() === username);

  if (!user || !verifyPassword(String(body.password || ""), user.passwordHash)) {
    if (isForm) return Response.redirect(new URL("/?authError=1", request.url), 303);
    return json({ error: "Неверный логин или пароль" }, 401);
  }

  if (!user.active || user.role === "pending") {
    if (isForm) return Response.redirect(new URL("/?authError=pending", request.url), 303);
    return json({ error: "Аккаунт ожидает выдачи прав" }, 403);
  }

  user.lastLoginAt = Date.now();
  persistStore();
  pushEvent("auth", `Вход: ${user.username}`, { role: user.role });

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
    ok: true,
    cookie: true,
    token,
    user: publicUser(user),
    roles: roleLabels
  }, {
    headers: {
      "Set-Cookie": sessionCookie(token)
    }
  });
}
