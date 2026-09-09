import {
  currentAccount,
  database,
  equalHash,
  pinHash,
  sameOrigin,
  sessionCookie,
  type Account,
} from "../../lib/auth";

const json = (body: unknown, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
export async function GET(request: Request) {
  try {
    return json({ account: await currentAccount(request) });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "invalid" }, 400);
    }
    if (!body || typeof body !== "object")
      return json({ error: "invalid" }, 400);
    const phone = typeof body.phone === "string" ? body.phone : "";
    const pin = typeof body.pin === "string" ? body.pin : "";
    if (!/^\d{10}$/.test(phone) || !/^\d{6}$/.test(pin))
      return json({ error: "invalid" }, 400);
    const db = database();
    const bucket = Math.floor(Date.now() / 900000);
    const attemptKey = `${phone}:${bucket}`;
    const attempts = await db
      .prepare(
        "INSERT INTO login_attempts (id, count) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1 RETURNING count",
      )
      .bind(attemptKey)
      .first<{ count: number }>();
    if ((attempts?.count ?? 0) > 10) return json({ error: "rate_limit" }, 429);
    let account: Account | null = null;
    if (body.action === "register") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (
        name.length < 2 ||
        name.length > 80 ||
        !["staff", "maintenance"].includes(String(body.role))
      )
        return json({ error: "invalid" }, 400);
      if (
        await db
          .prepare("SELECT id FROM accounts WHERE phone = ?")
          .bind(phone)
          .first()
      )
        return json({ error: "duplicate" }, 409);
      const id = crypto.randomUUID();
      const salt = crypto.randomUUID();
      const hash = await pinHash(pin, salt);
      const inserted = await db
        .prepare(
          "INSERT OR IGNORE INTO accounts (id, name, phone, pin_hash, salt, role) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(id, name, phone, hash, salt, body.role)
        .run();
      if (!inserted.meta.changes) return json({ error: "duplicate" }, 409);
      account = { id, name, phone, role: body.role as Account["role"] };
    } else if (body.action === "login") {
      const row = await db
        .prepare("SELECT * FROM accounts WHERE phone = ?")
        .bind(phone)
        .first<Account & { pin_hash: string; salt: string }>();
      const hash = await pinHash(pin, row?.salt ?? "unknown-account");
      if (!row || !equalHash(row.pin_hash, hash))
        return json({ error: "credentials" }, 401);
      account = {
        id: row.id,
        name: row.name,
        phone: row.phone,
        role: row.role,
      };
    } else return json({ error: "invalid" }, 400);
    const token =
      crypto.randomUUID().replaceAll("-", "") +
      crypto.randomUUID().replaceAll("-", "");
    await db.batch([
      db
        .prepare(
          "INSERT INTO account_sessions (token, account_id, expires_at) VALUES (?, ?, ?)",
        )
        .bind(token, account.id, Date.now() + 604800000),
      db
        .prepare("DELETE FROM account_sessions WHERE expires_at < ?")
        .bind(Date.now()),
    ]);
    return json({ account }, 200, {
      "Set-Cookie": sessionCookie(token, request),
    });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const token = request.headers
      .get("Cookie")
      ?.match(/(?:^|;\s*)fyxinn_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (token)
      await database()
        .prepare("DELETE FROM account_sessions WHERE token = ?")
        .bind(token)
        .run();
    return json({ ok: true }, 200, {
      "Set-Cookie": sessionCookie("", request, 0),
    });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}
