"use client";

import {
  Activity,
  Ban,
  BarChart3,
  Bed,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Command,
  Copy,
  CreditCard,
  Database,
  Eye,
  ExternalLink,
  FileText,
  Heart,
  Gamepad2,
  Globe2,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Mic,
  MoreVertical,
  Plug,
  Radio,
  Flag,
  Image as ImageIcon,
  Skull,
  AlertTriangle,
  RefreshCcw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCog,
  Users,
  Zap
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Role = "owner" | "admin" | "moderator" | "support" | "viewer" | "pending";
type Permission = "view" | "manage_users" | "kick_players" | "ban_players" | "mute_players" | "send_chat" | "console" | "give_items" | "manage_checks" | "manage_settings";

type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  roleLabel: string;
  active: boolean;
  permissions: Permission[];
};

type Player = {
  steam_id: string;
  steam_name?: string;
  ip?: string;
  ping?: number;
  seconds_connected?: number;
  language?: string;
  coords?: string;
  position?: string;
  rotation?: string;
  status?: string;
  can_build?: boolean;
  is_raiding?: boolean;
  no_license?: boolean;
  is_alive?: boolean;
  team?: string[];
  meta?: {
    tags?: Record<string, string>;
    fields?: Record<string, string>;
  };
};

type PanelState = {
  server: Record<string, any> | null;
  players: Player[];
  tasks: Array<Record<string, any>>;
  events: Array<Record<string, any>>;
  chats: Array<Record<string, any>>;
  reports: Array<Record<string, any>>;
  kills: Array<Record<string, any>>;
  alerts: Array<Record<string, any>>;
  sleepingBags: Array<Record<string, any>>;
  signages: Array<Record<string, any>>;
  contacts: Array<Record<string, any>>;
  bans: Array<Record<string, any>>;
  mutes: Array<Record<string, any>>;
  metricsHistory: Array<Record<string, any>>;
  counters: Record<string, number>;
  auth: { user: PublicUser; roles: Record<Role, string>; permissions: Record<Role, Permission[]> } | null;
  meta: {
    pluginOnline: boolean;
    lastPluginSeenAt: number | null;
    publicBaseUrl: string;
    now: number;
  };
};

const emptyCollections = {
  reports: [],
  kills: [],
  alerts: [],
  sleepingBags: [],
  signages: [],
  contacts: []
};

type SteamProfile = {
  steamId: string;
  name?: string;
  profileUrl?: string;
  avatar?: string;
  avatarMedium?: string;
  avatarFull?: string;
  visibility?: number;
  profileState?: number;
  countryCode?: string;
  createdAt?: number | null;
  lastLogoffAt?: number | null;
  bans?: {
    communityBanned?: boolean;
    vacBanned?: boolean;
    numberOfVacBans?: number;
    daysSinceLastBan?: number;
    numberOfGameBans?: number;
    economyBan?: string;
  } | null;
};

const cookieSessionToken = "__cookie_session__";

type TabId =
  | "home"
  | "players"
  | "chat"
  | "reports"
  | "checks"
  | "art"
  | "alerts"
  | "sleepers"
  | "mutes"
  | "bans"
  | "statistics"
  | "servers"
  | "audit"
  | "integrations"
  | "settings"
  | "project"
  | "users"
  | "billing"
  | "kills"
  | "actions"
  | "contacts"
  | "queue"
  | "events";

const tabs: Array<{ id: TabId; label: string; icon: any; group?: string; permission?: Permission }> = [
  { id: "players", label: "Игроки", icon: Users, group: "Модерация" },
  { id: "chat", label: "Чат", icon: MessageCircle, group: "Модерация" },
  { id: "reports", label: "Репорты", icon: Flag, group: "Модерация" },
  { id: "checks", label: "Проверки", icon: ShieldCheck, group: "Модерация" },
  { id: "art", label: "Рисунки", icon: ImageIcon, group: "Модерация" },
  { id: "alerts", label: "Оповещения", icon: Bell, group: "Модерация" },
  { id: "sleepers", label: "Спальники", icon: Bed, group: "Модерация" },
  { id: "mutes", label: "Муты", icon: Mic, group: "Модерация" },
  { id: "bans", label: "Блокировки", icon: Lock, group: "Модерация" },
  { id: "statistics", label: "Статистика", icon: BarChart3, group: "Управление" },
  { id: "servers", label: "Серверы", icon: Server, group: "Управление" },
  { id: "audit", label: "Журнал аудита", icon: FileText, group: "Управление" },
  { id: "integrations", label: "Интеграции", icon: Plug, group: "Управление" },
  { id: "settings", label: "Настройки", icon: Settings, group: "Управление" },
  { id: "project", label: "Общее", icon: Building2, group: "Проект" },
  { id: "users", label: "Сотрудники", icon: UserCog, group: "Проект", permission: "manage_users" },
  { id: "billing", label: "Биллинг", icon: CreditCard, group: "Проект" },
  { id: "kills", label: "Киллы", icon: Skull, group: "Тех." },
  { id: "actions", label: "Команды", icon: Zap, group: "Тех." },
  { id: "contacts", label: "Контакты", icon: Bell, group: "Тех." },
  { id: "queue", label: "Очередь", icon: Database, group: "Тех." },
  { id: "events", label: "События", icon: Activity, group: "Тех." }
];

const pageMeta: Record<TabId, { title: string; subtitle: string; icon: any }> = {
  home: { title: "Главная", subtitle: "Обзор системы и подключенных серверов", icon: Home },
  players: { title: "Игроки", subtitle: "Управление игроками и их статистикой", icon: Users },
  sleepers: { title: "Спальники", subtitle: "Список размещенных спальников и будущие события", icon: Bed },
  chat: { title: "Чат", subtitle: "Мониторинг и управление чатом сервера", icon: MessageCircle },
  reports: { title: "Репорты", subtitle: "Жалобы игроков и F7 reports", icon: Flag },
  kills: { title: "Киллы", subtitle: "Убийства и combat log из плагина", icon: Skull },
  alerts: { title: "Оповещения", subtitle: "Автоматические уведомления и подозрительные события", icon: Bell },
  art: { title: "Рисунки игроков", subtitle: "Signage, painted items и firework designs", icon: ImageIcon },
  bans: { title: "Блокировки", subtitle: "Баны игроков и связанные ограничения", icon: Lock },
  mutes: { title: "Муты", subtitle: "Голосовые и текстовые ограничения игроков", icon: Mic },
  checks: { title: "Проверки", subtitle: "Вызовы игроков на проверку", icon: ShieldCheck },
  actions: { title: "Команды", subtitle: "Быстрые действия и консоль сервера", icon: Command },
  contacts: { title: "Контакты", subtitle: "Сообщения игроков через команду связи", icon: Bell },
  queue: { title: "Очередь", subtitle: "Команды, отправленные RustApp worker", icon: Database },
  events: { title: "История", subtitle: "Лог действий панели и плагина", icon: Activity },
  statistics: { title: "Статистика", subtitle: "Мониторинг ключевых показателей сервера", icon: BarChart3 },
  servers: { title: "Серверы", subtitle: "Состояние подключенного Rust сервера", icon: Server },
  audit: { title: "Журнал аудита", subtitle: "Действия сотрудников, плагина и очереди", icon: FileText },
  integrations: { title: "Интеграции", subtitle: "Вебхуки, Discord и внешние уведомления", icon: Plug },
  users: { title: "Сотрудники", subtitle: "Авторизация, роли и уровни доступа", icon: UserCog },
  settings: { title: "Настройки", subtitle: "Связь RUST .NET с плагином RustApp", icon: Settings },
  project: { title: "Общее", subtitle: "Основные параметры проекта и панели", icon: Building2 },
  billing: { title: "Биллинг", subtitle: "Тарифы, доступы и ограничения проекта", icon: CreditCard }
};

