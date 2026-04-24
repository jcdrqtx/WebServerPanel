import crypto from "crypto";
import { requirePlugin } from "@/lib/http";
import { addBan, addMute, broadcast, json, parseDuration, persistStore, pushEvent, snapshot, store, touchPlugin, updateState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function routeName(path: string[]) {
  return path.join("/");
}

export async function GET(request: Request, context: RouteContext) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();

  const { path } = await context.params;
  if (routeName(path) === "player-mute/get-active") {
    const now = Date.now();
    return json({
      data: store.mutes
        .filter((mute) => !mute.expiresAt || mute.expiresAt > now)
        .map((mute) => ({
          target_steam_id: mute.steamId,
          reason: mute.reason,
          left_time_ms: mute.expiresAt ? Math.max(0, mute.expiresAt - now) : 3650 * 24 * 60 * 60 * 1000,
          received_at: now
        }))
    });
  }

  return json({ ok: true });
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();

  const { path } = await context.params;
  if (routeName(path) === "state") {
    updateState(await request.json());
    return json({ ok: true });
  }

  return json({ error: "not found" }, 404);
}

export async function POST(request: Request, context: RouteContext) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();

  const { path } = await context.params;
  const name = routeName(path);
  const body = await request.json().catch(() => ({}));

  if (name === "pair") {
    return json({ ttl: 60, token: process.env.PLUGIN_TOKEN || "local-dev-token" });
  }

  if (name === "chat") {
    const messages = Array.isArray(body.messages) ? body.messages : [];
    for (const message of messages) {
      store.chats.push({ id: crypto.randomUUID(), ...message, createdAt: Date.now() });
      store.counters.chatMessages += 1;
      pushEvent("chat", `Chat: ${message.steam_id || "server"}`, { text: message.text });
    }
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  if (name === "reports") {
    const reports = Array.isArray(body.reports) ? body.reports : [];
    for (const report of reports) {
      store.reports.push({ id: crypto.randomUUID(), ...report, createdAt: Date.now() });
      store.counters.reports += 1;
      pushEvent("report", `Report: ${report.reason || "unknown"}`, report);
    }
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  if (name === "kills") {
    const kills = Array.isArray(body.kills) ? body.kills : [];
    for (const kill of kills) {
      store.kills.push({ id: crypto.randomUUID(), ...kill, createdAt: Date.now() });
      store.counters.kills += 1;
    }
    if (kills.length) pushEvent("kills", `${kills.length} kill events`, { count: kills.length });
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  if (name === "alerts") {
    const alerts = Array.isArray(body.alerts) ? body.alerts : [];
    for (const alert of alerts) store.alerts.push({ id: crypto.randomUUID(), ...alert, createdAt: Date.now() });
    if (alerts.length) pushEvent("alert", `${alerts.length} alerts`, { count: alerts.length });
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  if (name === "custom-alert") {
    store.alerts.push({ id: crypto.randomUUID(), type: "custom", meta: body, createdAt: Date.now() });
    pushEvent("alert", body.msg || "Custom alert", body);
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  if (name === "contact") {
    store.contacts.push({
      id: crypto.randomUUID(),
      steam_id: body.steam_id,
      message: body.message,
      createdAt: Date.now()
    });
    pushEvent("contact", `Contact from ${body.steam_id}`, { message: body.message });
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  if (name === "wipe") {
    pushEvent("wipe", "Server wipe detected");
    return json({ ok: true });
  }

  if (name === "sleeping-bag" || name === "signage") {
    if (name === "sleeping-bag") {
      const sleepingBags = Array.isArray(body.sleeping_bags) ? body.sleeping_bags : [];
      for (const bag of sleepingBags) {
        store.sleepingBags.push({ id: crypto.randomUUID(), ...bag, createdAt: Date.now() });
      }
      pushEvent("sleeping-bag", `${sleepingBags.length} sleeping bag events`, { count: sleepingBags.length });
    } else {
      store.signages.push({
        id: crypto.randomUUID(),
        net_id: body.net_id,
        steam_id: body.steam_id,
        type: body.type,
        position: body.position,
        square: body.square,
        image: typeof body.base64_image === "string" ? body.base64_image : undefined,
        createdAt: Date.now()
      });
      pushEvent("signage", `Signage update by ${body.steam_id}`, { net_id: body.net_id, type: body.type, square: body.square });
    }
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  if (name === "player-mute/mute-player") {
    const ms = parseDuration(body.duration || "30m") || 30 * 60 * 1000;
    addMute({
      steamId: String(body.target_steam_id || ""),
      reason: String(body.reason || "Muted"),
      expiresAt: Date.now() + ms
    });
    return json({ ok: true });
  }

  if (name === "player-mute/unmute-player") {
    store.mutes = store.mutes.filter((mute) => mute.steamId !== body.target_steam_id);
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  if (name === "ban") {
    const ms = parseDuration(body.duration || "");
    addBan({
      steamId: String(body.target_steam_id || ""),
      ip: "",
      reason: String(body.reason || "Banned"),
      expiredAt: ms ? Date.now() + ms : 0
    });
    return json({ ok: true });
  }

  if (name === "unban") {
    store.bans.forEach((ban) => {
      if (ban.steamId === body.target_steam_id) ban.active = false;
    });
    persistStore();
    broadcast("snapshot", snapshot());
    return json({ ok: true });
  }

  return json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = requirePlugin(request);
  if (denied) return denied;
  touchPlugin();

  const { path } = await context.params;
  const name = routeName(path);
  const body = await request.json().catch(() => ({}));
  if (name === "signage" && Array.isArray(body.net_ids)) {
    const ids = new Set(body.net_ids.map(String));
    store.signages = store.signages.filter((signage) => !ids.has(String(signage.net_id)));
    persistStore();
    broadcast("snapshot", snapshot());
  }
  pushEvent(name, "Delete event", body);
  return json({ ok: true });
}
