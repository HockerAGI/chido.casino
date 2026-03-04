/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Plus,
  X,
  Pencil,
  Trash2,
  HelpCircle,
  LogOut,
  Menu,
  ChevronDown,
  Truck,
  CreditCard,
  PiggyBank,
  Wallet,
  Receipt,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
} from "lucide-react";

import AiDock from "./ai-dock";
import { supabase, SUPABASE_CONFIGURED } from "@/lib/supabase";
import { hasPerm, canManageUsers } from "@/lib/authz";

/* =========================================================
   Brand
========================================================= */
const BRAND = {
  name: "UnicOs",
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
 * Cierra al click fuera / Escape.
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
        <div className="absolute z-[9999] top-9 right-0 w-[330px] max-w-[85vw]">
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

function ImgBadge({ src, alt }) {
  const resolveSrc = (s) => {
    const v = String(s || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith("assets/")) return `${String(SCORESTORE_BASE).replace(/\/+$/, "")}/${v}`;
    if (v.startsWith("/")) return v;
    return v;
  };

  const finalSrc = resolveSrc(src);

  return (
    <div className="w-12 h-12 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
      {finalSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={finalSrc}
          alt={alt || "img"}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain p-2 relative"
        />
      ) : (
        <span className="text-xs font-black text-slate-400 relative">IMG</span>
      )}
    </div>
  );
}

function MiniKPI({ label, value, icon, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-lg font-black text-slate-900 mt-1">{String(value ?? "—")}</p>
          {note ? <p className="text-[11px] font-bold text-slate-500 mt-1">{note}</p> : null}
        </div>
        <div className="w-9 h-9 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-slate-200 my-6" />;
}

function SkeletonLine() {
  return <div className="h-4 rounded-xl bg-slate-100 animate-pulse" />;
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="text-sm font-semibold text-slate-600 mt-1">{text}</p>
    </div>
  );
}

