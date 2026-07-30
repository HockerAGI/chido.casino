import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VERSION = "stripe-worker-retired-v2-20260729";

Deno.serve(() => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "STRIPE_SYNC_WORKER_RETIRED",
      replacement: "Stripe deposit settlement is handled by the Chido Casino application webhook.",
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
