import { requireUser } from "@/lib/http";
import crypto from "crypto";
import { addBan, addMute, broadcast, createTask, json, parseDuration, persistStore, playerName, pushEvent, snapshot, store } from "@/lib/store";
import { hasPermission } from "@/lib/auth";
import type { Permission } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionPermissions: Record<string, Permission> = {
  kick: "kick_players",
  chat: "send_chat",
  command: "console",
  give: "give_items",
  mute: "mute_players",
  unmute: "mute_players",
  noticeGet: "manage_checks",
  notice: "manage_checks",
  ban: "ban_players",
  unban: "ban_players",
  health: "console",
  deleteEntity: "console",
  checkStarted: "manage_checks",
  checkFinished: "manage_checks",
  banEvent: "manage_checks",
  announceClean: "manage_checks"
};

export async function POST(request: Request) {
  const base = requireUser(request);
  if (base.response) return base.response;

  const body = await request.json();
  const type = String(body.type || "");
  const data = (body.data || {}) as Record<string, unknown>;
  const permission = actionPermissions[type];

  if (!permission || !hasPermission(base.user, permission)) {
    return json({ error: "not enough permissions" }, 403);
  }

  if (type === "kick") {
    const steamId = String(data.steamId || "");
    return json(createTask("kick", {
      steam_id: steamId,
      reason: String(data.reason || "Kicked by admin"),
      announce: Boolean(data.announce)
    }, `Kick ${playerName(steamId)}`));
  }

  if (type === "chat") {
    const targetSteamId = data.targetSteamId ? String(data.targetSteamId) : null;
    const message = String(data.message || "");
    store.chats.push({
      id: crypto.randomUUID(),
      steam_id: null,
      target_steam_id: targetSteamId || undefined,
      is_team: false,
      text: message,
      createdAt: Date.now(),
      meta: {
        direction: "outgoing",
        initiator_name: base.user.displayName || base.user.username,
        mode: targetSteamId ? "direct" : "global"
      }
    } as any);
    store.counters.chatMessages += 1;
    pushEvent("chat", targetSteamId ? `DM to ${playerName(targetSteamId)}` : "Global chat from panel", { text: message });
    persistStore();
    broadcast("snapshot", snapshot(base.user));
    return json(createTask("chat-message", {
      initiator_name: base.user.displayName || base.user.username,
      initiator_steam_id: null,
      target_steam_id: targetSteamId,
      message,
      mode: targetSteamId ? "direct" : "global"
    }, targetSteamId ? `DM ${playerName(targetSteamId)}` : "Global chat"));
  }

  if (type === "command") {
    const commands = Array.isArray(data.commands) ? data.commands.map(String).filter(Boolean) : [String(data.command || "")].filter(Boolean);
    return json(createTask("execute-command", { commands }, "Console command"));
  }

  if (type === "give") {
    const steamId = String(data.steamId || "");
    const shortname = String(data.shortname || "");
    const amount = Math.max(1, Number(data.amount || 1));
    return json(createTask("execute-command", {
      commands: [`inventory.giveto ${steamId} ${shortname} ${amount}`]
    }, `Give ${amount}x ${shortname}`));
  }

  if (type === "mute") {
    const steamId = String(data.steamId || "");
    const ms = parseDuration(data.duration || "30m") || 30 * 60 * 1000;
    const mute = addMute({
      steamId,
      reason: String(data.reason || "Muted by admin"),
      expiresAt: Date.now() + ms
    });
    return json(createTask("player-mute", {
      type: "created",
      data: {
        target_steam_id: mute.steamId,
        reason: mute.reason,
        left_time_ms: ms,
        received_at: Date.now()
      },
      chat_broadcast: Boolean(data.broadcast)
    }, `Mute ${playerName(steamId)}`));
  }

  if (type === "unmute") {
    const steamId = String(data.steamId || "");
    store.mutes = store.mutes.filter((mute) => mute.steamId !== steamId);
    persistStore();
    return json(createTask("player-mute", {
      type: "deleted",
      data: { target_steam_id: steamId, reason: "Unmuted", left_time_ms: 0, received_at: Date.now() },
      chat_broadcast: false
    }, `Unmute ${playerName(steamId)}`));
  }

  if (type === "notice") {
    const steamId = String(data.steamId || "");
    return json(createTask("notice-state-set", {
      steam_id: steamId,
      value: Boolean(data.value)
    }, `${data.value ? "Show" : "Hide"} check notice`));
  }

  if (type === "noticeGet") {
    const steamId = String(data.steamId || "");
    return json(createTask("notice-state-get", {
      steam_id: steamId
    }, `Get check notice ${playerName(steamId)}`));
  }

  if (type === "ban") {
    const steamId = String(data.steamId || "");
    const ms = parseDuration(data.duration || "");
    const ban = addBan({
      steamId,
      ip: String(data.ip || ""),
      reason: String(data.reason || "Banned by admin"),
      expiredAt: ms ? Date.now() + ms : 0
    });
    return json(createTask("ban", {
      steam_id: ban.steamId,
      name: playerName(steamId),
      reason: ban.reason,
      broadcast: Boolean(data.broadcast)
    }, `Ban ${playerName(steamId)}`));
  }

  if (type === "unban") {
    const steamId = String(data.steamId || "");
    store.bans.forEach((ban) => {
      if (ban.steamId === steamId) ban.active = false;
    });
    persistStore();
    return json({ ok: true });
  }

  if (type === "health") {
    return json(createTask("health-check", {}, "Plugin health check"));
  }

  if (type === "deleteEntity") {
    return json(createTask("delete-entity", {
      net_id: String(data.netId || data.net_id || "")
    }, `Delete entity ${String(data.netId || data.net_id || "")}`));
  }

  if (type === "checkStarted") {
    const steamId = String(data.steamId || "");
    return json(createTask("check-started", {
      steam_id: steamId,
      broadcast: Boolean(data.broadcast)
    }, `Check started ${playerName(steamId)}`));
  }

  if (type === "checkFinished") {
    const steamId = String(data.steamId || "");
    return json(createTask("check-finished", {
      steam_id: steamId,
      is_canceled: Boolean(data.isCanceled),
      is_clear: Boolean(data.isClear),
      is_ban: Boolean(data.isBan),
      broadcast: Boolean(data.broadcast)
    }, `Check finished ${playerName(steamId)}`));
  }

  if (type === "banEvent") {
    const steamId = String(data.steamId || "");
    const targets = Array.isArray(data.targets) ? data.targets.map(String).filter(Boolean) : [];
    return json(createTask("ban-event-created", {
      broadcast: Boolean(data.broadcast),
      suspect_name: playerName(steamId),
      suspect_id: steamId,
      reason: String(data.reason || "Banned after report"),
      targets
    }, `Ban event ${playerName(steamId)}`));
  }

  if (type === "announceClean") {
    const steamId = String(data.steamId || "");
    const targets = Array.isArray(data.targets) ? data.targets.map(String).filter(Boolean) : [];
    return json(createTask("announce-report-processed", {
      broadcast: Boolean(data.broadcast),
      suspect_name: playerName(steamId),
      suspect_id: steamId,
      targets
    }, `Report clean ${playerName(steamId)}`));
  }

  return json({ error: "unknown action" }, 400);
}
