import crypto from "crypto";
import fs from "fs";
import path from "path";
import { hashPassword, publicUser, roleLabels, rolePermissions, sessionCookieName, sessionUserId } from "./auth";
import type { BanEntry, EventEntry, MetricPoint, MuteEntry, PanelUser, PlayerState, QueueTask, ServerState, Store } from "./types";

const dataDir = path.join(process.cwd(), "data");
const storeFile = path.join(dataDir, "rust-net-store.json");

type Listener = (event: { type: string; payload: unknown }) => void;

const globalForStore = globalThis as typeof globalThis & {
  rustNetStore?: Store;
  rustNetListeners?: Set<Listener>;
};

export const listeners = globalForStore.rustNetListeners ?? new Set<Listener>();
globalForStore.rustNetListeners = listeners;

function emptyStore(): Store {
  return {
    server: null,
    players: [],
    disconnected: {},
    teamChanges: {},
    tasks: [],
    events: [],
    chats: [],
    reports: [],
    kills: [],
    alerts: [],
    sleepingBags: [],
    signages: [],
    contacts: [],
    bans: [],
    mutes: [],
    metricsHistory: [],
    users: [],
    counters: {
      stateUpdates: 0,
      chatMessages: 0,
      reports: 0,
      kills: 0,
      tasksCreated: 0,
      tasksCompleted: 0
    },
    lastPluginSeenAt: null,
    startedAt: Date.now()
  };
}

function readStore(): Store {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(storeFile)) return emptyStore();
  try {
    const saved = JSON.parse(fs.readFileSync(storeFile, "utf8")) as Partial<Store>;
    return {
      ...emptyStore(),
      ...saved,
      counters: { ...emptyStore().counters, ...saved.counters },
      startedAt: Date.now()
    };
  } catch {
    return emptyStore();
  }
}

export const store = globalForStore.rustNetStore ?? readStore();
globalForStore.rustNetStore = store;
store.sleepingBags ??= [];
store.signages ??= [];
store.contacts ??= [];
store.metricsHistory ??= [];

ensureBootstrapUser();

export function persistStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  const payload: Store = {
    ...store,
    tasks: store.tasks.slice(-300),
    events: store.events.slice(-800),
    chats: store.chats.slice(-800),
    reports: store.reports.slice(-400),
    kills: store.kills.slice(-600),
    alerts: store.alerts.slice(-400),
    sleepingBags: store.sleepingBags.slice(-1000),
    signages: store.signages.slice(-800),
    contacts: store.contacts.slice(-400),
    metricsHistory: store.metricsHistory.slice(-240)
  };
  fs.writeFileSync(storeFile, JSON.stringify(payload, null, 2));
}

export function ensureBootstrapUser() {
  if (store.users.length > 0) return;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "admin123";
  store.users.push({
    id: crypto.randomUUID(),
    username: "admin",
    displayName: "RUST .NET Owner",
    role: "owner",
    active: true,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
    lastLoginAt: null
  });
  persistStore();
}

export function getSessionUser(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const url = new URL(request.url);
  const cookieToken = parseCookie(request.headers.get("cookie") || "")[sessionCookieName] || "";
  const candidates = [bearer, url.searchParams.get("session") || "", request.headers.get("x-session-token") || "", cookieToken].filter(Boolean);
  for (const token of candidates) {
    const userId = sessionUserId(token);
    if (!userId) continue;
    return { token, user: store.users.find((user) => user.id === userId) || null };
  }
  return { token: candidates[0] || null, user: null as PanelUser | null };
}

