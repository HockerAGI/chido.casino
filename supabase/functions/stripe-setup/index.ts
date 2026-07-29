import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VERSION = "stripe-setup-retired-v2-20260729";

Deno.serve(() => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "STRIPE_SYNC_SETUP_RETIRED",
      replacement: "Use the Chido Casino Next.js payment routes and provider webhooks.",
      version: VERSION,
    }),
    {
      status: 410,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-chido-edge-version": VERSION,
      },
    },
  );
});
