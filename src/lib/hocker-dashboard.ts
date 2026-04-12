import { createServerSupabase } from "@/lib/supabase-server";

export type AppStatus = "live" | "ready" | "pending";

export type AppRegistryItem = {
  key: string;
  title: string;
  subtitle: string;
  integration: string;
  projectId: string;
  status: AppStatus;
};

export type AgiRegistryItem = {
  key: string;
  title: string;
  subtitle: string;
  nodeId: string;
  integration: string;
  status: AppStatus;
};

export type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
};

export type DashboardEventItem = {
  id: string;
  title: string;
  detail: string;
  level: "info" | "warn" | "error";
  at: string;
};

export type DashboardCommandItem = {
  id: string;
  command: string;
  projectId: string;
  status: string;
  createdAt: string;
};

export type DashboardSummary = {
  metrics: DashboardMetric[];
  apps: AppRegistryItem[];
  agis: AgiRegistryItem[];
  recentEvents: DashboardEventItem[];
  recentCommands: DashboardCommandItem[];
};

type RawProject = {
  id: string;
  name: string | null;
  created_at: string;
};

type RawNode = {
  id: string;
  project_id: string;
  name: string | null;
  status: string | null;
  type: string | null;
  last_seen_at: string | null;
};

type RawEvent = {
  id: string;
  project_id: string;
  level: string | null;
  type: string;
  message: string;
  created_at: string;
};

type RawCommand = {
  id: string;
  project_id: string;
  command: string;
  status: string;
  created_at: string;
};

type RawOrder = {
  id: string;
  project_id: string;
  status: string;
  total_cents: number;
  created_at: string;
};

const APP_REGISTRY: AppRegistryItem[] = [
  {
    key: "hocker-one",
    title: "Hocker ONE",
    subtitle: "Centro de mando y control.",
    integration: "NOVA + Syntia + Vertx",
    projectId: "hocker-one",
    status: "ready",
  },
  {
    key: "hocker-ads",
    title: "Hocker Ads",
    subtitle: "Publicidad, branding y contenido.",
    integration: "Nova Ads + Candy Ads + PRO IA",
    projectId: "hocker-ads",
    status: "ready",
  },
  {
    key: "chido-casino",
    title: "Chido Casino",
    subtitle: "Núcleo de gaming y apuesta inteligente.",
    integration: "Curvewind + Chido Wins + Chido Gerente",
    projectId: "chido-casino",
    status: "pending",
  },
  {
    key: "hocker-drive-cloud",
    title: "Hocker Drive Cloud",
    subtitle: "Memoria segura y sincronizada.",
    integration: "Vertx + Syntia",
    projectId: "hocker-drive-cloud",
    status: "ready",
  },
  {
    key: "hocker-hub",
    title: "Hocker Hub",
    subtitle: "CRM y operaciones.",
    integration: "Nova Ads + Numia",
    projectId: "hocker-hub",
    status: "ready",
  },
  {
    key: "hocker-up",
    title: "Hocker Up",
    subtitle: "Aprendizaje, red y crecimiento.",
    integration: "Candy Ads + Syntia",
    projectId: "hocker-up",
    status: "ready",
  },
  {
    key: "nexpa",
    title: "NEXPA",
    subtitle: "Monitoreo y control ético.",
    integration: "NEXPA + Trackhok",
    projectId: "nexpa",
    status: "pending",
  },
  {
    key: "trackhok",
    title: "Trackhok",
    subtitle: "Rastreo y predicción.",
    integration: "Trackhok + Vertx",
    projectId: "trackhok",
    status: "pending",
  },
  {
    key: "hocker-wallet",
    title: "Hocker Wallet",
    subtitle: "Pagos, retiros y control financiero.",
    integration: "Numia + Jurix",
    projectId: "hocker-wallet",
    status: "ready",
  },
  {
    key: "hocker-supply",
    title: "Hocker Supply",
    subtitle: "Catálogo y fabricación bajo demanda.",
    integration: "Hostia + Numia + Jurix",
    projectId: "hocker-supply",
    status: "pending",
  },
];