function parseCookie(header: string) {
  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf("=");
    if (index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function snapshot(user?: PanelUser | null) {
  const now = Date.now();
  const activeBans = store.bans.filter((ban) => ban.active && (!ban.expiredAt || ban.expiredAt > now));
  const activeMutes = store.mutes.filter((mute) => !mute.expiresAt || mute.expiresAt > now);

  return {
    server: store.server,
    players: store.players,
    disconnected: store.disconnected,
    teamChanges: store.teamChanges,
    tasks: store.tasks.slice(-120).reverse(),
    events: store.events.slice(-180).reverse(),
    chats: store.chats.slice(-160).reverse(),
    reports: store.reports.slice(-100).reverse(),
    kills: store.kills.slice(-120).reverse(),
    alerts: store.alerts.slice(-100).reverse(),
    sleepingBags: store.sleepingBags.slice(-200).reverse(),
    signages: store.signages.slice(-160).reverse(),
    contacts: store.contacts.slice(-100).reverse(),
    bans: activeBans,
    mutes: activeMutes,
    metricsHistory: store.metricsHistory.slice(-120),
    counters: store.counters,
    auth: user ? { user: publicUser(user), roles: roleLabels, permissions: rolePermissions } : null,
    meta: {
      startedAt: store.startedAt,
      now,
      lastPluginSeenAt: store.lastPluginSeenAt,
      pluginOnline: Boolean(store.lastPluginSeenAt && now - store.lastPluginSeenAt < 15000),
      publicBaseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000"
    }
  };
}

export function broadcast(type: string, payload: unknown) {
  for (const listener of listeners) listener({ type, payload });
}

export function pushEvent(type: string, title: string, details: unknown = {}) {
  const entry: EventEntry = {
    id: crypto.randomUUID(),
    type,
    title,
    details,
    createdAt: Date.now()
  };
  store.events.push(entry);
  trim();
  persistStore();
  broadcast("event", entry);
  return entry;
}

export function touchPlugin() {
  store.lastPluginSeenAt = Date.now();
}

export function updateState(payload: { server_info?: ServerState; players?: PlayerState[]; disconnected?: Record<string, string>; team_changes?: Record<string, string> }) {
  store.server = payload.server_info || null;
  store.players = Array.isArray(payload.players) ? payload.players : [];
  store.disconnected = payload.disconnected || {};
  store.teamChanges = payload.team_changes || {};
  store.counters.stateUpdates += 1;
  appendMetricPoint();
  persistStore();
  broadcast("snapshot", snapshot());
}

function appendMetricPoint() {
  const active = store.players.filter((player) => player.status === "active");
  const queued = store.players.filter((player) => player.status === "queued");
  const joining = store.players.filter((player) => player.status === "joining");
  const avgPing = active.length ? Math.round(active.reduce((sum, player) => sum + Number(player.ping || 0), 0) / active.length) : 0;
  const point: MetricPoint = {
    ts: Date.now(),
    online: Number(store.server?.online ?? active.length),
    queued: queued.length,
    joining: joining.length,
    avgPing,
    pendingTasks: store.tasks.filter((task) => task.status === "pending").length,
    reports: store.reports.length,
    kills: store.kills.length,
    alerts: store.alerts.length
  };
  const previous = store.metricsHistory.at(-1);
  if (previous && point.ts - previous.ts < 5000) {
    store.metricsHistory[store.metricsHistory.length - 1] = point;
  } else {
    store.metricsHistory.push(point);
  }
  store.metricsHistory = store.metricsHistory.slice(-240);
}

export function createTask(name: string, data: Record<string, unknown>, label = name) {
  const task: QueueTask = {
    id: crypto.randomUUID(),
    request: { name, data },
    label,
    status: "pending",
    result: null,
    createdAt: Date.now(),
    completedAt: null
  };
  store.tasks.push(task);
  store.counters.tasksCreated += 1;
  pushEvent("task", `Задача: ${label}`, { name, data });
  persistStore();
  broadcast("snapshot", snapshot());
  return task;
}

export function completeTasks(results: Record<string, unknown>) {
  const resultEntries = Object.entries(results);
  if (resultEntries.length === 0) {
    const pending = store.tasks.filter((item) => item.status === "pending");
    if (pending.length === 1 && Date.now() - pending[0].createdAt > 5000) {
      pending[0].status = "failed";
      pending[0].result = "Plugin returned an empty queue response";
      pending[0].completedAt = Date.now();
      store.counters.tasksCompleted += 1;
      pushEvent("task-result", `Ошибка: ${pending[0].label}`, { result: pending[0].result });
      persistStore();
      broadcast("snapshot", snapshot());
    }
    return;
  }
  for (const [id, result] of resultEntries) {
    const task = store.tasks.find((item) => item.id === id);
    if (!task) continue;
    task.status = result === null || typeof result === "string" ? "failed" : "completed";
    task.result = result;
    task.completedAt = Date.now();
    store.counters.tasksCompleted += 1;
    pushEvent("task-result", `${task.status === "failed" ? "Ошибка" : "Выполнено"}: ${task.label}`, { result });
  }
  persistStore();
  broadcast("snapshot", snapshot());
}

export function addBan(entry: Omit<BanEntry, "id" | "createdAt" | "active">) {
  const ban: BanEntry = { ...entry, id: Date.now(), active: true, createdAt: Date.now() };
  store.bans.push(ban);
  persistStore();
  broadcast("snapshot", snapshot());
  return ban;
}

export function addMute(entry: Omit<MuteEntry, "id" | "createdAt">) {
  store.mutes = store.mutes.filter((mute) => mute.steamId !== entry.steamId);
  const mute: MuteEntry = { ...entry, id: crypto.randomUUID(), createdAt: Date.now() };
  store.mutes.push(mute);
  persistStore();
  broadcast("snapshot", snapshot());
  return mute;
}

export function parseDuration(input: unknown) {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return 0;
  const match = value.match(/^(\d+)\s*(m|h|d|w|mo|y)?$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2] || "m";
  const map: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    mo: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000
  };
  return amount * map[unit];
}

export function playerName(steamId: string) {
  return store.players.find((player) => player.steam_id === steamId)?.steam_name || steamId;
}

export function activeBanDtos(players: Array<{ steam_id: string; ip?: string }>) {
  const now = Date.now();
  return players.map((player) => {
    const ban = store.bans.find((item) => item.active && (!item.expiredAt || item.expiredAt > now) && (item.steamId === player.steam_id || item.ip === player.ip));
    return {
      steam_id: player.steam_id,
      ip: player.ip,
      bans: ban
        ? [{
            id: ban.id,
            steam_id: ban.steamId || "",
            ban_ip: ban.ip || "",
            reason: ban.reason,
            expired_at: ban.expiredAt || 0,
            ban_ip_active: Boolean(ban.ip),
            computed_is_active: true,
            sync_project_id: 0,
            sync_should_kick: true
          }]
        : []
    };
  });
}

function trim() {
  store.tasks = store.tasks.slice(-300);
  store.events = store.events.slice(-800);
  store.chats = store.chats.slice(-800);
  store.reports = store.reports.slice(-400);
  store.kills = store.kills.slice(-600);
  store.alerts = store.alerts.slice(-400);
  store.sleepingBags = store.sleepingBags.slice(-1000);
  store.signages = store.signages.slice(-800);
  store.contacts = store.contacts.slice(-400);
  store.metricsHistory = store.metricsHistory.slice(-240);
}
