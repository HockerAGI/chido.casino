"use client";

import { createClient } from "@/lib/supabaseClient";

function extFrom(file: File) {
  const name = (file.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot !== -1) return name.slice(dot + 1).slice(0, 8);
  const t = (file.type || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("webp")) return "webp";
  return "bin";
}

function okType(file: File) {
  const t = (file.type || "").toLowerCase();
  return t.startsWith("image/");
}

export async function uploadAvatar(file: File) {
  const supabase = createClient();

  if (!file) throw new Error("Selecciona una imagen.");
  if (!okType(file)) throw new Error("Formato inválido. Usa imagen (png/jpg/webp).");

  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxBytes) throw new Error("La imagen pesa mucho (máx 5MB).");

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) throw new Error("No hay sesión activa.");

  // Subimos a: avatars/{userId}/avatar.{ext}
  const ext = extFrom(file);
  const path = `${user.id}/avatar.${ext}`;
  const bucket = supabase.storage.from("avatars");

  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await bucket.upload(path, bytes, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (up.error) {
    // Esto normalmente es: bucket no existe / policy / tamaño / etc.
    throw new Error(`No se pudo subir el avatar: ${up.error.message}`);
  }

  const pub = bucket.getPublicUrl(path);
  const publicUrl = pub?.data?.publicUrl;

  if (!publicUrl) throw new Error("No se pudo obtener URL pública del avatar.");

  // Cache-bust para que el usuario vea el cambio al instante
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  // Preferimos user_id; si tu schema usa id, tenemos fallback
  const first = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
  if (first.error) {
    const second = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    if (second.error) throw new Error(`No se pudo guardar avatar en perfil: ${second.error.message}`);
  }

  return { ok: true, avatar_url: avatarUrl };
}