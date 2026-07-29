import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VERSION = "stripe-webhook-v2-20260729";
const DEFAULT_TARGET_URL = "https://chido.casino/api/webhooks/stripe";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ ...body, version: VERSION }), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-chido-edge-version": VERSION,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return json({ ok: true, status: "ready", target: Deno.env.get("CHIDO_STRIPE_WEBHOOK_URL") ? "configured" : DEFAULT_TARGET_URL });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ ok: false, error: "MISSING_STRIPE_SIGNATURE" }, 400);
  }

  const targetUrl = Deno.env.get("CHIDO_STRIPE_WEBHOOK_URL") || DEFAULT_TARGET_URL;
  const rawBody = await req.arrayBuffer();
  const headers = new Headers();
  headers.set("content-type", req.headers.get("content-type") || "application/json");
  headers.set("stripe-signature", signature);
  headers.set("x-chido-edge-version", VERSION);

  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: rawBody,
    });

    const responseHeaders = new Headers();
    responseHeaders.set("content-type", upstream.headers.get("content-type") || "application/json");
    responseHeaders.set("cache-control", "no-store");
    responseHeaders.set("x-chido-edge-version", VERSION);

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("STRIPE_WEBHOOK_FORWARD_FAILED", error);
    return json({ ok: false, error: "STRIPE_WEBHOOK_FORWARD_FAILED" }, 502);
  }
});
