/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Nota: usamos <img> en badges para evitar bloqueo por CSP/remotePatterns cuando el src viene de Score Store.
import clsx from "clsx";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Megaphone,
  Settings,
  Shield,
  RefreshCcw,
  Search,
  X,
  HelpCircle,
  ExternalLink,
  Truck,
  CreditCard,
  PiggyBank,
  Wallet,
  Receipt,
  Clock,
  Activity,
  AlertTriangle,
  LogOut,
  Menu,
} from "lucide-react";

import AiDock from "./ai-dock";
import { supabase, SUPABASE_CONFIGURED } from "@/lib/supabase";
import { hasPerm, canManageUsers } from "@/lib/authz";

/* =========================================================
   BRAND (white + pro)
========================================================= */
const BRAND = {
  name: "UnicOs",
  accent: "#0ea5e9", // sky-500
  accent2: "#2563eb", // blue-600
  grad: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
};

const SCORE_ORG_ID = "1f3b9980-a1c5-4557-b4eb-a75bb9a8aaa6";

const SCORESTORE_BASE =
  (typeof window !== "undefined" && window?.__SCORESTORE_URL__) ||
  process.env.NEXT_PUBLIC_SCORESTORE_URL ||
  "https://scorestore.netlify.app";

/* =========================================================
   Helpers
========================================================= */
const isUuid = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || "").trim());

const normEmail = (s) => String(s || "").trim().toLowerCase();
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const moneyMXN = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(
    Number.isFinite(Number(v)) ? Number(v) : 0
  );

