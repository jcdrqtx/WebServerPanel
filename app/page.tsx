"use client";

import {
  Activity,
  Ban,
  Bed,
  Bell,
  Boxes,
  CheckCircle2,
  Clock,
  Command,
  Database,
  Eye,
  Gamepad2,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  MessageCircle,
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

type TabId = "home" | "players" | "sleepers" | "chat" | "reports" | "kills" | "alerts" | "art" | "bans" | "checks" | "actions" | "contacts" | "queue" | "events" | "users" | "settings";

const tabs: Array<{ id: TabId; label: string; icon: any; group?: string; permission?: Permission }> = [
  { id: "home", label: "Главная", icon: Home },
  { id: "players", label: "Игроки", icon: Users, group: "MODERATION" },
  { id: "sleepers", label: "Спальники", icon: Bed, group: "MODERATION" },
  { id: "chat", label: "Чат", icon: MessageCircle, group: "MODERATION" },
  { id: "reports", label: "Репорты", icon: Flag, group: "MODERATION" },
  { id: "kills", label: "Киллы", icon: Skull, group: "MODERATION" },
  { id: "alerts", label: "Alerts", icon: AlertTriangle, group: "MODERATION" },
  { id: "art", label: "Рисунки", icon: ImageIcon, group: "MODERATION" },
  { id: "bans", label: "Баны", icon: Ban, group: "MODERATION" },
  { id: "checks", label: "Проверки", icon: Search, group: "MODERATION" },
  { id: "actions", label: "Команды", icon: Zap, group: "MODERATION" },
  { id: "contacts", label: "Контакты", icon: Bell, group: "CONTROL" },
  { id: "queue", label: "Очередь", icon: Database, group: "CONTROL" },
  { id: "events", label: "История", icon: Activity, group: "CONTROL" },
  { id: "users", label: "Пользователи", icon: UserCog, group: "CONTROL", permission: "manage_users" },
  { id: "settings", label: "Интеграция", icon: Settings, group: "PROJECT" }
];

const pageMeta: Record<TabId, { title: string; subtitle: string; icon: any }> = {
  home: { title: "Главная", subtitle: "Обзор системы и подключенных серверов", icon: Home },
  players: { title: "Игроки", subtitle: "Управление игроками и их статистикой", icon: Users },
  sleepers: { title: "Спальники", subtitle: "Список размещенных спальников и будущие события", icon: Bed },
  chat: { title: "Чат", subtitle: "Мониторинг и управление чатом сервера", icon: MessageCircle },
  reports: { title: "Репорты", subtitle: "Жалобы игроков и F7 reports", icon: Flag },
  kills: { title: "Киллы", subtitle: "Убийства и combat log из плагина", icon: Skull },
  alerts: { title: "Alerts", subtitle: "Автоматические уведомления и подозрительные события", icon: AlertTriangle },
  art: { title: "Рисунки игроков", subtitle: "Signage, painted items и firework designs", icon: ImageIcon },
  bans: { title: "Баны", subtitle: "Управление банами и мутами игроков", icon: Ban },
  checks: { title: "Проверки", subtitle: "Вызовы игроков на проверку", icon: Search },
  actions: { title: "Команды", subtitle: "Быстрые действия и консоль сервера", icon: Command },
  contacts: { title: "Контакты", subtitle: "Сообщения игроков через команду связи", icon: Bell },
  queue: { title: "Очередь", subtitle: "Команды, отправленные RustApp worker", icon: Database },
  events: { title: "История", subtitle: "Лог действий панели и плагина", icon: Activity },
  users: { title: "Пользователи", subtitle: "Авторизация, роли и уровни доступа", icon: UserCog },
  settings: { title: "Интеграция", subtitle: "Связь RUST .NET с плагином RustApp", icon: Settings }
};

export default function Page() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState("");
  const [state, setState] = useState<PanelState | null>(null);
  const [tab, setTab] = useState<TabId>("home");
  const [toast, setToast] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [usersData, setUsersData] = useState<any>(null);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);

  // Проверка сессии только один раз при монтировании
  useEffect(() => {
    const saved = localStorage.getItem("rustNetSession");
    if (saved) {
      setToken(saved);
      // Валидируем сессию перед загрузкой состояния
      fetch("/api/state", {
        headers: { Authorization: `Bearer ${saved}` }
      }).then(async (res) => {
        if (!res.ok) {
          // Сессия невалидна, очищаем
          console.log("Session invalid on load, clearing token");
          localStorage.removeItem("rustNetSession");
          setToken("");
          setIsSessionValid(false);
        } else {
          setIsSessionValid(true);
          fetchState(saved);
        }
      }).catch((err) => {
        console.error("Session validation error:", err);
        // При ошибке сети не сбрасываем сессию - это может быть временная проблема
        setIsSessionValid(true);
        fetchState(saved);
      });
    } else {
      setIsSessionValid(false);
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
        source = new EventSource(`/api/stream?session=${encodeURIComponent(token)}`);
        
        source.addEventListener("snapshot", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            setState(data);
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

  async function api(path: string, init: RequestInit = {}, session = token) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session}`,
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
            headers: { Authorization: `Bearer ${session}` }
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
    localStorage.removeItem("rustNetSession");
    setToken("");
    setState(null);
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

  if (!token || !state?.auth?.user || isSessionValid === false) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} submitAuth={submitAuth} toast={toast} />;
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
          {tabs.map((item, index) => {
            if (item.permission && !can(item.permission)) return null;
            const Icon = item.icon;
            const previous = tabs[index - 1];
            const showGroup = item.group && item.group !== previous?.group;
            return (
              <div key={item.id}>
                {showGroup ? <p>{item.group}</p> : null}
                <button className={`nav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
                  <Icon size={16} /> {item.label}
                </button>
              </div>
            );
          })}
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
              <Radio size={15} /> plugin {state.meta.pluginOnline ? "online" : "offline"}
            </span>
            <button className="icon-button" onClick={() => fetchState()} title="Обновить"><RefreshCcw size={18} /></button>
          </div>
        </header>

        {tab === "home" ? <HomeView state={state} onlinePlayers={onlinePlayers} queuePlayers={queuePlayers} avgPing={avgPing} /> : null}
        {tab === "players" ? <PlayersView players={filteredPlayers} allPlayers={state.players} search={playerSearch} setSearch={setPlayerSearch} status={statusFilter} setStatus={setStatusFilter} runAction={runAction} /> : null}
        {tab === "sleepers" ? <SleepersView state={state} /> : null}
        {tab === "chat" ? <ChatView state={state} canSend={can("send_chat")} runAction={runAction} /> : null}
        {tab === "reports" ? <ReportsView state={state} /> : null}
        {tab === "kills" ? <KillsView state={state} /> : null}
        {tab === "alerts" ? <AlertsView state={state} /> : null}
        {tab === "art" ? <ArtView state={state} /> : null}
        {tab === "bans" ? <BansView state={state} runAction={runAction} /> : null}
        {tab === "checks" ? <ChecksView players={state.players} runAction={runAction} /> : null}
        {tab === "actions" ? <ActionsView players={state.players} can={can} runAction={runAction} /> : null}
        {tab === "contacts" ? <ContactsView state={state} runAction={runAction} /> : null}
        {tab === "queue" ? <QueueView state={state} runAction={runAction} /> : null}
        {tab === "events" ? <EventsView state={state} filter={eventFilter} setFilter={setEventFilter} /> : null}
        {tab === "users" ? <UsersView data={usersData} updateUser={updateUser} /> : null}
        {tab === "settings" ? <SettingsView state={state} notify={notify} /> : null}
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

      <form className="auth-card" onSubmit={submitAuth}>
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