export default function Page() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState("");
  const [state, setState] = useState<PanelState | null>(null);
  const [tab, setTab] = useState<TabId>("players");
  const [toast, setToast] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [usersData, setUsersData] = useState<any>(null);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);
  const [steamProfiles, setSteamProfiles] = useState<Record<string, SteamProfile>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Проверка сессии только один раз при монтировании
  useEffect(() => {
    const saved = localStorage.getItem("rustNetSession");
    if (saved) {
      setToken(saved);
      // Валидируем сессию перед загрузкой состояния
      fetch("/api/state", {
        credentials: "include",
        headers: { Authorization: `Bearer ${saved}` }
      }).then(async (res) => {
        if (!res.ok) {
          // Сессия невалидна, очищаем
          console.log("Session invalid on load, clearing token");
          localStorage.removeItem("rustNetSession");
          setToken("");
          setIsSessionValid(false);
        } else {
          const data = await res.json();
          setIsSessionValid(true);
          setState(data);
        }
      }).catch((err) => {
        console.error("Session validation error:", err);
        // При ошибке сети не сбрасываем сессию - это может быть временная проблема
        setIsSessionValid(true);
        fetchState(saved);
      });
    } else {
      fetch("/api/state", { credentials: "include" }).then(async (res) => {
        if (!res.ok) {
          setIsSessionValid(false);
          return;
        }
        const data = await res.json();
        setToken(cookieSessionToken);
        setState(data);
        setIsSessionValid(true);
      }).catch(() => setIsSessionValid(false));
    }
  }, []);

  // Подключение к EventSource только после успешной валидации сессии
  useEffect(() => {
    if (!token || isSessionValid !== true) return;
    
    let source: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let errorCount = 0;
    let isClosed = false;
    const MAX_RECONNECT_ATTEMPTS = 10;
    const RECONNECT_DELAY = 3000;

    const connect = () => {
      if (isClosed) return;
      
      try {
        const streamUrl = token === cookieSessionToken ? "/api/stream" : `/api/stream?session=${encodeURIComponent(token)}`;
        source = new EventSource(streamUrl);
        
        source.addEventListener("snapshot", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data) as PanelState;
            setState((previous) => ({
              ...data,
              auth: data.auth || previous?.auth || null
            }));
            errorCount = 0; // Сброс счетчика ошибок при успешном получении snapshot
            setIsSessionValid(true);
          } catch (error) {
            console.error("Failed to parse snapshot:", error);
          }
        });
        
        source.addEventListener("event", (event) => {
          try {
            notify(JSON.parse((event as MessageEvent).data).title || "Новое событие");
          } catch (error) {
            console.error("Failed to parse event:", error);
          }
        });
        
        source.addEventListener("error", (event) => {
          console.log(`EventSource error (attempt ${errorCount + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          errorCount++;
          
          // Закрываем текущее соединение
          if (source) {
            source.close();
            source = null;
          }
          
          // Проверяем, все еще ли токен актуален
          const currentToken = localStorage.getItem("rustNetSession");
          if (currentToken !== token) {
            console.log("Token changed, stopping reconnection");
            return;
          }
          
          // Попытка переподключения
          if (errorCount < MAX_RECONNECT_ATTEMPTS) {
            console.log(`Scheduling reconnect in ${RECONNECT_DELAY}ms...`);
            reconnectTimeout = setTimeout(() => {
              if (!isClosed) {
                connect();
              }
            }, RECONNECT_DELAY);
          } else {
            // После максимального количества попыток проверяем сессию явно
            console.log("Max reconnection attempts reached, validating session...");
        fetch("/api/state", {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` }
        }).then((res) => {
              if (!res.ok) {
                console.log("Session confirmed invalid, logging out");
                localStorage.removeItem("rustNetSession");
                setToken("");
                setState(null);
                setIsSessionValid(false);
              } else {
                console.log("Session still valid, resetting error count and reconnecting");
                errorCount = 0;
                if (!isClosed) {
                  connect();
                }
              }
            }).catch(() => {
              // При ошибке сети предполагаем что сессия все еще валидна
              console.log("Network error during validation, keeping session");
              errorCount = 0;
              if (!isClosed) {
                connect();
              }
            });
          }
        });
        
        source.addEventListener("open", () => {
          console.log("EventSource connection established");
        });
      } catch (error) {
        console.error("Failed to create EventSource:", error);
        errorCount++;
      }
    };

    connect();
    
    return () => {
      isClosed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (source) {
        source.close();
        source = null;
      }
    };
  }, [token, isSessionValid]);

  const user = state?.auth?.user;
  const can = (permission: Permission) => Boolean(user?.permissions.includes(permission));
  const onlinePlayers = state?.players.filter((player) => player.status === "active") || [];
  const queuePlayers = state?.players.filter((player) => player.status === "queued" || player.status === "joining") || [];
  const avgPing = onlinePlayers.length ? Math.round(onlinePlayers.reduce((sum, player) => sum + Number(player.ping || 0), 0) / onlinePlayers.length) : 0;

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.toLowerCase().trim();
    return (state?.players || []).filter((player) => {
      const text = [player.steam_name, player.steam_id, player.ip, player.coords, player.position, player.status].filter(Boolean).join(" ").toLowerCase();
      return (!query || text.includes(query)) && (!statusFilter || player.status === statusFilter);
    });
  }, [state?.players, playerSearch, statusFilter]);

  const playerIdsKey = useMemo(() => {
    return (state?.players || []).map((player) => player.steam_id).filter(Boolean).slice(0, 100).join(",");
  }, [state?.players]);

  useEffect(() => {
    if (!playerIdsKey || !token || isSessionValid !== true) return;
    let cancelled = false;
    fetch(`/api/steam/players?ids=${encodeURIComponent(playerIdsKey)}`, {
      credentials: "include",
      headers: token && token !== cookieSessionToken ? { Authorization: `Bearer ${token}` } : {}
    }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled && data.profiles) {
        setSteamProfiles((previous) => ({ ...previous, ...data.profiles }));
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [playerIdsKey, token, isSessionValid]);

  async function api(path: string, init: RequestInit = {}, session = token) {
    const response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(session && session !== cookieSessionToken ? { Authorization: `Bearer ${session}` } : {}),
        ...(init.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      // При 401 ошибке сначала проверяем сессию явно, прежде чем сбрасывать
      if (response.status === 401 && session === token) {
        console.log("API returned 401, validating session...");
        try {
          const validationRes = await fetch("/api/state", {
            credentials: "include",
            headers: session && session !== cookieSessionToken ? { Authorization: `Bearer ${session}` } : {}
          });
          if (!validationRes.ok) {
            console.log("Session confirmed invalid by /api/state, logging out");
            localStorage.removeItem("rustNetSession");
            setToken("");
            setState(null);
            setIsSessionValid(false);
          } else {
            console.log("Session still valid despite 401, keeping session");
          }
        } catch (err) {
          console.error("Error during session validation:", err);
          // При ошибке проверки не сбрасываем сессию
        }
      }
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  async function fetchState(session = token) {
    try {
      const data = await api("/api/state", {}, session);
      setState(data);
    } catch (error) {
      if (session && localStorage.getItem("rustNetSession") !== session) return;
      notify(error instanceof Error ? error.message : "Ошибка загрузки");
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      username: String(form.get("username") || ""),
      password: String(form.get("password") || ""),
      displayName: String(form.get("displayName") || "")
    };

    try {
      const response = await fetch(authMode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.pending) {
        notify(data.message);
        return;
      }
      localStorage.setItem("rustNetSession", data.token);
      setToken(data.token);
      setIsSessionValid(true); // Устанавливаем валидность сессии сразу после успешной авторизации
      notify("Вы успешно авторизовались");
      fetchState(data.token);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Ошибка авторизации");
    }
  }

  async function runAction(type: string, data: Record<string, any>) {
    try {
      await api("/api/action", { method: "POST", body: JSON.stringify({ type, data }) });
      notify("Задача добавлена в очередь");
      fetchState();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Действие не выполнено");
    }
  }

  async function loadUsers() {
    if (!can("manage_users")) return;
    try {
      setUsersData(await api("/api/users"));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось загрузить пользователей");
    }
  }

  async function updateUser(id: string, payload: Record<string, any>) {
    try {
      await api(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      notify("Права обновлены");
      loadUsers();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось обновить пользователя");
    }
  }

  function logout() {
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: token && token !== cookieSessionToken ? { Authorization: `Bearer ${token}` } : {}
    }).catch(() => undefined);
    localStorage.removeItem("rustNetSession");
    setToken("");
    setState(null);
    setIsSessionValid(false);
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3600);
  }

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab, state?.auth?.user?.role]);

  // Показываем экран авторизации только если сессия явно невалидна или токена нет
  // isSessionValid === null означает что проверка еще идет - показываем загрузку
  if (isSessionValid === null) {
    return (
      <div className="auth-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f13' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>RUST .NET</div>
          <div style={{ opacity: 0.7 }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!token || isSessionValid === false) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} submitAuth={submitAuth} toast={toast} />;
  }

  if (!state?.auth?.user) {
    return (
      <div className="auth-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f13' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>RUST .NET</div>
          <div style={{ opacity: 0.7 }}>Загрузка панели...</div>
          <button className="text-button" style={{ marginTop: 16 }} onClick={logout}>Сменить аккаунт</button>
        </div>
      </div>
    );
  }

  const currentUser = state.auth.user;
  const meta = pageMeta[tab];
  const MetaIcon = meta.icon;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">R</span>
          <div>
            <strong>RUST .NET</strong>
            <small>SERVER CONTROL</small>
          </div>
        </div>

        <nav className="nav">
          {Object.entries(groupTabs(tabs.filter((item) => !item.permission || can(item.permission)))).map(([group, items]) => (
            <section className="nav-group" key={group}>
              <button className="nav-group-title" onClick={() => setCollapsedGroups((previous) => ({ ...previous, [group]: !previous[group] }))}>
                <span>{group}</span>
                {collapsedGroups[group] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              {!collapsedGroups[group] ? items.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
                    <Icon size={16} /> {item.label}
                  </button>
                );
              }) : null}
            </section>
          ))}
        </nav>

        <div className="profile">
          <div>
            <strong>{currentUser.displayName || currentUser.username}</strong>
            <small>{currentUser.roleLabel}</small>
          </div>
          <button className="danger-button" onClick={logout}><LogOut size={16} /> Выйти</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="page-head">
          <div className="page-title">
            <span className="page-icon"><MetaIcon size={28} /></span>
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
          </div>
          <div className="top-actions">
            <span className={`status-pill ${state.meta.pluginOnline ? "online" : ""}`}>
              <Radio size={15} /> плагин {state.meta.pluginOnline ? "онлайн" : "офлайн"}
            </span>
            <button className="icon-button" onClick={() => fetchState()} title="Обновить"><RefreshCcw size={18} /></button>
          </div>
        </header>

        {tab === "home" ? <HomeView state={state} onlinePlayers={onlinePlayers} queuePlayers={queuePlayers} avgPing={avgPing} steamProfiles={steamProfiles} /> : null}
        {tab === "players" ? <PlayersView state={state} players={filteredPlayers} allPlayers={state.players} search={playerSearch} setSearch={setPlayerSearch} status={statusFilter} setStatus={setStatusFilter} runAction={runAction} steamProfiles={steamProfiles} /> : null}
        {tab === "sleepers" ? <SleepersView state={state} /> : null}
        {tab === "chat" ? <ChatView state={state} canSend={can("send_chat")} runAction={runAction} /> : null}
        {tab === "reports" ? <ReportsView state={state} /> : null}
        {tab === "kills" ? <KillsView state={state} /> : null}
        {tab === "alerts" ? <AlertsView state={state} /> : null}
        {tab === "art" ? <ArtView state={state} runAction={runAction} /> : null}
        {tab === "mutes" ? <MutesView state={state} runAction={runAction} /> : null}
        {tab === "bans" ? <BlocksView state={state} runAction={runAction} /> : null}
        {tab === "checks" ? <ChecksView state={state} players={state.players} runAction={runAction} /> : null}
        {tab === "actions" ? <ActionsView players={state.players} can={can} runAction={runAction} /> : null}
        {tab === "contacts" ? <ContactsView state={state} runAction={runAction} /> : null}
        {tab === "queue" ? <QueueView state={state} runAction={runAction} /> : null}
        {tab === "events" ? <EventsView state={state} filter={eventFilter} setFilter={setEventFilter} /> : null}
        {tab === "statistics" ? <StatisticsView state={state} /> : null}
        {tab === "servers" ? <ServersView state={state} /> : null}
        {tab === "audit" ? <AuditView state={state} filter={eventFilter} setFilter={setEventFilter} /> : null}
        {tab === "integrations" ? <IntegrationsView state={state} /> : null}
        {tab === "users" ? <UsersView data={usersData} updateUser={updateUser} /> : null}
        {tab === "settings" ? <SettingsView state={state} notify={notify} /> : null}
        {tab === "project" ? <ProjectView state={state} /> : null}
        {tab === "billing" ? <BillingView /> : null}
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function AuthScreen({ mode, setMode, submitAuth, toast }: { mode: "login" | "register"; setMode: (mode: "login" | "register") => void; submitAuth: (event: FormEvent<HTMLFormElement>) => void; toast: string }) {
  return (
    <main className="auth-screen">
      <div className="stars" />
      <section className="auth-copy">
        <div className="auth-logo"><Shield size={42} /><div><h1>RUST .NET</h1><small>CREATE BY ECLIPSA</small></div></div>
        <p>Темная современная панель для управления Rust-серверами: real-time мониторинг, модерация, команды, выдача предметов и права персонала.</p>
        <div className="chips">
          <span><LayoutDashboard size={14} /> Дешборды</span>
          <span><Zap size={14} /> Мгновенные команды</span>
          <span><KeyRound size={14} /> Роли доступа</span>
          <span><MessageCircle size={14} /> Чат и репорты</span>
          <span><Server size={14} /> Rust bridge</span>
        </div>
      </section>

      <form className="auth-card" method="post" action={mode === "login" ? "/api/auth/login" : "/api/auth/register"} onSubmit={submitAuth}>
        <div className="card-head">
          <div>
            <h2>{mode === "login" ? "Вход в панель" : "Регистрация"}</h2>
            <p>{mode === "login" ? "Используйте учетные данные персонала" : "Новая заявка ожидает выдачи роли"}</p>
          </div>
          <button type="button" className="icon-button" onClick={() => setMode(mode === "login" ? "register" : "login")}><RefreshCcw size={16} /></button>
        </div>
        {mode === "register" ? <label>Отображаемое имя<input name="displayName" placeholder="Eclipsa" /></label> : null}
        <label>Имя пользователя<input name="username" autoComplete="username" placeholder="admin" required /></label>
        <label>Пароль<input name="password" type="password" autoComplete="current-password" placeholder="Введите пароль" required /></label>
        <button className="primary-button" type="submit">{mode === "login" ? "Войти в панель" : "Создать аккаунт"}</button>
        <button type="button" className="text-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Создать аккаунт" : "Уже есть аккаунт"}</button>
        <p className="note">Первый вход: <b>admin</b> / <b>admin123</b></p>
      </form>
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function HomeView({ state, onlinePlayers, queuePlayers, avgPing, steamProfiles }: { state: PanelState; onlinePlayers: Player[]; queuePlayers: Player[]; avgPing: number; steamProfiles: Record<string, SteamProfile> }) {
  const activePunish = state.bans.length + state.mutes.length;
  const server = state.server || {};
  const capacity = Math.max(1, Number(server.slots || onlinePlayers.length || 1));
  const fill = Math.min(100, Math.round((Number(server.online ?? onlinePlayers.length) / capacity) * 100));
  const recent = [...state.events].slice(0, 5);
  return (
    <>
      <div className="metric-grid">
        <Metric icon={Users} color="purple" label="Онлайн игроков" value={String(server.online ?? onlinePlayers.length)} sub={`${server.slots ?? 0} слотов`} />
        <Metric icon={Flag} color="orange" label="Репорты" value={String((state.reports || []).length)} sub="Жалобы игроков" />
        <Metric icon={Server} color="blue" label="Задачи" value={String(state.tasks.filter((task) => task.status === "pending").length)} sub="В очереди плагина" />
        <Metric icon={Radio} color="green" label="Подключаются" value={String(queuePlayers.length)} sub="Очередь / вход" />
        <Metric icon={Ban} color="red" label="Ограничения" value={String(activePunish)} sub={`${avgPing}ms avg ping`} />
      </div>
      <div className="metric-grid four">
        <Metric icon={Skull} color="red" label="Киллы" value={String(state.kills.length)} sub="Боевой журнал" />
        <Metric icon={AlertTriangle} color="orange" label="Оповещения" value={String(state.alerts.length)} sub="Подозрительные события" />
        <Metric icon={Bed} color="purple" label="Спальники" value={String(state.sleepingBags.length)} sub="Sleeping bags" />
        <Metric icon={ImageIcon} color="blue" label="Рисунки" value={String(state.signages.length)} sub="Signage gallery" />
      </div>
      <div className="dashboard-grid">
        <Panel icon={Server} title="Сервер" subtitle="Информация из PluginStateUpdatePayload">
          <ServerHero server={server} players={Number(server.online ?? onlinePlayers.length)} fill={fill} />
        </Panel>
        <Panel icon={Activity} title="Состояние моста" subtitle="Пульс плагина и обработчика API">
          <div className="info-grid">
            <Info label="Плагин" value={state.meta.pluginOnline ? "онлайн" : "офлайн"} tone={state.meta.pluginOnline ? "good" : "bad"} />
            <Info label="Последний сигнал" value={state.meta.lastPluginSeenAt ? formatDate(state.meta.lastPluginSeenAt) : "-"} />
            <Info label="Обновлений state" value={String(state.counters.stateUpdates || 0)} />
            <Info label="Задач выполнено" value={`${state.counters.tasksCompleted || 0}/${state.counters.tasksCreated || 0}`} />
            <Info label="Protocol" value={String(server.protocol || "-")} />
            <Info label="Производительность" value={server.performance ? `${Number(server.performance).toFixed(3)} ms` : "-"} />
          </div>
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel icon={Users} title="Видимость игроков" subtitle="Онлайн, очередь, команды и флаги">
          <div className="roster-strip">
            {state.players.length === 0 ? <div className="empty">Плагин пока не прислал игроков</div> : state.players.slice(0, 8).map((player) => (
              <article className="mini-player" key={player.steam_id}>
                <Avatar player={player} profile={steamProfiles[player.steam_id]} />
                <div>
                  <strong>{player.steam_name || player.steam_id}</strong>
                  <small>{player.coords || player.position || "-"} · {player.ping ?? 0}ms</small>
                </div>
                <Status status={player.status} />
              </article>
            ))}
          </div>
        </Panel>
        <Panel icon={Clock} title="Последние события" subtitle="Короткая лента панели">
          <div className="event-list compact-list">
            {recent.length === 0 ? <div className="empty">Событий пока нет</div> : recent.map((event) => (
              <article className="event-item" key={event.id}>
                <strong>{event.title}</strong>
                <small>{event.type} · {formatDate(event.createdAt)}</small>
              </article>
            ))}
          </div>
        </Panel>
      </div>
      <Panel icon={Activity} title="Графики сервера" subtitle="История последних state update от плагина">
        <div className="chart-grid">
          <SparkChart title="Онлайн" data={state.metricsHistory} field="online" color="#6d5dfc" suffix="" />
          <SparkChart title="Очередь" data={state.metricsHistory} field="queued" color="#20c86f" suffix="" />
          <SparkChart title="Средний ping" data={state.metricsHistory} field="avgPing" color="#f59e0b" suffix="ms" />
          <SparkChart title="Задачи в ожидании" data={state.metricsHistory} field="pendingTasks" color="#3b82f6" suffix="" />
        </div>
      </Panel>
    </>
  );
}

function PlayersView({ state, players, allPlayers, search, setSearch, status, setStatus, runAction, steamProfiles }: any) {
  const [selected, setSelected] = useState<Player | null>(null);
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [onlyVpn, setOnlyVpn] = useState(false);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [showConnectionType, setShowConnectionType] = useState(true);
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);
  const [highlightVpn, setHighlightVpn] = useState(true);
  const active = allPlayers.filter((p: Player) => p.status === "active");
  const visiblePlayers = players.filter((player: Player) => {
    if (onlyOnline && player.status !== "active") return false;
    if (onlyVpn && !player.no_license && !player.meta?.tags?.vpn && !player.meta?.fields?.vpn) return false;
    if (onlyFlagged && !player.can_build && !player.is_raiding && !player.no_license && player.is_alive !== false) return false;
    return true;
  });
  return (
    <div className={`dense-shell ${showFiltersPanel ? "" : "no-side-panel"}`}>
      <section className="dense-main">
        <div className="dense-toolbar">
          <div className="toolbar-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск..." /></div>
          <button className="icon-button" title="Фильтры" onClick={() => setShowFiltersPanel(!showFiltersPanel)}><SlidersHorizontal size={18} /></button>
        </div>
        <div className="dense-stats">
          <MiniStat label="Всего" value={allPlayers.length} />
          <MiniStat label="Онлайн" value={active.length} />
          <MiniStat label="Очередь" value={allPlayers.filter((p: Player) => p.status !== "active").length} />
          <MiniStat label="Пинг" value={`${avgPingFor(allPlayers)}ms`} />
        </div>
        <div className="table-wrap dense-table">
          <table>
            <thead><tr><th>Игрок</th><th>SteamID</th><th>IP адрес</th><th>Страна</th><th>Позиция</th><th>Провайдер</th><th>Сервер</th><th /></tr></thead>
            <tbody>
              {visiblePlayers.length === 0 ? <tr><td colSpan={8}>Нет игроков по текущему фильтру</td></tr> : visiblePlayers.map((player: Player) => (
                <tr key={player.steam_id} onClick={() => setSelected(player)}>
                  <td><div className="player-cell"><Avatar player={player} profile={steamProfiles[player.steam_id]} /><div><strong>{steamProfiles[player.steam_id]?.name || player.steam_name || "unknown"}</strong><small>{player.status === "active" ? `онлайн ${formatDuration((player.seconds_connected || 0) * 1000)}` : player.status || "offline"}</small></div></div></td>
                  <td>{player.steam_id}<small>{player.language || "client"}</small></td>
                  <td className={highlightVpn && player.no_license ? "warn-text" : ""}>{player.ip || "-"} <ExternalLink size={13} /></td>
                  <td><Globe2 size={14} /> {countryLabel(steamProfiles[player.steam_id]?.countryCode || player.language)}</td>
                  <td>{player.coords || player.position || "-"}</td>
                  <td>{showConnectionType ? player.meta?.fields?.provider || player.meta?.tags?.provider || `${player.ping ?? 0}ms` : "-"}</td>
                  <td>{state.server?.name || state.server?.hostname || "Rust server"}</td>
                  <td><MoreVertical size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {showFiltersPanel ? <aside className="settings-panel">
        <div className="settings-head">
          <div className="toolbar-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск" /></div>
          <button className="icon-button" title="Скрыть фильтры" onClick={() => setShowFiltersPanel(false)}><SlidersHorizontal size={16} /></button>
        </div>
        <h3>Фильтры</h3>
        <ToggleRow label="Только онлайн игроки" checked={onlyOnline} onChange={setOnlyOnline} />
        <ToggleRow label="Только игроков с VPN" checked={onlyVpn} onChange={setOnlyVpn} />
        <ToggleRow label="Только с игровыми флагами" checked={onlyFlagged} onChange={setOnlyFlagged} />
        <label className="compact-label">Только с сервера<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Все</option><option value="active">Онлайн</option><option value="joining">Подключается</option><option value="queued">Очередь</option></select></label>
        <div className="panel-divider" />
        <h3>Внешний вид</h3>
        <ToggleRow label="Показывать тип подключения" checked={showConnectionType} onChange={setShowConnectionType} />
        <ToggleRow label="Выделять IP с VPN" checked={highlightVpn} onChange={setHighlightVpn} />
      </aside> : null}
      {selected ? <PlayerDrawer player={selected} state={state} runAction={runAction} onClose={() => setSelected(null)} steamProfiles={steamProfiles} /> : null}
    </div>
  );
}

function ChatView({ state, canSend, runAction }: { state: PanelState; canSend: boolean; runAction: any }) {
  const [message, setMessage] = useState("");
  const [targetSteamId, setTargetSteamId] = useState("");
  const [sendMode, setSendMode] = useState<"global" | "direct" | "team">("global");
  const [query, setQuery] = useState("");
  const [showGlobal, setShowGlobal] = useState(true);
  const [showModerators, setShowModerators] = useState(true);
  const [showPrivate, setShowPrivate] = useState(true);
  const [showTeam, setShowTeam] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [highlightBadWords, setHighlightBadWords] = useState(true);
  const [highlightCustomWords, setHighlightCustomWords] = useState(false);
  const [playSound, setPlaySound] = useState("Нет");
  const [showAvatars, setShowAvatars] = useState(false);
  const [chatPosition, setChatPosition] = useState("Центр");
  const messages = state.chats.filter((chat) => {
    const text = [chat.text, chat.steam_id, chat.target_steam_id, nameBySteam(state.players, chat.steam_id), nameBySteam(state.players, chat.target_steam_id)].filter(Boolean).join(" ").toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (chat.target_steam_id && !showPrivate) return false;
    if (chat.is_team && !showTeam) return false;
    if (!chat.target_steam_id && !chat.is_team && chat.meta?.direction !== "outgoing" && !showGlobal) return false;
    if (chat.meta?.direction === "outgoing" && !showModerators) return false;
    return true;
  });
  return (
    <div className="moderation-layout">
      <section className={`chat-console ${chatPosition === "Слева" ? "left-chat" : ""}`}>
        <div className="chat-toolbar">
          <button className={sendMode === "global" ? "active" : ""} onClick={() => setSendMode("global")}><MessageCircle size={16} /></button>
          <button className={sendMode === "team" ? "active" : ""} onClick={() => setSendMode("team")}><Users size={16} /></button>
          <button className={sendMode === "direct" ? "active" : ""} onClick={() => setSendMode("direct")}><UserCog size={16} /></button>
          <div className="toolbar-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск сообщений" /></div>
        </div>
        {sendMode !== "global" ? <div className="target-bar"><select disabled={!canSend} value={targetSteamId} onChange={(event) => setTargetSteamId(event.target.value)}><option value="">Выберите игрока</option>{state.players.filter((player) => player.status === "active").map((player) => <option key={player.steam_id} value={player.steam_id}>{player.steam_name || player.steam_id}</option>)}</select></div> : null}
        <div className="chat-stream">
          {messages.length === 0 ? <div className="empty">Сообщений пока нет</div> : messages.map((chat) => {
            const mode = chat.target_steam_id ? "DM" : chat.is_team ? "TEAM" : chat.meta?.direction === "outgoing" ? "PANEL" : "GLOBAL";
            const author = chat.meta?.direction === "outgoing" ? String(chat.meta?.initiator_name || "panel") : nameBySteam(state.players, chat.steam_id);
            const target = chat.target_steam_id ? ` → ${nameBySteam(state.players, chat.target_steam_id)}` : "";
            return <article className={`chat-row ${chat.meta?.direction === "outgoing" ? "outgoing" : ""} ${highlightBadWords && hasBadWord(chat.text || "") ? "flagged-chat" : ""}`} key={chat.id}>{showTime ? <time>{chatTime(chat.createdAt)}</time> : null}{showAvatars ? <span className="avatar tiny">{initials(author)}</span> : null}<span>[{mode}]</span><b>{author}{target}</b><p>{chat.text}</p></article>;
          })}
        </div>
        <form className="chat-input" onSubmit={(event) => { event.preventDefault(); if (!message.trim()) return; if (sendMode === "team") runAction("chatTeam", { steamId: targetSteamId, message }); else runAction("chat", { message, targetSteamId: sendMode === "direct" ? targetSteamId || undefined : undefined }); setMessage(""); }}>
          <input disabled={!canSend || (sendMode !== "global" && !targetSteamId)} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={canSend ? chatPlaceholder(sendMode) : "Нет прав на отправку"} />
          <button disabled={!canSend} className="primary-button" title="Отправить"><Send size={16} /></button>
        </form>
      </section>
      <aside className="settings-panel">
        <h3>Сообщения</h3>
        <ToggleRow label="Показывать глобальные сообщения" checked={showGlobal} onChange={setShowGlobal} />
        <ToggleRow label="Показывать сообщения от модераторов" checked={showModerators} onChange={setShowModerators} />
        <ToggleRow label="Показывать личные сообщения" checked={showPrivate} onChange={setShowPrivate} />
        <ToggleRow label="Показывать командные сообщения" checked={showTeam} onChange={setShowTeam} />
        <div className="hint-box">Панель может отправлять глобальные сообщения, личные сообщения и сообщение всей команде выбранного игрока через очередь плагина.</div>
        <div className="panel-divider" />
        <h3>Цензура</h3>
        <ToggleRow label="Подсвечивать матерные слова" checked={highlightBadWords} onChange={setHighlightBadWords} />
        <ToggleRow label="Подсвечивать слова из списка" checked={highlightCustomWords} onChange={setHighlightCustomWords} />
        <label className="compact-label">Воспроизводить звук<select value={playSound} onChange={(event) => setPlaySound(event.target.value)}><option>Нет</option><option>Да</option></select></label>
        <div className="panel-divider" />
        <h3>Внешний вид</h3>
        <ToggleRow label="Показывать время" checked={showTime} onChange={setShowTime} />
        <ToggleRow label="Показывать аватарки игроков" checked={showAvatars} onChange={setShowAvatars} />
        <label className="compact-label">Позиция чата<select value={chatPosition} onChange={(event) => setChatPosition(event.target.value)}><option>Центр</option><option>Слева</option></select></label>
        <div className="info-grid">
          <Info label="Всего" value={String(state.chats.length)} />
          <Info label="Командный чат" value={String(state.chats.filter((chat) => chat.is_team).length)} />
          <Info label="Личные" value={String(state.chats.filter((chat) => chat.target_steam_id).length)} />
          <Info label="С панели" value={String(state.chats.filter((chat) => chat.meta?.direction === "outgoing").length)} />
        </div>
      </aside>
    </div>
  );
}

function ReportsView({ state }: { state: PanelState }) {
  return (
    <Panel icon={Flag} title="Репорты" subtitle="Жалобы из UI плагина и F7 auto-parse">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Инициатор</th><th>Цель</th><th>Причина</th><th>Сообщение</th><th>Sub targets</th><th>Время</th></tr></thead>
          <tbody>
            {state.reports.length === 0 ? <tr><td colSpan={6}>Репортов пока нет</td></tr> : state.reports.map((report) => (
              <tr key={report.id}>
                <td>{nameBySteam(state.players, report.initiator_steam_id)}</td>
                <td>{nameBySteam(state.players, report.target_steam_id)}</td>
                <td>{report.reason || "-"}</td>
                <td>{report.message || "-"}</td>
                <td>{Array.isArray(report.sub_targets_steam_ids) ? report.sub_targets_steam_ids.length : 0}</td>
                <td>{formatDate(report.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PlayerProfileActions({ player, players, runAction }: { player: Player; players: Player[]; runAction: any }) {
  const [message, setMessage] = useState("");
  const [teamMessage, setTeamMessage] = useState("");
  const [command, setCommand] = useState("status");
  const teamNames = (player.team || []).map((steamId) => nameBySteam(players, steamId));
  const commandTemplates = [
    { label: "Статус", value: "status" },
    { label: "Кик", value: "kick {steamId} \"Kicked by admin\"" },
    { label: "Сообщить", value: "say Админ проверяет {name}" },
    { label: "Выдать AK", value: "inventory.giveto {steamId} rifle.ak 1" },
    { label: "Выдать аптечки", value: "inventory.giveto {steamId} syringe.medical 5" }
  ];

  return (
    <div className="profile-tools">
      <div className="team-strip">
        <small>Команда</small>
        <strong>{teamNames.length ? teamNames.join(", ") : "нет данных"}</strong>
      </div>
      <form className="profile-tool-row" onSubmit={(event) => { event.preventDefault(); if (message.trim()) runAction("chat", { targetSteamId: player.steam_id, message }); setMessage(""); }}>
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="DM игроку" />
        <button><Send size={14} /> DM</button>
      </form>
      <form className="profile-tool-row" onSubmit={(event) => { event.preventDefault(); if (teamMessage.trim()) runAction("chatTeam", { steamId: player.steam_id, message: teamMessage }); setTeamMessage(""); }}>
        <input value={teamMessage} onChange={(event) => setTeamMessage(event.target.value)} placeholder="Сообщение всей команде" />
        <button disabled={!player.team?.length}><Users size={14} /> Team</button>
      </form>
      <form className="profile-command" onSubmit={(event) => { event.preventDefault(); runAction("playerCommand", { steamId: player.steam_id, command }); }}>
        <div className="command-templates">
          {commandTemplates.map((item) => <button type="button" key={item.label} onClick={() => setCommand(item.value)}>{item.label}</button>)}
        </div>
        <label>Команда профиля<input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="inventory.giveto {steamId} rifle.ak 1" /></label>
        <small>Токены: {"{steamId}"}, {"{name}"}, {"{ip}"}, {"{coords}"}, {"{position}"}</small>
        <button className="primary-button"><Command size={14} /> Выполнить на сервере</button>
      </form>
    </div>
  );
}

function KillsView({ state }: { state: PanelState }) {
  return (
    <Panel icon={Skull} title="Киллы и combat log" subtitle="Убийства, дистанция, оружие и история попаданий">
      <div className="event-list">
        {state.kills.length === 0 ? <div className="empty">Киллов пока нет</div> : state.kills.map((kill) => (
          <article className="event-item" key={kill.id}>
            <strong>{nameBySteam(state.players, kill.initiator_steam_id)} → {nameBySteam(state.players, kill.target_steam_id)}</strong>
            <small>{kill.weapon || "unknown weapon"} · {kill.distance ?? 0}m · {kill.is_headshot ? "headshot" : "body"} · {formatDate(kill.createdAt)}</small>
            {Array.isArray(kill.hit_history) && kill.hit_history.length ? <code>{compact(kill.hit_history.slice(0, 4))}</code> : null}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function AlertsView({ state }: { state: PanelState }) {
  return (
    <Panel icon={AlertTriangle} title="Alerts" subtitle="Custom alerts, IP-ban joins и интеграции других плагинов">
      <div className="event-list">
        {state.alerts.length === 0 ? <div className="empty">Alerts пока нет</div> : state.alerts.map((alert) => (
          <article className="event-item" key={alert.id}>
            <strong>{alert.type || alert.category || "alert"}</strong>
            <small>{formatDate(alert.createdAt)}</small>
            <code>{compact(alert.meta || alert.data || alert)}</code>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SleepersView({ state }: { state: PanelState }) {
  const uniquePlayers = new Set(state.sleepingBags.map((bag) => bag.target_steam_id || bag.initiator_steam_id).filter(Boolean));
  return (
    <>
      <div className="metric-grid two">
        <Metric icon={Bed} color="purple" label="Всего спальников" value={String(state.sleepingBags.length)} sub="В памяти панели" />
        <Metric icon={Users} color="green" label="Игроков со спальниками" value={String(uniquePlayers.size)} sub="Уникальные SteamID" />
      </div>
      <Panel icon={Bed} title="Список спальников" subtitle="Данные из CanAssignBed hook">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Инициатор</th><th>Владелец</th><th>Позиция</th><th>Друзья</th><th>Время</th></tr></thead>
            <tbody>
              {state.sleepingBags.length === 0 ? <tr><td colSpan={5}>Спальников пока нет</td></tr> : state.sleepingBags.map((bag) => (
                <tr key={bag.id}>
                  <td>{nameBySteam(state.players, bag.initiator_steam_id)}</td>
                  <td>{nameBySteam(state.players, bag.target_steam_id)}</td>
                  <td>{bag.position || "-"}</td>
                  <td>{bag.are_friends ? "Да" : "Нет"}</td>
                  <td>{formatDate(bag.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function ArtView({ state, runAction }: { state: PanelState; runAction: any }) {
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({});
  return (
    <Panel icon={ImageIcon} title="Рисунки игроков" subtitle="Signage, painted items и fireworks">
      <div className="art-grid">
        {state.signages.length === 0 ? <div className="empty">Рисунков пока нет</div> : state.signages.map((item) => (
          <article className="art-card" key={item.id}>
            {item.image ? <img alt="player signage" src={`data:image/png;base64,${item.image}`} /> : <div className="art-placeholder"><ImageIcon size={34} /></div>}
            <div className="art-card-head">
              <strong>{nameBySteam(state.players, item.steam_id)}</strong>
              <div className="row-actions">
                <button title="В избранное" className={favoriteIds[item.id] ? "active" : ""} onClick={() => setFavoriteIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}><Heart size={15} /></button>
                <button title="Удалить entity на сервере" className="danger-mini" disabled={!item.net_id} onClick={() => runAction("deleteEntity", { netId: item.net_id })}><Trash2 size={15} /></button>
              </div>
            </div>
            <small>{item.type || "signage"} · {item.square || item.position || "-"} · #{String(item.net_id || "-")}</small>
            <small>{formatDate(item.createdAt)}</small>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function MutesView({ state, runAction }: { state: PanelState; runAction: any }) {
  return (
    <section className="dense-main">
      <div className="dense-toolbar">
        <div><h2>Муты</h2><p>Активные ограничения чата и голоса</p></div>
        <MiniStat label="Активно" value={state.mutes.length} />
      </div>
      <div className="table-wrap dense-table">
        <table>
          <thead><tr><th>Дата</th><th>Игрок</th><th>Срок</th><th>Причина</th><th /></tr></thead>
          <tbody>
            {state.mutes.length === 0 ? <tr><td colSpan={5}>Мутов нет</td></tr> : state.mutes.map((mute) => (
              <tr key={mute.id}>
                <td>{formatDate(mute.createdAt)}</td>
                <td><PlayerMini players={state.players} steamId={mute.steamId} /></td>
                <td>до {mute.expiresAt ? formatDate(mute.expiresAt) : "навсегда"}</td>
                <td><span className="reason-pill">{mute.reason || "Без причины"}</span></td>
                <td><button className="success-icon" onClick={() => runAction("unmute", { steamId: mute.steamId })}><Mic size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BlocksView({ state, runAction }: { state: PanelState; runAction: any }) {
  const relatedByReason = (reason: string) => state.bans.filter((ban) => ban.reason === reason).slice(0, 5);
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  return (
    <section className="dense-main">
      <div className="dense-toolbar">
        <div><h2>Блокировки</h2><p>Баны, причины и быстрые действия</p></div>
        <MiniStat label="Активно" value={state.bans.length} />
      </div>
      <div className="table-wrap dense-table">
        <table>
          <thead><tr><th>Дата</th><th>Заблокировал</th><th>Игрок</th><th>Сервер</th><th>Срок</th><th>Причина</th><th /></tr></thead>
          <tbody>
            {state.bans.length === 0 ? <tr><td colSpan={7}>Блокировок нет</td></tr> : state.bans.map((ban) => (
              <tr key={ban.id} onClick={() => setSelected(ban)}>
                <td>{formatDate(ban.createdAt)}</td>
                <td>Панель<small>Rust .NET</small></td>
                <td><PlayerMini players={state.players} steamId={ban.steamId} /></td>
                <td>На всех</td>
                <td>{ban.expiredAt ? `до ${formatDate(ban.expiredAt)}` : "Навсегда"}</td>
                <td><span className="reason-pill">{ban.reason || "Без причины"}</span></td>
                <td><button className="success-icon" onClick={(event) => { event.stopPropagation(); runAction("unban", { steamId: ban.steamId }); }}><Lock size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? <BanModal ban={selected} related={relatedByReason(selected.reason)} state={state} runAction={runAction} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function ChecksView({ state, players, runAction }: { state: PanelState; players: Player[]; runAction: any }) {
  const [steamId, setSteamId] = useState(players[0]?.steam_id || "");
  const checks = state.events.filter((event) => ["check-started", "check-finished", "notice"].includes(event.type) || String(event.title || "").toLowerCase().includes("check"));
  return (
    <div className="moderation-layout">
      <section className="dense-main">
        <div className="dense-toolbar">
          <div><h2>Проверки</h2><p>Запуск, завершение и журнал вызовов</p></div>
          <select value={steamId} onChange={(event) => setSteamId(event.target.value)}>{players.map((player) => <option key={player.steam_id} value={player.steam_id}>{player.steam_name || player.steam_id}</option>)}</select>
        </div>
        <div className="check-timeline">
          {checks.length === 0 ? <div className="empty">Истории проверок пока нет</div> : checks.slice(0, 20).map((event) => (
            <article className="timeline-row" key={event.id}>
              <time>{formatDate(event.createdAt)}</time>
              <span />
              <div><strong>{event.title}</strong><p>{compact(event.details)}</p></div>
            </article>
          ))}
        </div>
      </section>
      <aside className="settings-panel">
        <h3>Действия</h3>
        <button onClick={() => runAction("noticeGet", { steamId })}>Запросить статус</button>
        <button className="primary-button" onClick={() => runAction("notice", { steamId, value: true })}>Показать табличку</button>
        <button onClick={() => runAction("notice", { steamId, value: false })}>Скрыть табличку</button>
        <button onClick={() => runAction("checkStarted", { steamId, broadcast: true })}>Объявить старт</button>
        <button onClick={() => runAction("checkFinished", { steamId, isClear: true, broadcast: true })}>Нарушений нет</button>
      </aside>
    </div>
  );
}

function ActionsView({ players, can, runAction }: { players: Player[]; can: (permission: Permission) => boolean; runAction: any }) {
  const [steamId, setSteamId] = useState(players[0]?.steam_id || "");
  return (
    <div className="actions-layout">
      <Panel icon={Zap} title="Быстрые действия" subtitle="Kick, mute, ban, DM">
        <QuickActions players={players} steamId={steamId} setSteamId={setSteamId} runAction={runAction} />
      </Panel>
      <Panel icon={Boxes} title="Выдача предметов" subtitle="inventory.giveto">
        <GiveForm players={players} runAction={runAction} disabled={!can("give_items")} />
      </Panel>
      <Panel icon={Command} title="Консоль сервера" subtitle="Прямое выполнение команд">
        <ConsoleForm disabled={!can("console")} runAction={runAction} />
      </Panel>
      <Panel icon={Settings} title="Расширенные queue-команды" subtitle="Health, delete entity, check started/finished, report announce">
        <AdvancedActions players={players} disabled={!can("manage_checks")} consoleDisabled={!can("console")} runAction={runAction} />
      </Panel>
    </div>
  );
}

function ContactsView({ state, runAction }: { state: PanelState; runAction: any }) {
  return (
    <Panel icon={Bell} title="Контакты игроков" subtitle="Сообщения из команды связи плагина">
      <div className="event-list">
        {state.contacts.length === 0 ? <div className="empty">Контактов пока нет</div> : state.contacts.map((contact) => (
          <article className="event-item" key={contact.id}>
            <strong>{nameBySteam(state.players, contact.steam_id)}</strong>
            <small>{contact.steam_id || "-"} · {formatDate(contact.createdAt)}</small>
            <p>{contact.message || "-"}</p>
            <div className="row-actions">
              <button onClick={() => runAction("chat", { targetSteamId: contact.steam_id, message: "Администрация получила ваше сообщение" })}>Ответить</button>
              <button onClick={() => runAction("notice", { steamId: contact.steam_id, value: true })}>Вызвать</button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function QueueView({ state, runAction }: { state: PanelState; runAction: any }) {
  const pending = state.tasks.filter((task) => task.status === "pending").length;
  const completed = state.tasks.filter((task) => task.status === "completed").length;
  const failed = state.tasks.filter((task) => task.status === "failed").length;
  return (
    <>
      <div className="metric-grid three">
        <Metric icon={Clock} color="orange" label="Pending" value={String(pending)} sub="Плагин еще не забрал" />
        <Metric icon={CheckCircle2} color="green" label="Completed" value={String(completed)} sub="Есть ответ worker" />
        <Metric icon={AlertTriangle} color="red" label="Failed" value={String(failed)} sub="Ошибки выполнения" />
      </div>
      <Panel icon={Database} title="Очередь команд" subtitle="GET/PUT /api/rust/queue">
        <button className="primary-button queue-health" onClick={() => runAction("health", {})}><Activity size={16} /> Health check</button>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Статус</th><th>Команда</th><th>Payload</th><th>Результат</th><th>Создано</th><th>Завершено</th></tr></thead>
            <tbody>
              {state.tasks.length === 0 ? <tr><td colSpan={6}>Очередь пуста</td></tr> : state.tasks.map((task) => (
                <tr key={task.id}>
                  <td><Status status={task.status === "completed" ? "active" : task.status} /></td>
                  <td>{task.label || task.request?.name}<small>{task.request?.name}</small></td>
                  <td><code>{compact(task.request?.data || {})}</code></td>
                  <td><code>{compact(task.result)}</code></td>
                  <td>{formatDate(task.createdAt)}</td>
                  <td>{formatDate(task.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function EventsView({ state, filter, setFilter }: { state: PanelState; filter: string; setFilter: (value: string) => void }) {
  const events = state.events.filter((event) => !filter || event.type === filter);
  return <Panel icon={Activity} title="История действий" subtitle="События bridge и результаты queue"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Все события</option><option value="auth">Авторизация</option><option value="task">Tasks</option><option value="task-result">Task results</option><option value="chat">Chat</option><option value="report">Reports</option></select><div className="event-list">{events.map((event) => <article className="event-item" key={event.id}><strong>{event.title}</strong><small>{event.type} · {formatDate(event.createdAt)}</small><code>{compact(event.details)}</code></article>)}</div></Panel>;
}

function UsersView({ data, updateUser }: { data: any; updateUser: any }) {
  return <Panel icon={UserCog} title="Пользователи и права" subtitle="Роли доступа к панели">{!data ? <div className="empty">Загрузка пользователей...</div> : <div className="users-list">{data.users.map((user: any) => <article className="user-card" key={user.id}><div><strong>{user.displayName}</strong><small>{user.username} · {user.active ? "активен" : "выключен"}</small></div><select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })}>{Object.entries(data.roles).map(([role, label]) => <option key={role} value={role}>{String(label)}</option>)}</select><label className="switch"><input type="checkbox" checked={user.active} onChange={(event) => updateUser(user.id, { active: event.target.checked })} /> Активен</label></article>)}</div>}</Panel>;
}

function SettingsView({ state, notify }: { state: PanelState; notify: (message: string) => void }) {
  const config = `"RustApp": {
  "[Admin panel] API URL": "${state.meta.publicBaseUrl}/api/rust",
  "[Admin panel] Queue URL": "${state.meta.publicBaseUrl}/api/rust/queue",
  "[Admin panel] Ban API URL": "${state.meta.publicBaseUrl}/api/rust/ban",
  "[Components • Custom actions] Allow console command execution": true,
  "[Components • Signages] Collect signages": true,
  "[Components • Kills] Collect kills": true,
  "[Components • Mutes] Support mutes system": true
}`;
  return <Panel icon={Settings} title="Настройки плагина" subtitle="Вставьте эти URL в oxide/config/RustApp.json"><pre>{config}</pre><div className="info-grid"><Info label="API" value={`${state.meta.publicBaseUrl}/api/rust`} /><Info label="Queue" value={`${state.meta.publicBaseUrl}/api/rust/queue`} /><Info label="Ban sync" value={`${state.meta.publicBaseUrl}/api/rust/ban`} /><Info label="Plugin" value={state.meta.pluginOnline ? "online" : "offline"} tone={state.meta.pluginOnline ? "good" : "bad"} /></div><button className="primary-button" onClick={() => navigator.clipboard.writeText(config).then(() => notify("Конфиг скопирован"))}>Скопировать</button></Panel>;
}

function StatisticsView({ state }: { state: PanelState }) {
  const active = state.players.filter((player) => player.status === "active");
  return (
    <section className="stats-page">
      <div className="stats-head">
        <h2>Статистика</h2>
        <p>Мониторинг ключевых показателей проекта</p>
      </div>
      <div className="metric-grid four compact-metrics">
        <Metric icon={Users} color="green" label="Игроки онлайн" value={String(active.length)} sub="Сейчас на сервере" />
        <Metric icon={Flag} color="orange" label="Репорты" value={String(state.reports.length)} sub="Всего принято" />
        <Metric icon={Ban} color="red" label="Блокировки" value={String(state.bans.length)} sub="Активные баны" />
        <Metric icon={Clock} color="blue" label="Очередь" value={String(state.tasks.filter((task) => task.status === "pending").length)} sub="Ожидают плагин" />
      </div>
      <div className="chart-grid large">
        <SparkChart title="Онлайн" data={state.metricsHistory} field="online" color="#22c55e" suffix="" />
        <SparkChart title="Очередь" data={state.metricsHistory} field="queued" color="#38bdf8" suffix="" />
        <SparkChart title="Средний ping" data={state.metricsHistory} field="avgPing" color="#f59e0b" suffix="ms" />
        <SparkChart title="Pending tasks" data={state.metricsHistory} field="pendingTasks" color="#ef4444" suffix="" />
      </div>
      <div className="chart-grid large">
        <SparkChart title="Репорты" data={state.metricsHistory} field="reports" color="#a78bfa" suffix="" />
        <SparkChart title="Киллы" data={state.metricsHistory} field="kills" color="#fb7185" suffix="" />
        <SparkChart title="Alerts" data={state.metricsHistory} field="alerts" color="#f97316" suffix="" />
        <SparkChart title="Подключаются" data={state.metricsHistory} field="joining" color="#14b8a6" suffix="" />
      </div>
    </section>
  );
}

function ServersView({ state }: { state: PanelState }) {
  const server = state.server || {};
  const online = Number(server.online ?? state.players.filter((player) => player.status === "active").length);
  return (
    <div className="servers-layout">
      <ServerHero server={server} players={online} fill={Math.min(100, Math.round((online / Math.max(1, Number(server.slots || online || 1))) * 100))} />
      <div className="info-grid">
        <Info label="Plugin" value={state.meta.pluginOnline ? "online" : "offline"} tone={state.meta.pluginOnline ? "good" : "bad"} />
        <Info label="Последний сигнал" value={state.meta.lastPluginSeenAt ? formatDate(state.meta.lastPluginSeenAt) : "-"} />
        <Info label="Protocol" value={String(server.protocol || "-")} />
        <Info label="Performance" value={server.performance ? `${Number(server.performance).toFixed(3)} ms` : "-"} />
        <Info label="Map" value={String(server.level || "-")} />
        <Info label="Port" value={String(server.port || "-")} />
      </div>
    </div>
  );
}

function AuditView({ state, filter, setFilter }: { state: PanelState; filter: string; setFilter: (value: string) => void }) {
  const events = state.events.filter((event) => !filter || event.type === filter);
  const types = Array.from(new Set(state.events.map((event) => event.type).filter(Boolean))).slice(0, 20);
  return (
    <section className="dense-main">
      <div className="dense-toolbar">
        <div><h2>Журнал аудита</h2><p>События панели, сотрудников и плагина</p></div>
        <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Все события</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select>
      </div>
      <div className="audit-list">
        {events.length === 0 ? <div className="empty">Событий нет</div> : events.map((event) => (
          <article className="audit-row" key={event.id}>
            <Activity size={18} />
            <span className="avatar">{initials(event.type || "ev")}</span>
            <div><strong>{event.title}</strong><small>{formatDate(event.createdAt)}</small></div>
            <code>{compact(event.details)}</code>
          </article>
        ))}
      </div>
    </section>
  );
}

function IntegrationsView({ state }: { state: PanelState }) {
  const [activeTab, setActiveTab] = useState("Discord");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const cards = [
    { title: "Репорты", subtitle: "Жалобы на игроков будут дублироваться в Discord", count: state.reports.length, endpoint: "reports" },
    { title: "Проверки", subtitle: "Оповещения о начале и завершении проверок", count: state.events.filter((event) => String(event.type).includes("check")).length, endpoint: "checks" },
    { title: "Блокировки", subtitle: "Оповещения о манипуляциях с банами", count: state.bans.length, endpoint: "ban" },
    { title: "Баны на других проектах", subtitle: "Дублировать оповещения о входах и киках игроков", count: state.alerts.length, endpoint: "alerts" },
    { title: "Подозрительные действия сотрудников", subtitle: "Оповещение о большом количестве блокировок за период", count: state.events.filter((event) => event.type === "task").length, endpoint: "custom-alert" }
  ];
  return (
    <section className="integration-page">
      <h2>Интеграции</h2>
      <p>Расширьте возможности панели с помощью внешних уведомлений</p>
      <div className="integration-tabs"><button className={activeTab === "Discord" ? "active" : ""} onClick={() => setActiveTab("Discord")}>Discord</button><button className={activeTab === "Rust Cheat Check" ? "active" : ""} onClick={() => setActiveTab("Rust Cheat Check")}>Rust Cheat Check</button></div>
      <h3>{activeTab === "Discord" ? "Вебхуки" : "Проверка внешних банов"}</h3>
      <div className="integration-list">
        {cards.map((card) => (
          <article className="integration-card" key={card.title}>
            <span className="panel-icon"><Plug size={18} /></span>
            <div><strong>{card.title}</strong><small>{card.subtitle}</small></div>
            <span className="count-badge">{card.count}</span>
            <ToggleRow label="" checked={Boolean(enabled[card.title])} onChange={(checked) => setEnabled((prev) => ({ ...prev, [card.title]: checked }))} />
            <button className="icon-button" title="Скопировать URL" onClick={() => navigator.clipboard.writeText(`${state.meta.publicBaseUrl}/api/rust/plugin/${card.endpoint}`)}><MoreVertical size={17} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProjectView({ state }: { state: PanelState }) {
  return <Panel icon={Building2} title="Общее" subtitle="Сводка проекта"><div className="info-grid"><Info label="Название" value={state.server?.name || state.server?.hostname || "Rust server"} /><Info label="Base URL" value={state.meta.publicBaseUrl} /><Info label="Игроков в state" value={String(state.players.length)} /><Info label="State updates" value={String(state.counters.stateUpdates || 0)} /></div></Panel>;
}

function BillingView() {
  return <Panel icon={CreditCard} title="Биллинг" subtitle="Локальная панель без внешнего тарифа"><div className="empty">Раздел оставлен для будущих тарифов, лимитов персонала и коммерческих интеграций.</div></Panel>;
}

function QuickActions({ players, steamId, setSteamId, runAction }: any) {
  const [action, setAction] = useState("chat");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("30m");
  const [broadcast, setBroadcast] = useState(false);
  const [banIp, setBanIp] = useState(false);
  const [globalBan, setGlobalBan] = useState(false);
  return <form className="form-grid" onSubmit={(event) => { event.preventDefault(); const payload: any = { steamId, reason, duration, message: reason, broadcast, banIp, global: globalBan }; runAction(action, payload); }}><label>Игрок<select value={steamId} onChange={(event) => setSteamId(event.target.value)}>{players.map((player: Player) => <option key={player.steam_id} value={player.steam_id}>{player.steam_name || player.steam_id}</option>)}</select></label><label>Действие<select value={action} onChange={(event) => setAction(event.target.value)}><option value="chat">Сообщение</option><option value="kick">Кик</option><option value="mute">Выдать мут</option><option value="ban">Заблокировать</option><option value="unmute">Снять мут</option><option value="unban">Разблокировать</option></select></label><label className="span-2">Текст / причина<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Причина или сообщение" /></label><label>Время<input value={duration} onChange={(event) => setDuration(event.target.value)} /></label><ToggleRow label="Оповестить чат" checked={broadcast} onChange={setBroadcast} /><ToggleRow label="Бан по IP" checked={banIp} onChange={setBanIp} /><ToggleRow label="Глобально" checked={globalBan} onChange={setGlobalBan} /><button className="primary-button">Выполнить</button></form>;
}

function GiveForm({ players, runAction, disabled }: any) {
  const [steamId, setSteamId] = useState(players[0]?.steam_id || "");
  const [shortname, setShortname] = useState("rifle.ak");
  const [amount, setAmount] = useState(1);
  return <form className="form-grid" onSubmit={(event) => { event.preventDefault(); runAction("give", { steamId, shortname, amount }); }}><label>Игрок<select disabled={disabled} value={steamId} onChange={(event) => setSteamId(event.target.value)}>{players.map((player: Player) => <option key={player.steam_id} value={player.steam_id}>{player.steam_name || player.steam_id}</option>)}</select></label><label>Shortname<input disabled={disabled} value={shortname} onChange={(event) => setShortname(event.target.value)} /></label><label>Количество<input disabled={disabled} type="number" min={1} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label><button disabled={disabled} className="primary-button">Выдать</button></form>;
}

function ConsoleForm({ disabled, runAction }: any) {
  const [commands, setCommands] = useState("");
  return <form className="console-form" onSubmit={(event) => { event.preventDefault(); runAction("command", { commands: commands.split("\n").filter(Boolean) }); setCommands(""); }}><textarea disabled={disabled} value={commands} onChange={(event) => setCommands(event.target.value)} placeholder="status&#10;say Message" /><button disabled={disabled} className="primary-button">Отправить команды</button></form>;
}

function AdvancedActions({ players, disabled, consoleDisabled, runAction }: { players: Player[]; disabled: boolean; consoleDisabled: boolean; runAction: any }) {
  const [steamId, setSteamId] = useState(players[0]?.steam_id || "");
  const [targets, setTargets] = useState("");
  const [reason, setReason] = useState("Проверка завершена");
  const [netId, setNetId] = useState("");
  return (
    <div className="advanced-actions">
      <div className="form-grid">
        <button type="button" disabled={consoleDisabled} className="primary-button" onClick={() => runAction("health", {})}><Activity size={16} /> Health check</button>
        <label>Net ID<input disabled={consoleDisabled} value={netId} onChange={(event) => setNetId(event.target.value)} placeholder="entity net_id" /></label>
        <button type="button" disabled={consoleDisabled || !netId.trim()} className="danger-button span-2" onClick={() => runAction("deleteEntity", { netId })}><Trash2 size={16} /> Удалить entity через плагин</button>
      </div>
      <div className="form-grid">
        <label>Игрок<select disabled={disabled} value={steamId} onChange={(event) => setSteamId(event.target.value)}>{players.map((player) => <option key={player.steam_id} value={player.steam_id}>{player.steam_name || player.steam_id}</option>)}</select></label>
        <label>Targets для announce<input disabled={disabled} value={targets} onChange={(event) => setTargets(event.target.value)} placeholder="SteamID через запятую" /></label>
        <label className="span-2">Причина<input disabled={disabled} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <button type="button" disabled={disabled} onClick={() => runAction("checkStarted", { steamId, broadcast: true })}>Check started</button>
        <button type="button" disabled={disabled} onClick={() => runAction("checkFinished", { steamId, isClear: true, broadcast: true })}>Check clear</button>
        <button type="button" disabled={disabled} onClick={() => runAction("banEvent", { steamId, reason, broadcast: true, targets: splitTargets(targets) })}>Ban announce</button>
        <button type="button" disabled={disabled} onClick={() => runAction("announceClean", { steamId, broadcast: true, targets: splitTargets(targets) })}>Clean announce</button>
      </div>
    </div>
  );
}

function Placeholder({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return <Panel icon={Icon} title={title} subtitle={text}><div className="empty">Раздел заложен в новый стек и готов к расширению под отдельную таблицу данных.</div></Panel>;
}

function Panel({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-head"><div className="panel-title"><span className="panel-icon"><Icon size={22} /></span><div><h2>{title}</h2><p>{subtitle}</p></div></div></div><div className="panel-body">{children}</div></section>;
}

function Metric({ icon: Icon, color, label, value, sub }: { icon: any; color: string; label: string; value: string; sub: string }) {
  return <article className={`metric ${color}`}><span className="metric-icon"><Icon size={22} /></span><small>{label}</small><strong>{value}</strong><p>{sub}</p></article>;
}

function SparkChart({ title, data, field, color, suffix }: { title: string; data: Array<Record<string, any>>; field: string; color: string; suffix: string }) {
  const points = data.slice(-60);
  const values = points.map((point) => Number(point[field] || 0));
  const max = Math.max(1, ...values);
  const last = values.at(-1) || 0;
  const path = values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 44 - (value / max) * 38;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  return (
    <article className="chart-card">
      <div>
        <small>{title}</small>
        <strong>{last}{suffix}</strong>
      </div>
      <svg viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label={title}>
        <path d="M 0 46 L 100 46" className="chart-baseline" />
        {values.length ? <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" /> : null}
      </svg>
    </article>
  );
}

function ServerHero({ server, players, fill }: { server: Record<string, any>; players: number; fill: number }) {
  return (
    <div className="server-hero">
      {server.level_image_url ? <img src={server.level_image_url} alt="Rust map preview" /> : <div className="map-placeholder"><MapPin size={42} /></div>}
      <div className="server-hero-body">
        <div>
          <h2>{server.name || server.hostname || "Rust server"}</h2>
          <p>{server.description || "Описание сервера не передано"}</p>
        </div>
        <div className="progress big"><i style={{ width: `${fill}%` }} /></div>
        <div className="info-grid">
          <Info label="Players" value={`${players}/${server.slots || 0}`} />
          <Info label="Queue reserved" value={String(server.reserved ?? 0)} />
          <Info label="Map" value={String(server.level || "-")} />
          <Info label="Port" value={String(server.port || "-")} />
          <Info label="Branch" value={String(server.branch || "public")} />
          <Info label="RustApp" value={String(server.version || "-")} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return <div className={`info-cell ${tone || ""}`}><small>{label}</small><strong>{value}</strong></div>;
}

function ServerCard({ server, players }: { server: Record<string, any>; players: number }) {
  return <article className="server-card"><div><strong>{server.name || server.hostname || "Rust server"}</strong><small>{server.level || "Map unknown"}</small></div><span className="online-dot">Онлайн</span><p>{players}/{server.slots || 0}</p><div className="progress"><i style={{ width: `${Math.min(100, (players / Math.max(1, Number(server.slots || 1))) * 100)}%` }} /></div><small>Plugin {server.version || "-"}</small></article>;
}

function Avatar({ player, profile, size = "" }: { player: Player; profile?: SteamProfile; size?: "large" | "tiny" | "" }) {
  const image = profile?.avatarFull || profile?.avatarMedium || profile?.avatar || String(player.meta?.fields?.avatar_url || player.meta?.tags?.avatar_url || "");
  const label = profile?.name || player.steam_name || player.steam_id;
  return (
    <span className={`avatar ${size}`}>
      {image ? <img src={image} alt={label} loading="lazy" /> : initials(label)}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <span className="mini-stat"><small>{label}</small><strong>{value}</strong></span>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle-row">{label ? <span>{label}</span> : <span />}<input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>;
}

function PlayerMini({ players, steamId, steamProfiles = {} }: { players: Player[]; steamId?: string; steamProfiles?: Record<string, SteamProfile> }) {
  const name = nameBySteam(players, steamId);
  const player = players.find((item) => item.steam_id === steamId);
  return <div className="player-cell">{player ? <Avatar player={player} profile={steamProfiles[player.steam_id]} /> : <span className="avatar">{initials(name)}</span>}<div><strong>{steamProfiles[String(steamId)]?.name || name}</strong><small>{steamId || "-"}</small></div></div>;
}

function PlayerDrawer({ player, state, runAction, onClose, steamProfiles }: { player: Player; state: PanelState; runAction: any; onClose: () => void; steamProfiles: Record<string, SteamProfile> }) {
  const [activeTab, setActiveTab] = useState("Обзор");
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = steamProfiles[player.steam_id];
  const reports = state.reports.filter((report) => report.initiator_steam_id === player.steam_id || report.target_steam_id === player.steam_id);
  const bans = state.bans.filter((ban) => ban.steamId === player.steam_id);
  const mutes = state.mutes.filter((mute) => mute.steamId === player.steam_id);
  const kills = state.kills.filter((kill) => kill.initiator_steam_id === player.steam_id || kill.target_steam_id === player.steam_id);
  const signs = state.signages.filter((sign) => sign.steam_id === player.steam_id);
  const events = state.events.filter((event) => compact(event.details).includes(player.steam_id)).slice(0, 20);
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="player-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="profile-side">
          <div className="profile-player">
            <Avatar player={player} profile={profile} size="large" />
            <strong>{profile?.name || player.steam_name || "unknown"}</strong>
            <small>{player.status === "active" ? `был сейчас` : player.status || "offline"}</small>
          </div>
          <div className="profile-tabs">
            {["Обзор", "Команда", "Репорты", "Статистика", "Лог активности", "Оповещения", "Рисунки", "Проверки", "Муты", "Блокировки", "Разрешения"].map((item) => <button key={item} className={activeTab === item ? "active" : ""} onClick={() => setActiveTab(item)}>{item}</button>)}
          </div>
        </div>
        <div className="profile-content">
          <div className="drawer-actions">
            <button title="Скопировать SteamID" onClick={() => navigator.clipboard.writeText(player.steam_id)}><Copy size={16} /></button>
            <button title="Профиль Steam" onClick={() => window.open(profile?.profileUrl || `https://steamcommunity.com/profiles/${player.steam_id}`, "_blank")}><ExternalLink size={16} /></button>
            <button title="Еще" onClick={() => setMenuOpen(!menuOpen)}><MoreVertical size={16} /></button>
            <button className="drawer-close" onClick={onClose}>Закрыть</button>
            {menuOpen ? <div className="action-menu">
              <button onClick={() => runAction("notice", { steamId: player.steam_id, value: true })}>Начать проверку</button>
              <button onClick={() => navigator.clipboard.writeText(player.steam_id)}>Скопировать SteamID</button>
              <button onClick={() => runAction("chat", { targetSteamId: player.steam_id, message: "Сообщение от администрации" })}>Сообщения</button>
              <button onClick={() => runAction("kick", { steamId: player.steam_id, reason: "Kicked by admin" })}>Кик</button>
              <button className="danger-text" onClick={() => runAction("mute", { steamId: player.steam_id, reason: "Выдано из профиля", duration: "30m" })}>Выдать мут</button>
              <button className="danger-text" onClick={() => runAction("ban", { steamId: player.steam_id, reason: "Выдано из профиля", duration: "permanent" })}>Заблокировать</button>
            </div> : null}
          </div>
          {activeTab === "Обзор" ? <>
            <div className="profile-section">
              <h3>Статистика <small>за 7 дней</small></h3>
              <div className="stat-strip"><MiniStat label="K/D" value="1.00" /><MiniStat label="Убийств" value={state.kills.filter((kill) => kill.initiator_steam_id === player.steam_id).length} /><MiniStat label="В голову" value={state.kills.filter((kill) => kill.initiator_steam_id === player.steam_id && kill.is_headshot).length} /><MiniStat label="Смертей" value={state.kills.filter((kill) => kill.target_steam_id === player.steam_id).length} /></div>
            </div>
            <div className="profile-section">
              <h3>Об игроке</h3>
              <div className="info-grid">
                <Info label="Игра на" value={state.server?.name || state.server?.hostname || "Rust server"} />
                <Info label="SteamID" value={player.steam_id} />
                <Info label="IP адрес" value={player.ip || "-"} />
                <Info label="Пинг" value={`${player.ping ?? 0}ms`} />
                <Info label="Страна, город" value={countryLabel(profile?.countryCode || player.language)} />
                <Info label="Провайдер" value={String(player.meta?.fields?.provider || player.meta?.tags?.provider || "-")} />
              </div>
            </div>
            <div className="profile-section">
              <h3>Информация из Steam</h3>
              <div className="info-grid">
                <Info label="Приватность" value={steamVisibility(profile)} />
                <Info label="Аккаунт создан" value={profile?.createdAt ? formatDate(profile.createdAt) : "Информация скрыта"} />
                <Info label="Последний выход" value={profile?.lastLogoffAt ? formatDate(profile.lastLogoffAt) : "Информация скрыта"} />
                <Info label="Gamebans / VAC" value={steamBanLabel(profile)} tone={profile?.bans?.vacBanned || Number(profile?.bans?.numberOfGameBans || 0) > 0 ? "bad" : "good"} />
              </div>
            </div>
            <PlayerProfileActions player={player} players={state.players} runAction={runAction} />
            <div className="profile-section">
              <h3>Связанные данные</h3>
              <div className="stat-strip"><MiniStat label="Репорты" value={reports.length} /><MiniStat label="Муты" value={mutes.length} /><MiniStat label="Блокировки" value={bans.length} /><MiniStat label="Команда" value={player.team?.length || 0} /></div>
            </div>
          </> : null}
          {activeTab === "Команда" ? <ProfileList title="Команда" rows={(player.team || []).map((steamId) => ({ title: nameBySteam(state.players, steamId), meta: steamId }))} empty="Команда не найдена" /> : null}
          {activeTab === "Репорты" ? <ProfileList title="Репорты" rows={reports.map((report) => ({ title: report.reason || "Репорт", meta: `${nameBySteam(state.players, report.initiator_steam_id)} -> ${nameBySteam(state.players, report.target_steam_id)}`, text: report.message }))} empty="Репортов нет" /> : null}
          {activeTab === "Статистика" ? <ProfileList title="Киллы / смерти" rows={kills.map((kill) => ({ title: `${nameBySteam(state.players, kill.initiator_steam_id)} -> ${nameBySteam(state.players, kill.target_steam_id)}`, meta: `${kill.weapon || "weapon"} · ${kill.distance || 0}m`, text: kill.is_headshot ? "headshot" : "body" }))} empty="Боевой истории нет" /> : null}
          {activeTab === "Лог активности" ? <ProfileList title="Лог активности" rows={events.map((event) => ({ title: event.title, meta: formatDate(event.createdAt), text: compact(event.details) }))} empty="Событий по игроку нет" /> : null}
          {activeTab === "Оповещения" ? <ProfileList title="Оповещения" rows={state.alerts.filter((alert) => compact(alert).includes(player.steam_id)).map((alert) => ({ title: alert.type || "alert", meta: formatDate(alert.createdAt), text: compact(alert.meta || alert) }))} empty="Оповещений нет" /> : null}
          {activeTab === "Рисунки" ? <ProfileList title="Рисунки" rows={signs.map((sign) => ({ title: sign.type || "signage", meta: `${sign.square || sign.position || "-"} · #${sign.net_id || "-"}` }))} empty="Рисунков нет" /> : null}
          {activeTab === "Проверки" ? <div className="profile-section"><h3>Проверки</h3><div className="profile-list"><button onClick={() => runAction("notice", { steamId: player.steam_id, value: true })}>Показать табличку проверки</button><button onClick={() => runAction("checkStarted", { steamId: player.steam_id, broadcast: true })}>Объявить старт</button><button onClick={() => runAction("checkFinished", { steamId: player.steam_id, isClear: true, broadcast: true })}>Завершить без нарушений</button></div></div> : null}
          {activeTab === "Муты" ? <ProfileList title="Муты" rows={mutes.map((mute) => ({ title: mute.reason, meta: `до ${formatDate(mute.expiresAt)}` }))} empty="Мутов нет" /> : null}
          {activeTab === "Блокировки" ? <ProfileList title="Блокировки" rows={bans.map((ban) => ({ title: ban.reason, meta: ban.expiredAt ? `до ${formatDate(ban.expiredAt)}` : "Навсегда" }))} empty="Блокировок нет" /> : null}
          {activeTab === "Разрешения" ? <div className="profile-section"><h3>Разрешения</h3><div className="info-grid"><Info label="Build" value={player.can_build ? "Да" : "Нет"} /><Info label="Raid block" value={player.is_raiding ? "Да" : "Нет"} /><Info label="No license" value={player.no_license ? "Да" : "Нет"} /><Info label="Alive" value={player.is_alive ? "Да" : "Нет"} /></div></div> : null}
        </div>
      </aside>
    </div>
  );
}

function BanModal({ ban, related, state, runAction, onClose }: { ban: Record<string, any>; related: Array<Record<string, any>>; state: PanelState; runAction: any; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="ban-modal" onClick={(event) => event.stopPropagation()}>
        <header><div><h3>Бан #{ban.id}</h3><p>игрок "{nameBySteam(state.players, ban.steamId)}"</p></div><span className="avatar large">{initials(nameBySteam(state.players, ban.steamId))}</span></header>
        <div className="notice-line">Панель заблокировала {formatDate(ban.createdAt)}</div>
        <div className="info-grid">
          <Info label="Причина" value={ban.reason || "-"} />
          <Info label="Дата блокировки" value={formatDate(ban.createdAt)} />
          <Info label="Срок блокировки" value={ban.expiredAt ? formatDate(ban.expiredAt) : "Навсегда"} />
          <Info label="Сервер" value="На всех" />
        </div>
        <h3>Связанные блокировки</h3>
        <div className="related-list">{related.map((item) => <article key={item.id}><PlayerMini players={state.players} steamId={item.steamId} /><ExternalLink size={15} /></article>)}</div>
        <footer><button onClick={() => runAction("unban", { steamId: ban.steamId })}>Разблокировать</button><button onClick={onClose}>Закрыть</button></footer>
      </section>
    </div>
  );
}

function ProfileList({ title, rows, empty }: { title: string; rows: Array<{ title: string; meta?: string; text?: string }>; empty: string }) {
  return (
    <div className="profile-section">
      <h3>{title}</h3>
      <div className="profile-list">
        {rows.length === 0 ? <div className="empty">{empty}</div> : rows.map((row, index) => (
          <article key={`${row.title}-${index}`}>
            <strong>{row.title}</strong>
            {row.meta ? <small>{row.meta}</small> : null}
            {row.text ? <p>{row.text}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function Status({ status }: { status?: string }) {
  return <span className={`status ${status === "active" ? "good" : "warn"}`}>{status === "active" ? "Онлайн" : status || "unknown"}</span>;
}

function PingBadge({ ping }: { ping?: number }) {
  const value = Number(ping || 0);
  const tone = value <= 80 ? "good" : value <= 150 ? "warn" : "bad";
  return <span className={`ping-badge ${tone}`}>{value}ms</span>;
}

function Flags({ player }: { player: Player }) {
  const flags = [];
  if (player.can_build) flags.push("build");
  if (player.is_raiding) flags.push("raid");
  if (player.no_license) flags.push("license");
  if (!player.is_alive && player.status === "active") flags.push("dead");
  return flags.length ? <>{flags.map((flag) => <span className="flag" key={flag}>{flag}</span>)}</> : <span className="muted">-</span>;
}

function metaBadges(player: Player) {
  const tags = Object.entries(player.meta?.tags || {});
  const fields = Object.entries(player.meta?.fields || {});
  const items = [...tags, ...fields].slice(0, 4);
  return items.length ? <>{items.map(([key, value]) => <span className="flag meta" key={`${player.steam_id}-${key}`}>{key}: {value}</span>)}</> : <span className="muted">-</span>;
}

function initials(value: string) {
  return value.trim().slice(0, 2).toUpperCase();
}

function nameBySteam(players: Player[], steamId?: string) {
  return players.find((player) => player.steam_id === steamId)?.steam_name || steamId || "server";
}

function formatDate(value?: number) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function chatTime(value?: number) {
  if (!value) return "--:--";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function avgPingFor(players: Player[]) {
  const withPing = players.filter((player) => Number(player.ping || 0) > 0);
  if (!withPing.length) return 0;
  return Math.round(withPing.reduce((sum, player) => sum + Number(player.ping || 0), 0) / withPing.length);
}

function formatDuration(value: number) {
  if (!value || value < 1000) return "0s";
  const total = Math.floor(value / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${total % 60}s`;
}

function chatPlaceholder(mode: "global" | "direct" | "team") {
  if (mode === "team") return "Сообщение команде выбранного игрока";
  if (mode === "direct") return "Личное сообщение игроку";
  return "Сообщение всем игрокам";
}

function hasBadWord(value: string) {
  const text = value.toLowerCase();
  return ["чит", "cheat", "soft", "софт", "оск", "еб", "сука", "бля"].some((word) => text.includes(word));
}

function countryLabel(value?: string) {
  if (!value) return "-";
  const code = value.trim().toUpperCase();
  if (code.length !== 2) return code;
  try {
    return new Intl.DisplayNames(["ru"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function steamVisibility(profile?: SteamProfile) {
  if (!profile) return "Нужен STEAM_WEB_API_KEY";
  if (profile.visibility === 3) return "Открыт";
  if (profile.visibility === 2) return "Только друзья";
  if (profile.visibility === 1) return "Закрыт";
  return "Информация скрыта";
}

function steamBanLabel(profile?: SteamProfile) {
  if (!profile?.bans) return "Информация скрыта";
  const vac = Number(profile.bans.numberOfVacBans || 0);
  const game = Number(profile.bans.numberOfGameBans || 0);
  if (!vac && !game && !profile.bans.vacBanned) return "Банов нет";
  return `VAC: ${vac}, Game: ${game}`;
}

function groupTabs(items: typeof tabs) {
  return items.reduce<Record<string, typeof tabs>>((acc, item) => {
    const group = item.group || "Разделы";
    acc[group] ??= [];
    acc[group].push(item);
    return acc;
  }, {});
}

function splitTargets(value: string) {
  return value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
}

function compact(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}
