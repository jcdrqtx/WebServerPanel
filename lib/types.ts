export type Role = "owner" | "admin" | "moderator" | "support" | "viewer" | "pending";

export type Permission =
  | "view"
  | "manage_users"
  | "kick_players"
  | "ban_players"
  | "mute_players"
  | "send_chat"
  | "console"
  | "give_items"
  | "manage_checks"
  | "manage_settings";

export type PanelUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
  passwordHash: string;
  createdAt: number;
  lastLoginAt: number | null;
};

export type PlayerState = {
  steam_id: string;
  steam_name?: string;
  ip?: string;
  ping?: number;
  seconds_connected?: number;
  language?: string;
  position?: string;
  rotation?: string;
  coords?: string;
  can_build?: boolean;
  is_raiding?: boolean;
  no_license?: boolean;
  is_alive?: boolean;
  status?: string;
  team?: string[];
  meta?: Record<string, unknown>;
};

export type ServerState = {
  name?: string;
  hostname?: string;
  level?: string;
  level_url?: string;
  level_image_url?: string;
  description?: string;
  branch?: string;
  avatar_url?: string;
  banner_url?: string;
  online?: number;
  slots?: number;
  reserved?: number;
  version?: string;
  protocol?: string;
  performance?: string;
  port?: number;
  connected?: boolean;
};

export type QueueTask = {
  id: string;
  request: {
    name: string;
    data: Record<string, unknown>;
  };
  label: string;
  status: "pending" | "completed" | "failed";
  result: unknown;
  createdAt: number;
  completedAt: number | null;
};

export type EventEntry = {
  id: string;
  type: string;
  title: string;
  details: unknown;
  createdAt: number;
};

export type ChatEntry = {
  id: string;
  steam_id?: string | null;
  target_steam_id?: string;
  is_team?: boolean;
  text?: string;
  meta?: Record<string, unknown>;
  createdAt: number;
};

export type MetricPoint = {
  ts: number;
  online: number;
  queued: number;
  joining: number;
  avgPing: number;
  pendingTasks: number;
  reports: number;
  kills: number;
  alerts: number;
};

export type BanEntry = {
  id: number;
  steamId: string;
  ip?: string;
  reason: string;
  expiredAt: number;
  active: boolean;
  createdAt: number;
};

export type MuteEntry = {
  id: string;
  steamId: string;
  reason: string;
  expiresAt: number;
  createdAt: number;
};

export type SleepingBagEntry = {
  id: string;
  initiator_steam_id?: string;
  target_steam_id?: string;
  position?: string;
  are_friends?: boolean;
  createdAt: number;
};

export type SignageEntry = {
  id: string;
  net_id?: string | number;
  steam_id?: string;
  type?: string;
  position?: string;
  square?: string;
  image?: string;
  createdAt: number;
};

export type ContactEntry = {
  id: string;
  steam_id?: string;
  message?: string;
  createdAt: number;
};

export type Store = {
  server: ServerState | null;
  players: PlayerState[];
  disconnected: Record<string, string>;
  teamChanges: Record<string, string>;
  tasks: QueueTask[];
  events: EventEntry[];
  chats: ChatEntry[];
  reports: Array<Record<string, unknown>>;
  kills: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  sleepingBags: SleepingBagEntry[];
  signages: SignageEntry[];
  contacts: ContactEntry[];
  bans: BanEntry[];
  mutes: MuteEntry[];
  metricsHistory: MetricPoint[];
  users: PanelUser[];
  counters: {
    stateUpdates: number;
    chatMessages: number;
    reports: number;
    kills: number;
    tasksCreated: number;
    tasksCompleted: number;
  };
  lastPluginSeenAt: number | null;
  startedAt: number;
};