const AGI_REGISTRY: AgiRegistryItem[] = [
  {
    key: "nova",
    title: "NOVA",
    subtitle: "Conciencia central del ecosistema.",
    nodeId: "nova",
    integration: "Gobernanza total",
    status: "ready",
  },
  {
    key: "syntia",
    title: "Syntia",
    subtitle: "Memoria y sincronización.",
    nodeId: "syntia",
    integration: "Modo espejo",
    status: "ready",
  },
  {
    key: "vertx",
    title: "Vertx",
    subtitle: "Seguridad y blockchain.",
    nodeId: "vertx",
    integration: "Shield node",
    status: "ready",
  },
  {
    key: "numia",
    title: "Numia",
    subtitle: "Finanzas y ROI.",
    nodeId: "numia",
    integration: "Finance core",
    status: "ready",
  },
  {
    key: "jurix",
    title: "Jurix",
    subtitle: "Legalidad y cumplimiento.",
    nodeId: "jurix",
    integration: "Legal ledger",
    status: "ready",
  },
  {
    key: "hostia",
    title: "Hostia",
    subtitle: "APIs, hosting y tokens.",
    nodeId: "hostia",
    integration: "Bridge node",
    status: "ready",
  },
  {
    key: "candy-ads",
    title: "Candy Ads",
    subtitle: "Creatividad visual.",
    nodeId: "candy-ads",
    integration: "Creative node",
    status: "ready",
  },
  {
    key: "nova-ads",
    title: "Nova Ads",
    subtitle: "Campañas y estrategia.",
    nodeId: "nova-ads",
    integration: "Ads core",
    status: "ready",
  },
  {
    key: "pro-ia",
    title: "PRO IA",
    subtitle: "Video, voz y motion.",
    nodeId: "pro-ia",
    integration: "Video node",
    status: "ready",
  },
  {
    key: "trackhok",
    title: "Trackhok IA",
    subtitle: "Monitoreo y predicción.",
    nodeId: "trackhok",
    integration: "Analytics node",
    status: "pending",
  },
  {
    key: "nexpa",
    title: "NEXPA",
    subtitle: "Control ético invisible.",
    nodeId: "nexpa",
    integration: "Guard node",
    status: "pending",
  },
  {
    key: "curvewind",
    title: "Curvewind",
    subtitle: "Estrategia y proyección.",
    nodeId: "curvewind",
    integration: "Prediction core",
    status: "pending",
  },
  {
    key: "chido-wins",
    title: "Chido Wins",
    subtitle: "Predicción y validación.",
    nodeId: "chido-wins",
    integration: "Game core",
    status: "pending",
  },
  {
    key: "chido-gerente",
    title: "Chido Gerente",
    subtitle: "Operación del casino.",
    nodeId: "chido-gerente",
    integration: "Ops core",
    status: "pending",
  },
  {
    key: "shadows",
    title: "Shadows",
    subtitle: "Capa invisible temporal.",
    nodeId: "shadows",
    integration: "Micro tasks",
    status: "pending",
  },
];

function money(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function timeLabel(input: string): string {
  const date = new Date(input);
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function resolveStatusFromPresence(
  projectIds: Set<string>,
  nodeIds: Set<string>,
  item: AppRegistryItem | AgiRegistryItem,
): AppStatus {
  if (projectIds.has(item.projectId ?? item.key)) {
    return "live";
  }

  if (nodeIds.has(item.nodeId)) {
    return "live";
  }

  return item.status;
}

export async function buildDashboardSummary(): Promise<DashboardSummary> {
  const sb = await createServerSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    projectsRes,
    nodesRes,
    eventsRes,
    commandsRes,
    ordersRes,
  ] = await Promise.all([
    sb.from("projects").select("id,name,created_at"),
    sb.from("nodes").select("id,project_id,name,status,type,last_seen_at"),
    sb.from("events").select("id,project_id,level,type,message,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(12),
    sb.from("commands").select("id,project_id,command,status,created_at").order("created_at", { ascending: false }).limit(12),
    sb.from("supply_orders").select("id,project_id,status,total_cents,created_at"),
  ]);

  const projects = (projectsRes.data ?? []) as RawProject[];
  const nodes = (nodesRes.data ?? []) as RawNode[];
  const events = (eventsRes.data ?? []) as RawEvent[];
  const commands = (commandsRes.data ?? []) as RawCommand[];
  const orders = (ordersRes.data ?? []) as RawOrder[];

  const projectIds = new Set(projects.map((project) => project.id));
  const nodeIds = new Set(nodes.map((node) => node.id));

  const liveNodes = nodes.filter((node) => {
    const status = String(node.status ?? "").toLowerCase();
    return status === "online" || status === "idle";
  }).length;

  const revenueCents = orders.reduce((sum, order) => sum + Number(order.total_cents ?? 0), 0);
  const queuedCommands = commands.filter((command) =>
    ["queued", "pending", "needs_approval"].includes(command.status),
  ).length;

  const apps = APP_REGISTRY.map((item) => ({
    ...item,
    status: resolveStatusFromPresence(projectIds, nodeIds, item),
  }));

  const agis = AGI_REGISTRY.map((item) => ({
    ...item,
    status: resolveStatusFromPresence(projectIds, nodeIds, item),
  }));

  const metrics: DashboardMetric[] = [
    {
      label: "Nodos vivos",
      value: String(liveNodes),
      hint: "Infraestructura con señal activa",
    },
    {
      label: "Tareas en cola",
      value: String(queuedCommands),
      hint: "Órdenes esperando ejecución",
    },
    {
      label: "Eventos 24 h",
      value: String(events.length),
      hint: "Actividad reciente del ecosistema",
    },
    {
      label: "Movimientos",
      value: money(revenueCents),
      hint: "Suma de órdenes registradas",
    },
  ];

  const recentEvents: DashboardEventItem[] = events.map((event) => ({
    id: event.id,
    title: event.type,
    detail: event.message,
    level: (event.level === "warn" || event.level === "error" ? event.level : "info") as
      | "info"
      | "warn"
      | "error",
    at: timeLabel(event.created_at),
  }));

  const recentCommands: DashboardCommandItem[] = commands.map((command) => ({
    id: command.id,
    command: command.command,
    projectId: command.project_id,
    status: command.status,
    createdAt: timeLabel(command.created_at),
  }));

  return {
    metrics,
    apps,
    agis,
    recentEvents,
    recentCommands,
  };
}

export function getAppStatusLabel(status: AppStatus): string {
  if (status === "live") return "Activo";
  if (status === "ready") return "Listo";
  return "Pendiente";
}

export function getStatusTone(status: AppStatus): string {
  if (status === "live") return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
  if (status === "ready") return "bg-sky-500/15 text-sky-300 border-sky-400/20";
  return "bg-white/5 text-slate-300 border-white/10";
}