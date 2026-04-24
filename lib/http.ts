import type { Permission } from "./types";
import { getSessionUser, json } from "./store";
import { hasPermission } from "./auth";

export function requireUser(request: Request, permission: Permission = "view") {
  const context = getSessionUser(request);
  if (!context.user) {
    return { response: json({ error: "auth required" }, 401), user: null, token: context.token };
  }
  if (!hasPermission(context.user, permission)) {
    return { response: json({ error: "not enough permissions" }, 403), user: null, token: context.token };
  }
  return { response: null, user: context.user, token: context.token };
}

export function pluginAllowed(request: Request) {
  const pluginToken = process.env.PLUGIN_TOKEN || "";
  if (!pluginToken) return true;
  return request.headers.get("x-plugin-token") === pluginToken || request.headers.get("x-plugin-auth") === pluginToken;
}

export function requirePlugin(request: Request) {
  if (pluginAllowed(request)) return null;
  return json({ error: "plugin token rejected" }, 401);
}
