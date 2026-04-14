export async function safeJson<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(text?.trim() || "La respuesta no es JSON");
  }

  const text = await res.text().catch(() => "");
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("La respuesta JSON está dañada");
  }
}