function BrandMark({ size = 36 }) {
  return (
    <div
      style={{ background: BRAND.grad, width: size, height: size }}
      className="rounded-2xl shadow-md flex items-center justify-center text-white font-black"
      aria-label="UnicOs"
    >
      U
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((t) => {
    setToast({ ...t, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);
  return { toast, show };
}

function Toast({ t }) {
  if (!t) return null;

  const tone =
    t.type === "ok"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : t.type === "warn"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : t.type === "info"
      ? "bg-sky-50 text-sky-900 border-sky-200"
      : "bg-rose-50 text-rose-900 border-rose-200";

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999]">
      <div className={clsx("px-5 py-3 rounded-2xl border shadow-xl text-sm font-black", tone)}>{t.text}</div>
    </div>
  );
}

/**
 * HelpTip: icono "?" pequeño, click -> explicación
 * No usa librerías extra. Cierra al click fuera / Escape.
 */
function HelpTip({ title = "Ayuda", text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e) => {
      if (!open) return;
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        aria-label="Ayuda"
        title="¿Qué es esto?"
      >
        <HelpCircle size={16} />
      </button>

      {open ? (
        <div className="absolute z-[9999] top-9 right-0 w-[320px] max-w-[85vw]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl p-4">
            <p className="text-xs font-black text-slate-900">{title}</p>
            <p className="text-sm font-semibold text-slate-600 leading-relaxed mt-1">{text}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 px-3 py-2 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}

/* =========================================================
   Supabase “org-safe” accessors (org_id / organization_id)
========================================================= */
async function selectAdminRole(orgId, user) {
  const email = normEmail(user?.email);
  const uid = user?.id || "00000000-0000-0000-0000-000000000000";

  // Try org_id first
  const q1 = await supabase
    .from("admin_users")
    .select("role,is_active,email,user_id,org_id,organization_id")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .or(`user_id.eq.${uid},email.ilike.${email}`)
    .limit(1)
    .maybeSingle();

  if (!q1.error && q1.data?.is_active) return String(q1.data.role || "").toLowerCase();

  // Fallback organization_id
  const q2 = await supabase
    .from("admin_users")
    .select("role,is_active,email,user_id,org_id,organization_id")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .or(`user_id.eq.${uid},email.ilike.${email}`)
    .limit(1)
    .maybeSingle();

  if (!q2.error && q2.data?.is_active) return String(q2.data.role || "").toLowerCase();
  return null;
}

function ImgBadge({ src, alt }) {
  // “cuadradas con fondo blanco” -> contenedor pro
  const resolveSrc = (s) => {
    const v = String(s || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    // Si viene como assets/... (Score Store), lo resolvemos al dominio de Score Store
    if (v.startsWith("assets/")) return `${String(SCORESTORE_BASE).replace(/\/+$/, "")}/${v}`;
    // paths absolutos
    if (v.startsWith("/")) return v;
    return v;
  };

  const finalSrc = resolveSrc(src);

  return (
    <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center shadow-sm">
      {finalSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={finalSrc} alt={alt || "IMG"} className="w-full h-full object-contain" />
      ) : (
        <span className="text-xs font-black text-slate-300">IMG</span>
      )}
    </div>
  );
}

function SkeletonLine() {
  return <div className="h-5 rounded-xl bg-slate-200/70 animate-pulse" />;
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-8">
      <p className="text-lg font-black text-slate-900">{title}</p>
      <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">{text}</p>
    </div>
  );
}

function MiniKPI({ label, value, note, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <span className="text-slate-500">{icon}</span>
          {label}
        </span>
        {note ? <span className="text-[10px] font-black text-slate-400">{note}</span> : null}
      </p>
      <p className="text-lg font-black text-slate-900 mt-2">{String(value ?? "—")}</p>
    </div>
  );
}

export default function HomePage() {
  const { toast, show } = useToast();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  const [orgId] = useState(SCORE_ORG_ID);

  const [role, setRole] = useState(null);
  const canWrite = !!role && hasPerm(role, "write");
  const canUsers = !!role && canManageUsers(role);

  const [active, setActive] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!SUPABASE_CONFIGURED) {
        setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user || null;
      setUser(u);
      setReady(true);
    };

    run().catch(() => setReady(true));
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!user || !orgId) return;
      const r = await selectAdminRole(orgId, user);
      setRole(r);
    };
    run().catch(() => {});
  }, [user, orgId]);

  // ✅ TOKEN REAL para APIs server-side (Stripe/Envía)
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    let unsub = null;

    const bootToken = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const t = data?.session?.access_token || "";
        setAuthToken(t);
      } catch {
        setAuthToken("");
      }

      try {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setAuthToken(session?.access_token || "");
        });
        unsub = data?.subscription || null;
      } catch {
        // ignore
      }
    };

    bootToken();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      show({ type: "ok", text: "Sesión cerrada." });
    } catch {
      show({ type: "bad", text: "No se pudo cerrar sesión." });
    }
  };

  /* =========================================================
     Views
  ========================================================= */

  function DashboardView({ orgId, token, toast }) {
    const [busy, setBusy] = useState(false);

    const [kpi, setKpi] = useState({
      gross: 0,
      net: 0,
      orders: 0,
      avg: 0,
      stripeFee: 0,
      stripeMode: "estimate",
      enviaCost: 0,
      sessions: [],
      updatedAt: null,
      stripeDash: null,
      enviaDash: null,
    });

    const load = useCallback(async () => {
      if (!orgId) return;

      setBusy(true);

      try {
        const { data: paidOrders } = await supabase
          .from("orders")
          .select("id, amount_total_mxn, status, stripe_session_id, created_at, org_id, organization_id")
          .or(`org_id.eq.${orgId},organization_id.eq.${orgId}`)
          .in("status", ["paid", "fulfilled"])
          .order("created_at", { ascending: false })
          .limit(600);

        const list = paidOrders || [];
        const gross = list.reduce((a, o) => a + num(o.amount_total_mxn), 0);
        const orders = list.length;
        const avg = orders ? gross / orders : 0;

        // Envía cost: desde shipping_labels.raw (cuando existe)
        const { data: labels } = await supabase
          .from("shipping_labels")
          .select("stripe_session_id, raw, created_at, org_id, organization_id")
          .or(`org_id.eq.${orgId},organization_id.eq.${orgId}`)
          .order("created_at", { ascending: false })
          .limit(800);

        const labelList = labels || [];
        const enviaCost = labelList.reduce((acc, r) => {
          const raw = r?.raw || {};
          const total =
            num(raw?.totalAmount) ||
            num(raw?.data?.totalAmount) ||
            num(raw?.shipment?.totalAmount) ||
            0;
          return acc + total;
        }, 0);

        // Stripe fee real (si API está disponible), si no estimado
        let stripeFee = 0;
        let stripeMode = "estimate";

        try {
          const res = await fetch(`/api/stripe/fees`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            // Nota: el backend valida por admin_users. Aquí mandamos sesiones.
            body: JSON.stringify({
              org_id: orgId,
              stripe_session_ids: list.map((x) => x.stripe_session_id).filter(Boolean),
            }),
          });
          const j = await res.json().catch(() => ({}));

          if (res.ok && j?.ok) {
            stripeFee = num(j.total_fee_mxn);
            stripeMode = "stripe";
          } else {
            stripeFee = Math.round(gross * 0.039);
            stripeMode = "estimate";
          }
        } catch {
          stripeFee = Math.round(gross * 0.039);
          stripeMode = "estimate";
        }

        // Stripe/Envía dashboards (misma info que ves en sus plataformas)
        // Nota: requiere token (Supabase Auth) + env vars en server.
        let stripeDash = null;
        let enviaDash = null;

        if (token) {
          try {
            const [sres, eres] = await Promise.all([
              fetch(`/api/stripe/summary`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ org_id: orgId }),
              }),
              fetch(`/api/envia/summary`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ org_id: orgId, include_track: false }),
              }),
            ]);

            const sj = await sres.json().catch(() => null);
            const ej = await eres.json().catch(() => null);

            if (sres.ok && sj?.ok) stripeDash = sj;
            if (eres.ok && ej?.ok) enviaDash = ej;
          } catch {
            // ignore, UI mantiene costos desde Supabase
          }
        }

        const netRaw = Math.max(0, gross - stripeFee - enviaCost);
        const net = Math.max(0, netRaw * 0.7); // no se menciona en UI

        setKpi({
          gross,
          net,
          orders,
          avg,
          stripeFee,
          stripeMode,
          enviaCost,
          sessions: list.slice(0, 12),
          updatedAt: new Date().toISOString(),
          stripeDash,
          enviaDash,
        });
      } catch (e) {
        toast?.({ type: "bad", text: String(e?.message || e) });
      } finally {
        setBusy(false);
      }
    }, [orgId, toast, token]);

    useEffect(() => {
      load();
    }, [load]);

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                <PiggyBank size={14} className="text-sky-600" /> Ganancia Score Store
                <HelpTip
                  title="Ganancia Score Store"
                  text="Este indicador ya considera costos. Aquí ves el valor operativo que usa la empresa para decisiones internas."
                />
              </p>

              <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{moneyMXN(kpi.net)}</h3>

              <p className="text-sm font-semibold text-slate-600 mt-1">Resumen en tiempo real de ingresos y costos.</p>

              <p className="text-xs font-semibold text-slate-500 mt-2">
                {kpi.updatedAt ? `Última actualización: ${new Date(kpi.updatedAt).toLocaleString("es-MX")}` : "—"}
              </p>
            </div>

            <button
              onClick={load}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm flex items-center gap-2"
            >
              <RefreshCcw size={16} className={busy ? "animate-spin" : ""} /> Actualizar
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-200">
            <MiniKPI label="Ganancia Score Store" value={moneyMXN(kpi.net)} icon={<PiggyBank size={14} />} />
            <MiniKPI
              label="Comisión Stripe"
              value={moneyMXN(kpi.stripeFee)}
              note={kpi.stripeMode === "stripe" ? "Real" : "Estimado"}
              icon={<CreditCard size={14} />}
            />
            <MiniKPI label="Comisión Envía.com" value={moneyMXN(kpi.enviaCost)} icon={<Truck size={14} />} />
            <MiniKPI label="Ventas totales" value={moneyMXN(kpi.gross)} icon={<Wallet size={14} />} />
            <MiniKPI label="Pedidos pagados" value={num(kpi.orders)} icon={<ShoppingCart size={14} />} />
            <MiniKPI label="Ticket promedio" value={moneyMXN(kpi.avg)} icon={<Receipt size={14} />} />
            <MiniKPI label="Actualizado" value={kpi.updatedAt ? new Date(kpi.updatedAt).toLocaleTimeString("es-MX") : "—"} icon={<Clock size={14} />} />
            <MiniKPI label="Estado" value={busy ? "Cargando…" : "Listo"} icon={<Activity size={14} />} />
          </div>
        </div>

        {/* Stripe + Envía (igual que dashboards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <CreditCard size={14} className="text-sky-600" /> Stripe (dashboard)
                  <HelpTip
                    title="Stripe (dashboard)"
                    text="Esto trae datos reales desde Stripe (balance, payouts, disputas y reembolsos). Si no aparece, falta STRIPE_SECRET_KEY en el servidor o no tienes permisos."
                  />
                </p>
                <h4 className="text-lg font-black text-slate-900 mt-1">Balance</h4>
              </div>
              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-xs flex items-center gap-2"
                title="Abrir Stripe"
              >
                <ExternalLink size={14} /> Abrir
              </a>
            </div>

            {kpi.stripeDash ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MiniKPI label="Disponible" value={moneyMXN(kpi.stripeDash?.balance?.available_mxn || 0)} icon={<Wallet size={14} />} />
                  <MiniKPI label="Pendiente" value={moneyMXN(kpi.stripeDash?.balance?.pending_mxn || 0)} icon={<Clock size={14} />} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniKPI label="Disputas (30 días)" value={String(kpi.stripeDash?.last_30_days?.disputes_count || 0)} icon={<AlertTriangle size={14} />} />
                  <MiniKPI label="Reembolsos (30 días)" value={String(kpi.stripeDash?.last_30_days?.refunds_count || 0)} icon={<Receipt size={14} />} />
                </div>

                <p className="text-xs font-semibold text-slate-500">
                  Última sync: {kpi.stripeDash?.updated_at ? new Date(kpi.stripeDash.updated_at).toLocaleString("es-MX") : "—"}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">Aún no disponible</p>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  Para ver esto necesitas:
                  <br />• Iniciar sesión (token)
                  <br />• Permiso owner/admin/finance en admin_users
                  <br />• STRIPE_SECRET_KEY en el servidor de UnicOs
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Truck size={14} className="text-sky-600" /> Envía.com (dashboard)
                  <HelpTip
                    title="Envía.com (dashboard)"
                    text="Esto trae datos reales desde Envía.com usando tu ENVIA_API_KEY. Muestra costos y últimos envíos registrados."
                  />
                </p>
                <h4 className="text-lg font-black text-slate-900 mt-1">Envíos</h4>
              </div>
              <a
                href="https://envia.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-xs flex items-center gap-2"
                title="Abrir Envía"
              >
                <ExternalLink size={14} /> Abrir
              </a>
            </div>

            {kpi.enviaDash ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MiniKPI label="Guías (últimas 200)" value={String(kpi.enviaDash?.totals?.labels || 0)} icon={<Package size={14} />} />
                  <MiniKPI label="Costo total" value={moneyMXN(kpi.enviaDash?.totals?.cost_mxn || 0)} icon={<Wallet size={14} />} />
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-black text-slate-700">Últimos envíos</p>
                  </div>
                  <div className="max-h-[200px] overflow-auto">
                    {(kpi.enviaDash?.rows || []).slice(0, 8).map((r) => (
                      <div key={r.id} className="px-4 py-3 border-b border-slate-200 last:border-b-0">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {r.carrier || "Carrier"} · {r.tracking ? r.tracking : "Sin tracking"}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {r.created_at ? new Date(r.created_at).toLocaleString("es-MX") : "—"} · {moneyMXN(r.cost_mxn || 0)}
                        </p>
                      </div>
                    ))}
                    {!((kpi.enviaDash?.rows || []).length) ? (
                      <div className="px-4 py-6">
                        <p className="text-sm font-semibold text-slate-600">Aún no hay guías registradas.</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-500">
                  Última sync: {kpi.enviaDash?.updated_at ? new Date(kpi.enviaDash.updated_at).toLocaleString("es-MX") : "—"}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">Aún no disponible</p>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  Para ver esto necesitas:
                  <br />• Iniciar sesión (token)
                  <br />• Permiso owner/admin/ops/finance en admin_users
                  <br />• ENVIA_API_KEY en el servidor de UnicOs
                </p>
              </div>
            )}
          </div>
        </div>

        <EmptyState
          title="Siguiente (control total)"
          text="Cuando Score Store quede final, aquí activamos el espejo completo: cambiar temporada/tema, copys, promo bar, pixel y automatización de operación."
        />
      </div>
    );
  }

  function ProductsView({ orgId, canWrite, toast }) {
    const [busy, setBusy] = useState(false);
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const emptyForm = useMemo(
      () => ({
        name: "",
        sku: "",
        description: "",
        price_mxn: "",
        stock: "",
        section_id: "EDICION_2025",
        rank: "999",
        is_active: true,
        sizes_csv: "S,M,L,XL,XXL",
        images_lines: "",
        image_url: "",
      }),
      []
    );

    const [form, setForm] = useState(emptyForm);

    const load = useCallback(async () => {
      if (!orgId) return;

      setBusy(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, sku, description, price_mxn, price_cents, stock, section_id, rank, images, sizes, image_url, is_active, deleted_at, created_at, org_id, organization_id"
          )
          .or(`org_id.eq.${orgId},organization_id.eq.${orgId}`)
          .is("deleted_at", null)
          .order("rank", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(400);

        if (error) throw error;
        setRows(data || []);
      } catch (e) {
        toast?.({ type: "bad", text: String(e?.message || e) });
      } finally {
        setBusy(false);
      }
    }, [orgId, toast]);

    useEffect(() => {
      load();
    }, [load]);

    const filtered = useMemo(() => {
      const s = String(q || "").trim().toLowerCase();
      if (!s) return rows || [];
      return (rows || []).filter((r) => {
        const t = `${r?.name || ""} ${r?.sku || ""} ${r?.section_id || ""}`.toLowerCase();
        return t.includes(s);
      });
    }, [rows, q]);

    const openNew = () => {
      setEditing(null);
      setForm(emptyForm);
      setOpen(true);
    };

    const openEdit = (row) => {
      setEditing(row);
      const sizes = Array.isArray(row?.sizes) ? row.sizes.join(",") : "";
      const images = Array.isArray(row?.images) ? row.images.join("\n") : "";
      setForm({
        name: row?.name || "",
        sku: row?.sku || "",
        description: row?.description || "",
        price_mxn: String(row?.price_mxn ?? ""),
        stock: String(row?.stock ?? ""),
        section_id: row?.section_id || "EDICION_2025",
        rank: String(row?.rank ?? "999"),
        is_active: !!row?.is_active,
        sizes_csv: sizes || "S,M,L,XL,XXL",
        images_lines: images || "",
        image_url: row?.image_url || "",
      });
      setOpen(true);
    };

    const closeModal = () => {
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    };

    const save = async () => {
      if (!orgId) return;

      if (!canWrite) {
        toast?.({ type: "bad", text: "No tienes permisos para editar productos." });
        return;
      }

      const name = String(form.name || "").trim();
      const sku = String(form.sku || "").trim();
      if (!name) return toast?.({ type: "bad", text: "Falta el nombre del producto." });
      if (!sku) return toast?.({ type: "bad", text: "Falta el SKU." });

      const price_mxn = Number(form.price_mxn);
      if (!Number.isFinite(price_mxn) || price_mxn <= 0) {
        return toast?.({ type: "bad", text: "Precio MXN inválido." });
      }

      const stock = Number(form.stock);
      const section_id = String(form.section_id || "EDICION_2025").trim() || "EDICION_2025";
      const rank = Number(form.rank);

      const sizes = String(form.sizes_csv || "")
        .split(",")
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      const images = String(form.images_lines || "")
        .split("\n")
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      const image_url = String(form.image_url || "").trim() || (images[0] || null);

      const payload = {
        org_id: orgId,
        organization_id: orgId, // compat
        name,
        sku,
        description: String(form.description || "").trim(),
        price_mxn,
        price_cents: Math.round(price_mxn * 100),
        stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0,
        section_id,
        rank: Number.isFinite(rank) ? rank : 999,
        is_active: !!form.is_active,
        images: images.length ? images : [],
        sizes: sizes.length ? sizes : [],
        image_url,
        img: image_url || (images[0] || ""), // compat con schema viejo
        base_mxn: price_mxn, // schema viejo requiere base_mxn NOT NULL
        sub_section: section_id, // schema viejo requiere sub_section NOT NULL
        updated_at: new Date().toISOString(),
      };

      setBusy(true);
      try {
        if (editing?.id) {
          const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
          if (error) throw error;
          toast?.({ type: "ok", text: "Producto actualizado." });
        } else {
          const { error } = await supabase.from("products").insert({ ...payload, created_at: new Date().toISOString() });
          if (error) throw error;
          toast?.({ type: "ok", text: "Producto creado." });
        }

        closeModal();
        load();
      } catch (e) {
        toast?.({ type: "bad", text: String(e?.message || e) });
      } finally {
        setBusy(false);
      }
    };

    const softDelete = async (row) => {
      if (!row?.id) return;

      if (!canWrite) {
        toast?.({ type: "bad", text: "No tienes permisos para eliminar productos." });
        return;
      }

      const ok = confirm(`¿Eliminar "${row?.name || row?.sku || "producto"}"? (Se puede recuperar reactivando)`);
      if (!ok) return;

      setBusy(true);
      try {
        const { error } = await supabase
          .from("products")
          .update({ deleted_at: new Date().toISOString(), is_active: false, updated_at: new Date().toISOString() })
          .eq("id", row.id);

        if (error) throw error;

        toast?.({ type: "ok", text: "Producto eliminado (soft-delete)." });
        load();
      } catch (e) {
        toast?.({ type: "bad", text: String(e?.message || e) });
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Catálogo</p>
              <HelpTip
                title="¿Para qué sirve Catálogo?"
                text="Aquí se administran los productos que aparecen en Score Store. Lo que edites aquí alimenta el sitio en vivo."
              />
            </div>
            <h4 className="text-lg font-black text-slate-900">Productos (en vivo)</h4>
            <p className="text-sm font-semibold text-slate-600">
              Estos datos alimentan Score Store en tiempo real (Netlify Functions → Supabase).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white">
              <Search size={16} className="text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre / SKU / sección…"
                className="outline-none text-sm font-semibold text-slate-800 w-[240px] max-w-full"
              />
            </div>

            <button
              onClick={load}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm flex items-center gap-2"
            >
              <RefreshCcw size={16} className={busy ? "animate-spin" : ""} /> Actualizar
            </button>

            <button
              onClick={openNew}
              disabled={!canWrite}
              className={clsx(
                "px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2",
                canWrite ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500 cursor-not-allowed"
              )}
            >
              <Package size={16} /> Nuevo
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="py-2 pr-3">Producto</th>
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Sección</th>
                <th className="py-2 pr-3">Precio</th>
                <th className="py-2 pr-3">Stock</th>
                <th className="py-2 pr-3">Activo</th>
                <th className="py-2 pr-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(filtered || []).map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ImgBadge src={r?.image_url} alt={r?.name || "Producto"} />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{r?.name || "—"}</p>
                        <p className="text-xs font-semibold text-slate-500 truncate">Rank: {String(r?.rank ?? "—")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="text-sm font-black text-slate-900">{r?.sku || "—"}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="text-sm font-black text-slate-900">{r?.section_id || "—"}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="text-sm font-black text-slate-900">{moneyMXN(r?.price_mxn || 0)}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="text-sm font-black text-slate-900">{Number(r?.stock ?? 0)}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={clsx(
                        "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black",
                        r?.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {r?.is_active ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        disabled={!canWrite}
                        className={clsx(
                          "px-3 py-2 rounded-2xl font-black text-sm border",
                          canWrite
                            ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-900"
                            : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => softDelete(r)}
                        disabled={!canWrite}
                        className={clsx(
                          "px-3 py-2 rounded-2xl font-black text-sm border",
                          canWrite
                            ? "border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                            : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filtered?.length ? (
                <tr>
                  <td colSpan={7} className="py-10">
                    <p className="text-sm font-semibold text-slate-500">Sin productos.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {open ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeModal}
              role="button"
              aria-label="Cerrar modal"
            />
            <div className="relative w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white shadow-xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                    {editing?.id ? "Editar" : "Nuevo"} producto
                  </p>
                  <h4 className="text-lg font-black text-slate-900">
                    {editing?.id ? editing?.name || "Producto" : "Crear producto"}
                  </h4>
                </div>

                <button
                  onClick={closeModal}
                  className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div>
                  <label className="text-xs font-black text-slate-700">Nombre</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700">Precio MXN</label>
                  <input
                    value={form.price_mxn}
                    onChange={(e) => setForm((p) => ({ ...p, price_mxn: e.target.value }))}
                    inputMode="decimal"
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">Stripe usa centavos automáticamente.</p>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700">Stock</label>
                  <input
                    value={form.stock}
                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                    inputMode="numeric"
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700">Sección (section_id)</label>
                  <input
                    value={form.section_id}
                    onChange={(e) => setForm((p) => ({ ...p, section_id: e.target.value }))}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700">Rank (orden)</label>
                  <input
                    value={form.rank}
                    onChange={(e) => setForm((p) => ({ ...p, rank: e.target.value }))}
                    inputMode="numeric"
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-black text-slate-700">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700">Tallas (CSV)</label>
                  <input
                    value={form.sizes_csv}
                    onChange={(e) => setForm((p) => ({ ...p, sizes_csv: e.target.value }))}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700">Imagen principal (URL)</label>
                  <input
                    value={form.image_url}
                    onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-black text-slate-700">Imágenes (1 URL por línea)</label>
                  <textarea
                    value={form.images_lines}
                    onChange={(e) => setForm((p) => ({ ...p, images_lines: e.target.value }))}
                    rows={4}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                    placeholder="https://.../img1.webp&#10;https://.../img2.webp"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <input
                      type="checkbox"
                      checked={!!form.is_active}
                      onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    Activo
                  </label>

                  <div className="flex gap-2">
                    <button
                      onClick={closeModal}
                      className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={save}
                      disabled={busy}
                      className={clsx(
                        "px-4 py-3 rounded-2xl font-black text-sm",
                        busy ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] font-semibold text-slate-500 mt-4">
                Nota: Score Store consume estos datos vía <code>/.netlify/functions/catalog</code> y valida precios en checkout.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  /* =========================================================
     Layout
  ========================================================= */

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "products", label: "Productos", icon: <Package size={18} /> },
    { id: "orders", label: "Pedidos", icon: <ShoppingCart size={18} /> },
    { id: "users", label: "Usuarios", icon: <Users size={18} />, hidden: !canUsers },
    { id: "marketing", label: "Marketing", icon: <Megaphone size={18} /> },
    { id: "settings", label: "Ajustes", icon: <Settings size={18} /> },
    { id: "security", label: "Seguridad", icon: <Shield size={18} /> },
  ].filter((x) => !x.hidden);

  const view = useMemo(() => {
    if (!ready) return <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <SkeletonLine key={i} />)}</div>;
    if (!SUPABASE_CONFIGURED)
      return (
        <EmptyState
          title="Falta configuración"
          text="Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu .env para activar UnicOs."
        />
      );

    if (!user)
      return (
        <EmptyState
          title="Inicia sesión"
          text="UnicOs requiere autenticación (Supabase Auth) para operar y mostrar datos reales."
        />
      );

    if (!role)
      return (
        <EmptyState
          title="Sin acceso"
          text="Tu usuario no está registrado como admin activo para esta organización. Usa la sección Invite/Bootstrap."
        />
      );

    if (active === "dashboard") return <DashboardView orgId={orgId} token={authToken} toast={show} />;
    if (active === "products") return <ProductsView orgId={orgId} canWrite={canWrite} toast={show} />;

    return (
      <EmptyState
        title="Módulo en preparación"
        text="Este módulo se activa cuando Score Store quede final y se confirme el flujo real (pago → envío → tracking)."
      />
    );
  }, [ready, user, role, active, orgId, canWrite, show, authToken]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast t={toast} />

      {/* Top bar */}
      <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              className="md:hidden w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>

            <BrandMark size={36} />

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Panel</p>
              <p className="text-sm font-black text-slate-900 truncate">
                {BRAND.name} <span className="text-slate-400">·</span> Operación en vivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/scorestore-settings"
              className="hidden sm:inline-flex px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm"
              title="Control de Score Store"
            >
              Site Settings
            </a>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm flex items-center gap-2"
              title="Cerrar sesión"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside
          className={clsx(
            "md:col-span-3 lg:col-span-2",
            navOpen ? "block" : "hidden md:block"
          )}
        >
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-3">
            <nav className="space-y-1">
              {navItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setActive(it.id);
                    setNavOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm",
                    active === it.id ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50 text-slate-900"
                  )}
                >
                  {it.icon}
                  {it.label}
                </button>
              ))}
            </nav>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rol</p>
              <p className="text-sm font-black text-slate-900 mt-1">{role || "—"}</p>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                Organización: <span className="font-black">{orgId.slice(0, 8)}…</span>
              </p>
            </div>
          </div>

          <div className="mt-4">
            <AiDock />
          </div>
        </aside>

        {/* Main */}
        <main className="md:col-span-9 lg:col-span-10 space-y-4">{view}</main>
      </div>
    </div>
  );
}