/* =========================================================
   Supabase org-safe role
========================================================= */
async function selectAdminRole(orgId, user) {
  const email = normEmail(user?.email);
  const uid = user?.id || "00000000-0000-0000-0000-000000000000";

  const q1 = await supabase
    .from("admin_users")
    .select("role,is_active,email,user_id,org_id,organization_id")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .or(`user_id.eq.${uid},email.ilike.${email}`)
    .limit(1)
    .maybeSingle();

  if (!q1.error && q1.data?.is_active) return String(q1.data.role || "").toLowerCase();

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

/* =========================================================
   Page
========================================================= */
export default function Page() {
  const { toast, show } = useToast();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [orgId, setOrgId] = useState(SCORE_ORG_ID);

  const [navOpen, setNavOpen] = useState(false);
  const [active, setActive] = useState("dashboard");

  const [accessToken, setAccessToken] = useState("");

  const canWrite = useMemo(() => (role ? hasPerm(role, "write") : false), [role]);
  const canUsers = useMemo(() => (role ? canManageUsers(role) : false), [role]);

  // Bootstrap auth + token
  useEffect(() => {
    let sub = null;

    const boot = async () => {
      if (!SUPABASE_CONFIGURED) {
        show({ type: "bad", text: "Falta configurar Supabase en .env (URL / KEY)." });
        setReady(true);
        return;
      }

      const { data: sess0 } = await supabase.auth.getSession();
      setAccessToken(sess0?.session?.access_token || "");

      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);

      sub = supabase.auth.onAuthStateChange(async (_e, session) => {
        setUser(session?.user || null);
        setAccessToken(session?.access_token || "");
      }).data?.subscription;

      setReady(true);
    };

    boot().catch(() => setReady(true));

    return () => {
      try {
        sub?.unsubscribe?.();
      } catch {}
    };
  }, [show]);

  // Resolve role
  useEffect(() => {
    const run = async () => {
      if (!user || !isUuid(orgId)) return;
      const r = await selectAdminRole(orgId, user);
      setRole(r);
    };
    run().catch(() => {});
  }, [user, orgId]);

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

  function DashboardView({ orgId, toast }) {
    const [busy, setBusy] = useState(false);

    const [kpi, setKpi] = useState({
      gross: 0,
      net: 0,
      orders: 0,
      avg: 0,
      stripeFee: 0,
      stripeMode: "estimate",
      enviaCost: 0,
      updatedAt: null,
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

        const { data: labels } = await supabase
          .from("shipping_labels")
          .select("raw, created_at, org_id, organization_id")
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

        // Stripe fee real (si API ok), si no estimado
        let stripeFee = 0;
        let stripeMode = "estimate";

        try {
          const res = await fetch(`/api/stripe/fees`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: accessToken ? `Bearer ${accessToken}` : "",
            },
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

        const netRaw = Math.max(0, gross - stripeFee - enviaCost);
        const net = Math.max(0, netRaw * 0.7); // no se menciona

        setKpi({
          gross,
          net,
          orders,
          avg,
          stripeFee,
          stripeMode,
          enviaCost,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        toast?.({ type: "bad", text: String(e?.message || e) });
      } finally {
        setBusy(false);
      }
    }, [orgId, toast]);

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
                  text="Este número ya considera costos. Está pensado para decisiones rápidas y evitar confusión."
                />
              </p>

              <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{moneyMXN(kpi.net)}</h3>

              <p className="text-sm font-semibold text-slate-600 mt-1">Resumen de ingresos y costos.</p>

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

        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
            <Activity size={14} className="text-slate-700" /> Siguiente paso
            <HelpTip
              title="Siguiente paso"
              text="Cuando Score Store quede 100% final, aquí se activa la operación completa: garantías, devoluciones, tickets y control total."
            />
          </p>
          <p className="text-sm font-semibold text-slate-700">
            Ya tienes datos reales. El módulo “Operación” te enseña Stripe y Envía.com de forma entendible.
          </p>
        </div>
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

      // Compat con tu tabla (ya vimos que tiene NOT NULL: org_id, base_mxn, sub_section, img)
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
        sub_section: section_id,
        rank: Number.isFinite(rank) ? rank : 999,
        is_active: !!form.is_active,
        active: !!form.is_active,
        images: images.length ? images : [],
        sizes: sizes.length ? sizes : [],
        image_url,
        img: image_url || (images[0] || ""),
        base_mxn: price_mxn,
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
          .update({ deleted_at: new Date().toISOString(), is_active: false, active: false, updated_at: new Date().toISOString() })
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
                title="Catálogo"
                text="Aquí administras productos reales. Lo que edites aquí se refleja en Score Store (si el sitio está configurado para leer Supabase)."
              />
            </div>
            <h4 className="text-lg font-black text-slate-900">Productos (en vivo)</h4>
            <p className="text-sm font-semibold text-slate-600">Evita tecnicismos: nombre, precio, stock, imágenes.</p>
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
              <Plus size={16} /> Nuevo
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
                      <ImgBadge src={r?.image_url || (Array.isArray(r?.images) ? r.images[0] : "")} alt={r?.name || "Producto"} />
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
                          canWrite ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-900" : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => softDelete(r)}
                        disabled={!canWrite}
                        className={clsx(
                          "px-3 py-2 rounded-2xl font-black text-sm border",
                          canWrite ? "border-red-200 bg-red-50 hover:bg-red-100 text-red-700" : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={16} />
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
            <div className="absolute inset-0 bg-black/40" onClick={closeModal} role="button" aria-label="Cerrar modal" />
            <div className="relative w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white shadow-xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                    {editing?.id ? "Editar" : "Nuevo"} producto
                  </p>
                  <h4 className="text-lg font-black text-slate-900">{editing?.id ? (editing?.name || "Producto") : "Crear producto"}</h4>
                </div>

                <button onClick={closeModal} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center">
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700">Precio MXN</label>
                    <HelpTip title="Precio" text="Este es el precio que verá el cliente en la tienda." />
                  </div>
                  <input
                    value={form.price_mxn}
                    onChange={(e) => setForm((p) => ({ ...p, price_mxn: e.target.value }))}
                    inputMode="decimal"
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700">Stock</label>
                    <HelpTip title="Stock" text="Si está en 0, es mejor marcarlo como 'agotado' o desactivarlo para evitar problemas." />
                  </div>
                  <input
                    value={form.stock}
                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                    inputMode="numeric"
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700">Sección</label>
                    <HelpTip title="Sección" text="Ejemplo: EDICION_2025, BAJA_500, BAJA_400. Sirve para ordenar el catálogo." />
                  </div>
                  <input
                    value={form.section_id}
                    onChange={(e) => setForm((p) => ({ ...p, section_id: e.target.value }))}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700">Rank (orden)</label>
                    <HelpTip title="Orden" text="Número más pequeño = aparece más arriba en la tienda." />
                  </div>
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
                    placeholder="https://.../img1.webp&#10;assets/EDICION_2025/hoodie.webp&#10;https://.../img2.webp"
                  />
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">
                    Tip: si pones <b>assets/...</b>, UnicOs lo resuelve automático a Score Store.
                  </p>
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
                Nota: la tienda valida estos datos. Mantén nombres claros y fotos correctas.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function OperationView({ orgId, toast }) {
    const [busy, setBusy] = useState(false);

    const [stripe, setStripe] = useState(null);
    const [envia, setEnvia] = useState(null);

    const copy = async (txt) => {
      try {
        await navigator.clipboard.writeText(String(txt || ""));
        toast?.({ type: "ok", text: "Copiado." });
      } catch {
        toast?.({ type: "bad", text: "No se pudo copiar." });
      }
    };

    const load = useCallback(async () => {
      if (!orgId) return;

      setBusy(true);
      try {
        // Stripe Summary
        const sRes = await fetch("/api/stripe/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
          },
          body: JSON.stringify({ org_id: orgId }),
        });
        const sJson = await sRes.json().catch(() => ({}));
        if (sRes.ok && sJson?.ok) setStripe(sJson);
        else setStripe({ ok: false, error: sJson?.error || "No se pudo leer Stripe." });

        // Envía Summary (incluye tracking si existe tracking_number)
        const eRes = await fetch("/api/envia/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
          },
          body: JSON.stringify({ org_id: orgId, include_track: true }),
        });
        const eJson = await eRes.json().catch(() => ({}));
        if (eRes.ok && eJson?.ok) setEnvia(eJson);
        else setEnvia({ ok: false, error: eJson?.error || "No se pudo leer Envía.com." });

        toast?.({ type: "ok", text: "Operación actualizada." });
      } catch (e) {
        toast?.({ type: "bad", text: String(e?.message || e) });
      } finally {
        setBusy(false);
      }
    }, [orgId, toast]);

    useEffect(() => {
      load();
    }, [load]);

    const stripeOk = !!stripe?.ok;
    const enviaOk = !!envia?.ok;

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                <Activity size={14} className="text-slate-700" /> Operación
                <HelpTip
                  title="Operación"
                  text="Aquí ves lo importante sin tecnicismos: Stripe (dinero / devoluciones) y Envía.com (guías / costos / tracking)."
                />
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Stripe + Envía.com (en vivo)
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                Datos reales obtenidos por API (cuando el proveedor lo permite).
              </p>
            </div>

            <button
              onClick={load}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm flex items-center gap-2"
            >
              <RefreshCcw size={16} className={busy ? "animate-spin" : ""} /> Actualizar
            </button>
          </div>
        </div>

        {/* Stripe */}
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-sky-700" />
              <p className="text-lg font-black text-slate-900">Stripe</p>
              <HelpTip
                title="Stripe"
                text="Stripe es el procesador de pagos. Aquí ves lo disponible, lo pendiente y eventos como devoluciones o contracargos."
              />
            </div>

            <a
              href="https://dashboard.stripe.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm"
              title="Abrir Stripe"
            >
              Dashboard <ExternalLink size={16} />
            </a>
          </div>

          {!stripe ? (
            <div className="mt-4 space-y-3">
              <SkeletonLine />
              <SkeletonLine />
              <SkeletonLine />
            </div>
          ) : !stripeOk ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-black text-rose-900 flex items-center gap-2">
                <AlertTriangle size={16} /> No se pudo leer Stripe
              </p>
              <p className="text-sm font-semibold text-rose-700 mt-1">{String(stripe?.error || "Error")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <MiniKPI label="Disponible" value={moneyMXN(stripe.balance?.available_mxn || 0)} icon={<Wallet size={14} />} />
                <MiniKPI label="Pendiente" value={moneyMXN(stripe.balance?.pending_mxn || 0)} icon={<Clock size={14} />} />
                <MiniKPI
                  label="Devoluciones (30d)"
                  value={`${num(stripe.last_30_days?.refunds_count || 0)}`}
                  note={moneyMXN(stripe.last_30_days?.refunds_amount_mxn || 0)}
                  icon={<Receipt size={14} />}
                />
                <MiniKPI
                  label="Contracargos (30d)"
                  value={`${num(stripe.last_30_days?.disputes_count || 0)}`}
                  note={moneyMXN(stripe.last_30_days?.disputes_amount_mxn || 0)}
                  icon={<AlertTriangle size={14} />}
                />
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Últimos payouts</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px]">
                    <thead>
                      <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <th className="py-2 pr-3">ID</th>
                        <th className="py-2 pr-3">Monto</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-3">Llegada</th>
                        <th className="py-2 pr-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stripe.payouts || []).map((p) => (
                        <tr key={p.id} className="border-t border-slate-200">
                          <td className="py-3 pr-3">
                            <p className="text-sm font-black text-slate-900">{p.id}</p>
                          </td>
                          <td className="py-3 pr-3">
                            <p className="text-sm font-black text-slate-900">{moneyMXN(p.amount_mxn || 0)}</p>
                          </td>
                          <td className="py-3 pr-3">
                            <span className={clsx("px-3 py-1 rounded-full text-xs font-black border",
                              p.status === "paid"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-50 text-slate-800 border-slate-200"
                            )}>
                              {String(p.status || "—")}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <p className="text-sm font-semibold text-slate-700">
                              {p.arrival_date ? new Date(p.arrival_date).toLocaleDateString("es-MX") : "—"}
                            </p>
                          </td>
                          <td className="py-3 pr-3 text-right">
                            <button
                              type="button"
                              onClick={() => copy(p.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm"
                              title="Copiar ID"
                            >
                              Copiar <Copy size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!stripe.payouts?.length ? (
                        <tr>
                          <td colSpan={5} className="py-6">
                            <p className="text-sm font-semibold text-slate-500">Sin payouts recientes.</p>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Envía */}
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-slate-700" />
              <p className="text-lg font-black text-slate-900">Envía.com</p>
              <HelpTip
                title="Envía.com"
                text="Aquí ves guías generadas, costo total y tracking cuando existe trackingNumber. Algunos reportes solo existen dentro del dashboard de Envía.com."
              />
            </div>

            <a
              href="https://envia.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm"
              title="Abrir Envía.com"
            >
              Dashboard <ExternalLink size={16} />
            </a>
          </div>

          {!envia ? (
            <div className="mt-4 space-y-3">
              <SkeletonLine />
              <SkeletonLine />
              <SkeletonLine />
            </div>
          ) : !enviaOk ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-black text-rose-900 flex items-center gap-2">
                <AlertTriangle size={16} /> No se pudo leer Envía.com
              </p>
              <p className="text-sm font-semibold text-rose-700 mt-1">{String(envia?.error || "Error")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <MiniKPI label="Guías" value={`${num(envia.totals?.labels || 0)}`} icon={<Truck size={14} />} />
                <MiniKPI label="Costo total" value={moneyMXN(envia.totals?.cost_mxn || 0)} icon={<Wallet size={14} />} />
                <MiniKPI label="Tracking" value={envia.tracking?.ok ? "Disponible" : "Parcial"} icon={<Activity size={14} />} />
                <MiniKPI label="Actualizado" value={envia.updated_at ? new Date(envia.updated_at).toLocaleTimeString("es-MX") : "—"} icon={<Clock size={14} />} />
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Últimas guías (DB)</p>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px]">
                    <thead>
                      <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <th className="py-2 pr-3">Fecha</th>
                        <th className="py-2 pr-3">Carrier</th>
                        <th className="py-2 pr-3">Tracking</th>
                        <th className="py-2 pr-3">Costo</th>
                        <th className="py-2 pr-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(envia.rows || []).map((r) => (
                        <tr key={r.id} className="border-t border-slate-200">
                          <td className="py-3 pr-3">
                            <p className="text-sm font-semibold text-slate-700">
                              {r.created_at ? new Date(r.created_at).toLocaleString("es-MX") : "—"}
                            </p>
                          </td>
                          <td className="py-3 pr-3">
                            <p className="text-sm font-black text-slate-900">{r.carrier || "—"}</p>
                          </td>
                          <td className="py-3 pr-3">
                            {r.tracking ? (
                              <span className="inline-flex items-center gap-2">
                                <p className="text-sm font-black text-slate-900">{r.tracking}</p>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-black text-slate-700">
                                  {envia.tracking?.ok ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
                                  Track
                                </span>
                              </span>
                            ) : (
                              <p className="text-sm font-semibold text-slate-500">—</p>
                            )}
                          </td>
                          <td className="py-3 pr-3">
                            <p className="text-sm font-black text-slate-900">{moneyMXN(r.cost_mxn || 0)}</p>
                          </td>
                          <td className="py-3 pr-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => copy(r.tracking || "")}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-black text-sm"
                                disabled={!r.tracking}
                                title="Copiar tracking"
                              >
                                Copiar <Copy size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {!envia.rows?.length ? (
                        <tr>
                          <td colSpan={5} className="py-6">
                            <p className="text-sm font-semibold text-slate-500">Sin guías recientes en DB.</p>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-900">Tip para operación</p>
                  <p className="text-sm font-semibold text-slate-600 mt-1">
                    Si una guía no tiene tracking, normalmente significa que el proveedor no lo devolvió en el "raw" o que aún no se generó.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* =========================================================
     Navigation + view selector
  ========================================================= */

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "products", label: "Productos", icon: <Package size={18} /> },
    { id: "operation", label: "Operación", icon: <Activity size={18} /> },
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
          text="Tu usuario no está registrado como admin activo para esta organización."
        />
      );

    if (active === "dashboard") return <DashboardView orgId={orgId} toast={show} />;
    if (active === "products") return <ProductsView orgId={orgId} canWrite={canWrite} toast={show} />;
    if (active === "operation") return <OperationView orgId={orgId} toast={show} />;

    return (
      <EmptyState
        title="Módulo en preparación"
        text="Este módulo se activa cuando se confirme el flujo real completo (pago → envío → tracking → entrega)."
      />
    );
  }, [ready, user, role, active, orgId, canWrite, show]);

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
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 bg-white">
              <span className="text-xs font-black text-slate-600">Org:</span>
              <span className="text-xs font-black text-slate-900">{orgId === SCORE_ORG_ID ? "Score Store" : orgId}</span>
              <HelpTip title="Organización" text="Define de qué tienda se ven los datos. Normalmente será Score Store." />
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className={clsx("md:block", navOpen ? "block" : "hidden")}>
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-4 sticky top-[84px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Menú</p>

            <div className="space-y-2">
              {navItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setActive(it.id);
                    setNavOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border font-black text-sm",
                    active === it.id
                      ? "border-sky-200 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-900"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "w-9 h-9 rounded-2xl flex items-center justify-center border",
                        active === it.id ? "bg-white border-sky-200 text-sky-700" : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      {it.icon}
                    </span>
                    {it.label}
                  </span>
                  <ChevronDown size={16} className="opacity-25 rotate-[-90deg]" />
                </button>
              ))}
            </div>

            <Divider />

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ayuda rápida</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">¿Te perdiste?</p>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  Busca los íconos <b>?</b>. Explican cada parte sin tecnicismos.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          {view}

          {/* AI Dock */}
          <div className="mt-6">
            <AiDock orgId={orgId} role={role} />
          </div>
        </main>
      </div>
    </div>
  );
}