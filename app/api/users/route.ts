import { approvedAccount, database, sameOrigin } from "../../lib/auth";
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  try {
    if ((await approvedAccount(request))?.role !== "admin")
      return json({ error: "Administrator access required." }, 403);
    const users = await database()
      .prepare(
        "SELECT id, name, phone, role, approval_status AS approvalStatus FROM accounts WHERE role <> 'admin' ORDER BY CASE approval_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, name",
      )
      .all();
    return json({ users: users.results });
  } catch {
    return json({ error: "Users could not be loaded." }, 503);
  }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);
  try {
    if ((await approvedAccount(request))?.role !== "admin")
      return json({ error: "Administrator access required." }, 403);
    let body: { id?: string; action?: string; expectedStatus?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    if (
      !body?.id ||
      !["approve", "remove", "restore"].includes(body.action ?? "")
    )
      return json({ error: "Invalid request." }, 400);
    const db = database();
    const user = await db
      .prepare("SELECT role, approval_status FROM accounts WHERE id = ?")
      .bind(body.id)
      .first<{ role: string; approval_status: string }>();
    if (!user) return json({ error: "User not found." }, 404);
    if (user.role === "admin" || body.id === "site-owner")
      return json({ error: "The site owner cannot be removed." }, 403);
    if (user.approval_status !== body.expectedStatus)
      return json({ error: "User changed. Refresh and try again." }, 409);
    const allowed =
      body.action === "approve"
        ? user.approval_status === "pending"
        : body.action === "restore"
          ? user.approval_status === "removed"
          : user.approval_status !== "removed";
    if (!allowed) return json({ error: "Invalid user action." }, 409);
    const next = body.action === "remove" ? "removed" : "approved";
    const results = await db.batch([
      db
        .prepare(
          "UPDATE accounts SET approval_status = ? WHERE id = ? AND approval_status = ?",
        )
        .bind(next, body.id, body.expectedStatus),
      // Removal revokes all existing devices; restoration requires a fresh sign-in.
      db
        .prepare(
          "DELETE FROM account_sessions WHERE account_id = ? AND EXISTS (SELECT 1 FROM accounts WHERE id = ? AND approval_status = 'removed')",
        )
        .bind(body.id, body.id),
    ]);
    if (!results[0].meta.changes)
      return json({ error: "User changed. Refresh and try again." }, 409);
    return json({ ok: true });
  } catch {
    return json({ error: "User could not be updated." }, 503);
  }
}
