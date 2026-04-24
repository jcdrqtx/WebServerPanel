import crypto from "crypto";
import type { PanelUser, Permission, Role } from "./types";

export const roleLabels: Record<Role, string> = {
  owner: "Владелец",
  admin: "Администратор",
  moderator: "Модератор",
  support: "Поддержка",
  viewer: "Наблюдатель",
  pending: "Ожидает"
};

export const rolePermissions: Record<Role, Permission[]> = {
  owner: ["view", "manage_users", "kick_players", "ban_players", "mute_players", "send_chat", "console", "give_items", "manage_checks", "manage_settings"],
  admin: ["view", "manage_users", "kick_players", "ban_players", "mute_players", "send_chat", "console", "give_items", "manage_checks"],
  moderator: ["view", "kick_players", "mute_players", "send_chat", "give_items", "manage_checks"],
  support: ["view", "send_chat", "manage_checks"],
  viewer: ["view"],
  pending: []
};

const sessionSecret = process.env.SESSION_SECRET || "rust-dot-net-dev-secret";

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  if (!encoded.includes(":")) return false;
  const [salt, expected] = encoded.split(":");
  const actual = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function createSession(user: PanelUser) {
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    nonce: crypto.randomBytes(12).toString("hex")
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function publicUser(user: PanelUser) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    roleLabel: roleLabels[user.role],
    active: user.active,
    permissions: rolePermissions[user.role],
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

export function hasPermission(user: PanelUser | null | undefined, permission: Permission) {
  return Boolean(user?.active && rolePermissions[user.role].includes(permission));
}

export function sessionUserId(token: string | null) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: string; expiresAt?: number };
    if (!parsed.userId || !parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed.userId;
  } catch {
    return null;
  }
}

export function destroySession(token: string | null) {
  void token;
}
