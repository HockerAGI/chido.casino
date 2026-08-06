const IDEMPOTENCY_GUARD = Symbol.for("chido.game-idempotency-fetch-guard");
const GAME_POST_PATHS = new Set([
  "/api/games/taco-slot/spin",
  "/api/games/crash/play",
]);

type GuardedGlobal = typeof globalThis & {
  [IDEMPOTENCY_GUARD]?: boolean;
};

function requestPath(input: RequestInfo | URL) {
  const raw = input instanceof Request ? input.url : String(input);
  try {
    return new URL(raw, window.location.origin).pathname;
  } catch {
    return "";
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  return String(
    init?.method || (input instanceof Request ? input.method : "GET")
  ).toUpperCase();
}

function mergedHeaders(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  const initHeaders = new Headers(init?.headers);
  initHeaders.forEach((value, key) => headers.set(key, value));
  return headers;
}

const guardedGlobal = globalThis as GuardedGlobal;

if (!guardedGlobal[IDEMPOTENCY_GUARD]) {
  guardedGlobal[IDEMPOTENCY_GUARD] = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (
      requestMethod(input, init) !== "POST" ||
      !GAME_POST_PATHS.has(requestPath(input))
    ) {
      return originalFetch(input, init);
    }

    const headers = mergedHeaders(input, init);
    if (!headers.has("idempotency-key")) {
      headers.set("idempotency-key", crypto.randomUUID());
    }

    if (input instanceof Request) {
      return originalFetch(new Request(input, { ...init, headers }));
    }

    return originalFetch(input, { ...init, headers });
  };
}
