import { createClient } from "@/lib/supabase/client";

export async function uploadAvatar(file: File) {
  const supabase = createClient();

  // 0) usuario logueado
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) throw new Error("No hay sesión. Inicia sesión otra vez.");

  const user = authData.user;

  // 1) path OBLIGATORIO por tus policies:
  //    <user.id>/avatar.ext
  const ext =
    file.type === "image/png" ? "png" :
    file.type === "image/webp" ? "webp" : "jpg";

  const filePath = `${user.id}/avatar.${ext}`;

  // 2) subir a bucket avatars (con upsert para reemplazar)
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (upErr) throw upErr;

  // 3) obtener URL pública
  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const avatarUrl = pub.publicUrl;

  // 4) guardar en profiles.avatar_url
  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (dbErr) throw dbErr;

  return avatarUrl;
}