function HomeView({ state, onlinePlayers, queuePlayers, avgPing }: { state: PanelState; onlinePlayers: Player[]; queuePlayers: Player[]; avgPing: number }) {
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
        <Metric icon={Server} color="blue" label="Задачи" value={String(state.tasks.filter((task) => task.status === "pending").length)} sub="В очереди" />
        <Metric icon={Radio} color="green" label="Подключаются" value={String(queuePlayers.length)} sub="Queue / joining" />
        <Metric icon={Ban} color="red" label="Ограничения" value={String(activePunish)} sub={`${avgPing}ms avg ping`} />
      </div>
      <div className="metric-grid four">
        <Metric icon={Skull} color="red" label="Киллы" value={String(state.kills.length)} sub="Combat stream" />
        <Metric icon={AlertTriangle} color="orange" label="Alerts" value={String(state.alerts.length)} sub="Подозрительные события" />
        <Metric icon={Bed} color="purple" label="Спальники" value={String(state.sleepingBags.length)} sub="Sleeping bags" />
        <Metric icon={ImageIcon} color="blue" label="Рисунки" value={String(state.signages.length)} sub="Signage gallery" />
      </div>
      <div className="dashboard-grid">
        <Panel icon={Server} title="Сервер" subtitle="Информация из PluginStateUpdatePayload">
          <ServerHero server={server} players={Number(server.online ?? onlinePlayers.length)} fill={fill} />
        </Panel>
        <Panel icon={Activity} title="Состояние bridge" subtitle="Пульс плагина и API worker">
          <div className="info-grid">
            <Info label="Plugin" value={state.meta.pluginOnline ? "online" : "offline"} tone={state.meta.pluginOnline ? "good" : "bad"} />
            <Info label="Последний сигнал" value={state.meta.lastPluginSeenAt ? formatDate(state.meta.lastPluginSeenAt) : "-"} />
            <Info label="State updates" value={String(state.counters.stateUpdates || 0)} />
            <Info label="Tasks done" value={`${state.counters.tasksCompleted || 0}/${state.counters.tasksCreated || 0}`} />
            <Info label="Protocol" value={String(server.protocol || "-")} />
            <Info label="Performance" value={server.performance ? `${Number(server.performance).toFixed(3)} ms` : "-"} />
          </div>
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel icon={Users} title="Видимость игроков" subtitle="Онлайн, очередь, команды и флаги">
          <div className="roster-strip">
            {state.players.length === 0 ? <div className="empty">Плагин пока не прислал игроков</div> : state.players.slice(0, 8).map((player) => (
              <article className="mini-player" key={player.steam_id}>
                <span className="avatar">{initials(player.steam_name || player.steam_id)}</span>
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
          <SparkChart title="Pending tasks" data={state.metricsHistory} field="pendingTasks" color="#3b82f6" suffix="" />
        </div>
      </Panel>
    </>
  );
}

function PlayersView({ players, allPlayers, search, setSearch, status, setStatus, runAction }: any) {
  const active = allPlayers.filter((p: Player) => p.status === "active");
  const raiding = active.filter((p: Player) => p.is_raiding);
  const noLicense = allPlayers.filter((p: Player) => p.no_license);
  return (
    <>
      <div className="metric-grid three">
        <Metric icon={Users} color="purple" label="Всего игроков" value={String(allPlayers.length)} sub="В текущем state" />
        <Metric icon={CheckCircle2} color="green" label="Онлайн" value={String(active.length)} sub="Сейчас в игре" />
        <Metric icon={Eye} color="gray" label="Очередь" value={String(allPlayers.filter((p: Player) => p.status !== "active").length)} sub="Не в игре" />
      </div>
      <div className="metric-grid two">
        <Metric icon={AlertTriangle} color="orange" label="Raid block" value={String(raiding.length)} sub="Флаг is_raiding от плагина" />
        <Metric icon={KeyRound} color="red" label="No license" value={String(noLicense.length)} sub="Проверка Steam license" />
      </div>
      <Panel icon={Search} title="Поиск и фильтры" subtitle="Настройка отображения игроков">
        <div className="filters">
          <label>Поиск<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по имени, SteamID, IP" /></label>
          <label>Статус<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Все</option><option value="active">Онлайн</option><option value="joining">Подключается</option><option value="queued">Очередь</option></select></label>
        </div>
      </Panel>
      <Panel icon={Gamepad2} title="Карточки игроков" subtitle="Полная видимость состояния из плагина">
        <div className="player-grid">
          {players.length === 0 ? <div className="empty">Нет игроков по текущему фильтру</div> : players.map((player: Player) => (
            <article className="player-card" key={`card-${player.steam_id}`}>
              <div className="player-card-head">
                <span className="avatar">{initials(player.steam_name || player.steam_id)}</span>
                <div>
                  <strong>{player.steam_name || "unknown"}</strong>
                  <small>{player.steam_id}</small>
                </div>
                <Status status={player.status} />
              </div>
              <div className="info-grid dense">
                <Info label="IP" value={player.ip || "-"} />
                <Info label="Ping" value={`${player.ping ?? 0}ms`} />
                <Info label="Online" value={formatDuration((player.seconds_connected || 0) * 1000)} />
                <Info label="Coords" value={player.coords || player.position || "-"} />
                <Info label="Team" value={String(player.team?.length || 0)} />
                <Info label="Lang" value={player.language || "-"} />
              </div>
              <div className="flag-row"><Flags player={player} />{metaBadges(player)}</div>
              <div className="row-actions">
                <button onClick={() => runAction("chat", { targetSteamId: player.steam_id, message: "Сообщение от администрации" })}>DM</button>
                <button onClick={() => runAction("notice", { steamId: player.steam_id, value: true })}>Check</button>
                <button onClick={() => runAction("kick", { steamId: player.steam_id, reason: "Kicked by admin" })}>Kick</button>
              </div>
            </article>
          ))}
        </div>
      </Panel>
      <Panel icon={ListChecks} title="Список игроков" subtitle={`Показано: ${players.length}`}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Игрок</th><th>SteamID</th><th>Статус</th><th>IP адрес</th><th>Позиция</th><th>Команда</th><th>Meta</th><th>Флаги</th><th>Действия</th></tr></thead>
            <tbody>
              {players.map((player: Player) => (
                <tr key={player.steam_id}>
                  <td><div className="player-cell"><span className="avatar">{initials(player.steam_name || player.steam_id)}</span><div><strong>{player.steam_name || "unknown"}</strong><small>{player.language || "client"}</small></div></div></td>
                  <td>{player.steam_id}</td>
                  <td><Status status={player.status} /></td>
                  <td>{player.ip || "-"}<small>{player.ping || 0}ms · {formatDuration((player.seconds_connected || 0) * 1000)}</small></td>
                  <td>{player.coords || "-"}<small>{player.position || "-"}</small></td>
                  <td>{player.team?.length ? player.team.join(", ") : "-"}</td>
                  <td>{metaBadges(player)}</td>
                  <td><Flags player={player} /></td>
                  <td><div className="row-actions"><button onClick={() => runAction("chat", { targetSteamId: player.steam_id, message: "Сообщение от администрации" })}>DM</button><button onClick={() => runAction("kick", { steamId: player.steam_id, reason: "Kicked by admin" })}>Kick</button><button onClick={() => runAction("give", { steamId: player.steam_id, shortname: "rifle.ak", amount: 1 })}>Give</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function ChatView({ state, canSend, runAction }: { state: PanelState; canSend: boolean; runAction: any }) {
  const [message, setMessage] = useState("");
  const [targetSteamId, setTargetSteamId] = useState("");
  const [query, setQuery] = useState("");
  const messages = state.chats.filter((chat) => {
    const text = [chat.text, chat.steam_id, chat.target_steam_id, nameBySteam(state.players, chat.steam_id), nameBySteam(state.players, chat.target_steam_id)].filter(Boolean).join(" ").toLowerCase();
    return !query || text.includes(query.toLowerCase());
  });
  return (
    <div className="split-layout">
      <Panel icon={MessageCircle} title="Чат" subtitle="Сообщения игроков в реальном времени">
        <div className="filters">
          <label>Поиск<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Игрок, SteamID или текст" /></label>
          <label>Получатель<select disabled={!canSend} value={targetSteamId} onChange={(event) => setTargetSteamId(event.target.value)}><option value="">Все игроки</option>{state.players.filter((player) => player.status === "active").map((player) => <option key={player.steam_id} value={player.steam_id}>{player.steam_name || player.steam_id}</option>)}</select></label>
        </div>
        <div className="chat-list">
          {messages.length === 0 ? <div className="empty">Сообщений пока нет</div> : messages.map((chat) => {
            const mode = chat.target_steam_id ? "DM" : chat.is_team ? "TEAM" : chat.meta?.direction === "outgoing" ? "PANEL" : "GLOBAL";
            const author = chat.meta?.direction === "outgoing" ? String(chat.meta?.initiator_name || "panel") : nameBySteam(state.players, chat.steam_id);
            const target = chat.target_steam_id ? ` → ${nameBySteam(state.players, chat.target_steam_id)}` : "";
            return <article className={`chat-line ${chat.meta?.direction === "outgoing" ? "outgoing" : ""}`} key={chat.id}><div><span>[{mode}]</span> <b>{author}{target}</b></div><time>{formatDate(chat.createdAt)}</time><p>{chat.text}</p></article>;
          })}
        </div>
        <form className="inline-form" onSubmit={(event) => { event.preventDefault(); if (message.trim()) runAction("chat", { message, targetSteamId: targetSteamId || undefined }); setMessage(""); }}>
          <input disabled={!canSend} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={canSend ? (targetSteamId ? "Личное сообщение игроку" : "Сообщение всем игрокам") : "Нет прав на отправку"} />
          <button disabled={!canSend} className="primary-button"><Send size={16} /> Отправить</button>
        </form>
      </Panel>
      <Panel icon={Bell} title="Сводка чата" subtitle="Что пришло из ChatWorker">
        <div className="info-grid">
          <Info label="Всего" value={String(state.chats.length)} />
          <Info label="Командный чат" value={String(state.chats.filter((chat) => chat.is_team).length)} />
          <Info label="Личные" value={String(state.chats.filter((chat) => chat.target_steam_id).length)} />
          <Info label="С панели" value={String(state.chats.filter((chat) => chat.meta?.direction === "outgoing").length)} />
        </div>
        <div className="keyword-list"><span>чит</span><span>софт</span><span>оскорбления</span></div>
      </Panel>
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

function ArtView({ state }: { state: PanelState }) {
  return (
    <Panel icon={ImageIcon} title="Рисунки игроков" subtitle="Signage, painted items и fireworks">
      <div className="art-grid">
        {state.signages.length === 0 ? <div className="empty">Рисунков пока нет</div> : state.signages.map((item) => (
          <article className="art-card" key={item.id}>
            {item.image ? <img alt="player signage" src={`data:image/png;base64,${item.image}`} /> : <div className="art-placeholder"><ImageIcon size={34} /></div>}
            <strong>{nameBySteam(state.players, item.steam_id)}</strong>
            <small>{item.type || "signage"} · {item.square || item.position || "-"} · #{String(item.net_id || "-")}</small>
            <small>{formatDate(item.createdAt)}</small>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function BansView({ state, runAction }: { state: PanelState; runAction: any }) {
  const entries: Array<Record<string, any>> = [
    ...state.bans.map((ban) => ({ ...ban, key: `ban-${ban.id}`, type: "Бан", steamId: ban.steamId })),
    ...state.mutes.map((mute) => ({ ...mute, key: `mute-${mute.id}`, type: "Мут", steamId: mute.steamId, expiredAt: mute.expiresAt }))
  ];
  return (
    <>
      <div className="metric-grid two">
        <Metric icon={Ban} color="red" label="Активные баны" value={String(state.bans.length)} sub="Сейчас действуют" />
        <Metric icon={MessageCircle} color="orange" label="Активные муты" value={String(state.mutes.length)} sub="Сейчас действуют" />
      </div>
      <Panel icon={Ban} title="Активные ограничения" subtitle="Баны и муты bridge">
        <div className="event-list">
          {entries.length === 0 ? <div className="empty">Ограничений нет</div> : entries.map((entry) => <article className="event-item" key={entry.key}><strong>{entry.type}: {nameBySteam(state.players, entry.steamId)}</strong><small>{entry.reason} · до {entry.expiredAt ? formatDate(entry.expiredAt) : "навсегда"}</small><button onClick={() => runAction(entry.type === "Бан" ? "unban" : "unmute", { steamId: entry.steamId })}>Снять</button></article>)}
        </div>
      </Panel>
    </>
  );
}

function ChecksView({ players, runAction }: { players: Player[]; runAction: any }) {
  const [steamId, setSteamId] = useState(players[0]?.steam_id || "");
  return <Panel icon={Search} title="Проверки" subtitle="Вызов игрока на проверку через notice"><div className="form-grid"><label>Игрок<select value={steamId} onChange={(event) => setSteamId(event.target.value)}>{players.map((player) => <option key={player.steam_id} value={player.steam_id}>{player.steam_name || player.steam_id}</option>)}</select></label><button onClick={() => runAction("noticeGet", { steamId })}>Запросить статус</button><button className="primary-button" onClick={() => runAction("notice", { steamId, value: true })}>Показать проверку</button><button onClick={() => runAction("notice", { steamId, value: false })}>Скрыть проверку</button><button onClick={() => runAction("checkStarted", { steamId, broadcast: true })}>Объявить старт</button><button onClick={() => runAction("checkFinished", { steamId, isClear: true, broadcast: true })}>Объявить clean</button></div></Panel>;
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

function QuickActions({ players, steamId, setSteamId, runAction }: any) {
  const [action, setAction] = useState("chat");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("30m");
  return <form className="form-grid" onSubmit={(event) => { event.preventDefault(); const payload: any = { steamId, reason, duration, message: reason }; runAction(action, payload); }}><label>Игрок<select value={steamId} onChange={(event) => setSteamId(event.target.value)}>{players.map((player: Player) => <option key={player.steam_id} value={player.steam_id}>{player.steam_name || player.steam_id}</option>)}</select></label><label>Действие<select value={action} onChange={(event) => setAction(event.target.value)}><option value="chat">Сообщение</option><option value="kick">Kick</option><option value="mute">Mute</option><option value="ban">Ban</option><option value="unmute">Unmute</option><option value="unban">Unban</option></select></label><label className="span-2">Текст / причина<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Причина или сообщение" /></label><label>Время<input value={duration} onChange={(event) => setDuration(event.target.value)} /></label><button className="primary-button">Выполнить</button></form>;
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

function Status({ status }: { status?: string }) {
  return <span className={`status ${status === "active" ? "good" : "warn"}`}>{status === "active" ? "Онлайн" : status || "unknown"}</span>;
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

function formatDuration(value: number) {
  if (!value || value < 1000) return "0s";
  const total = Math.floor(value / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${total % 60}s`;
}

function splitTargets(value: string) {
  return value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
}

function compact(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}
