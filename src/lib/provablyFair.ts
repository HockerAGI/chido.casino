import crypto from "crypto";

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hmacSha256Hex(key: string, message: string) {
  return crypto.createHmac("sha256", key).update(message).digest("hex");
}

export function generateServerSeed(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function serverSeedHash(serverSeed: string) {
  return sha256(serverSeed);
}

/**
 * Convierte HMAC(serverSeed, `${clientSeed}:${nonce}:${round}`) a float [0,1)
 * usando 52 bits (estándar para fairness consistente).
 */
export function fairFloat(serverSeed: string, clientSeed: string, nonce: number, round = 0) {
  const hex = hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:${round}`);
  const slice = hex.slice(0, 13); // 13 hex = 52 bits
  const int = parseInt(slice, 16);
  return int / 2 ** 52;
}

export function fairInt(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  min: number,
  max: number,
  round = 0
) {
  const r = fairFloat(serverSeed, clientSeed, nonce, round);
  return Math.floor(r * (max - min + 1)) + min;
}

export function pickFromArray<T>(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  arr: T[],
  round = 0
) {
  const idx = fairInt(serverSeed, clientSeed, nonce, 0, arr.length - 1, round);
  return arr[idx];
}