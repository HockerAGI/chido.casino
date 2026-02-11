import { createClient } from "@/lib/supabase/client";

export async function uploadAvatar(file: File) {
  const supabase = createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) throw new Error("No autorizado");

  const ext = file.name.split(".").pop() || "png";
  const path = `${user.id}/avatar.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) throw new Error(upErr.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  // cache-bust para que el avatar no se quede pegado en CDN
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  // ✅ TU SCHEMA: profiles.user_id = auth.users.id
  const first = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);

  if (!first.error) return avatarUrl;

  // fallback por si alguien tiene profiles.id (no debería en tu caso, pero no estorba)
  const msg = String(first.error?.message || "");
  if (msg.toLowerCase().includes("column") && msg.toLowerCase().includes("user_id")) {
    const second = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    if (second.error) throw new Error(second.error.message);
    return avatarUrl;
  }

  throw new Error(first.error.message);
}