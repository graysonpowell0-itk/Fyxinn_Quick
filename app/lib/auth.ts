import { env } from "cloudflare:workers";

export type Account = {
  id: string;
  name: string;
  phone: string;
  role: "staff" | "maintenance";
};
export function database() {
  return env.DB as D1Database;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}
export async function currentAccount(
  request: Request,
): Promise<Account | null> {
  const token = request.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)fyxinn_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  return database()
    .prepare(
      `SELECT a.id, a.name, a.phone, a.role FROM accounts a
    JOIN account_sessions s ON s.account_id = a.id WHERE s.token = ? AND s.expires_at > ?`,
    )
    .bind(token, Date.now())
    .first<Account>();
}
export function sessionCookie(
  token: string,
  request: Request,
  maxAge = 604800,
) {
  return `fyxinn_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function pinHash(pin: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function equalHash(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
