import { env } from "cloudflare:workers";
import { currentAccount, database, sameOrigin } from "../../lib/auth";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const locations = new Set([
  ...Array.from({ length: 28 }, (_, i) => String(100 + i)),
  ...Array.from({ length: 34 }, (_, i) => String(200 + i)),
  "North Lobby",
  "South Lobby",
  "Pool",
  "Fitness Room",
  "Laundry",
  "Parking Lot",
]);
const categories = new Set([
  "Plumbing",
  "HVAC",
  "Electrical",
  "Furniture",
  "Appliance",
  "Lighting",
  "Safety",
  "Other",
]);
type Row = {
  id: string;
  location: string;
  location_type: string;
  category: string;
  description: string;
  status: string;
  reporter_name: string;
  reporter_phone: string;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};
async function listIssues(id?: string) {
  const db = database();
  const rows = await db
    .prepare(
      `SELECT * FROM issues ${id ? "WHERE id = ?" : ""} ORDER BY updated_at DESC, id DESC`,
    )
    .bind(...(id ? [id] : []))
    .all<Row>();
  const [photos, updates] = await Promise.all([
    db
      .prepare(
        `SELECT issue_id, object_key FROM issue_photos ${id ? "WHERE issue_id = ?" : ""} ORDER BY object_key`,
      )
      .bind(...(id ? [id] : []))
      .all<{ issue_id: string; object_key: string }>(),
    db
      .prepare(
        `SELECT issue_id, status, actor_name, created_at FROM issue_updates ${id ? "WHERE issue_id = ?" : ""} ORDER BY created_at, rowid`,
      )
      .bind(...(id ? [id] : []))
      .all<{
        issue_id: string;
        status: string;
        actor_name: string;
        created_at: string;
      }>(),
  ]);
  return rows.results.map((row) => ({
    id: row.id,
    location: row.location,
    locationType: row.location_type,
    category: row.category,
    description: row.description,
    status: row.status,
    reporterName: row.reporter_name,
    reporterPhone: row.reporter_phone,
    assigneeName: row.assignee_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    photos: photos.results
      .filter((photo) => photo.issue_id === row.id)
      .map(
        (photo) => `/api/photos?key=${encodeURIComponent(photo.object_key)}`,
      ),
    updates: updates.results
      .filter((update) => update.issue_id === row.id)
      .map((update) => ({
        status: update.status,
        actorName: update.actor_name,
        createdAt: update.created_at,
      })),
  }));
}
export async function GET(request: Request) {
  try {
    if (!(await currentAccount(request)))
      return json({ error: "Sign in required." }, 401);
    return json({ issues: await listIssues() });
  } catch (error) {
    console.error("Issue load failed", error);
    return json({ error: "Repairs could not be loaded." }, 503);
  }
}
async function imageType(photo: File) {
  const b = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v))
    return "image/png";
  if (
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const uploaded: string[] = [];
  let committed = false;
  const bucket = env.PHOTOS as R2Bucket;
  try {
    const account = await currentAccount(request);
    if (!account) return json({ error: "Sign in required." }, 401);
    if (Number(request.headers.get("Content-Length") ?? 0) > 26000000)
      return json({ error: "Photos are too large." }, 413);
    const form = await request.formData();
    const requestId = String(form.get("requestId") ?? "");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestId,
      )
    )
      return json({ error: "Invalid report." }, 400);
    const id = `FXQ-${requestId}`;
    const existing = await listIssues(id);
    if (existing.length) return json({ issue: existing[0] }, 200);
    const photos = form
      .getAll("photos")
      .filter((item): item is File => item instanceof File);
    if (photos.length !== 3)
      return json({ error: "Exactly three photos are required." }, 400);
    if (photos.some((photo) => !photo.size || photo.size > 8000000))
      return json({ error: "Each photo must be under 8 MB." }, 400);
    const types = await Promise.all(photos.map(imageType));
    if (types.some((type) => !type))
      return json({ error: "Use JPEG, PNG, or WebP photos." }, 400);
    const location = String(form.get("location") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (
      !locations.has(location) ||
      !categories.has(category) ||
      description.length < 8 ||
      description.length > 240
    )
      return json({ error: "Please complete every required field." }, 400);
    const now = new Date().toISOString();
    const db = database();
    const statements = [];
    for (const [index, photo] of photos.entries()) {
      const key = `issues/${id}/${index + 1}-${crypto.randomUUID()}`;
      await bucket.put(key, await photo.arrayBuffer(), {
        httpMetadata: { contentType: types[index]! },
      });
      uploaded.push(key);
      statements.push(
        db
          .prepare(
            "INSERT INTO issue_photos (id, issue_id, object_key, file_name, content_type) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            key,
            photo.name.slice(0, 200),
            types[index],
          ),
      );
    }
    await db.batch([
      db
        .prepare(
          "INSERT INTO issues (id, location, location_type, category, description, status, reporter_name, reporter_phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'unaddressed', ?, ?, ?, ?)",
        )
        .bind(
          id,
          location,
          /^\d{3}$/.test(location) ? "room" : "common",
          category,
          description,
          account.name,
          account.phone,
          now,
          now,
        ),
      db
        .prepare(
          "INSERT INTO issue_updates (id, issue_id, status, actor_name, note, created_at) VALUES (?, ?, 'unaddressed', ?, '', ?)",
        )
        .bind(crypto.randomUUID(), id, account.name, now),
      ...statements,
    ]);
    committed = true;
    return json({ issue: (await listIssues(id))[0] }, 201);
  } catch (error) {
    if (!committed && uploaded.length)
      await bucket.delete(uploaded).catch(() => undefined);
    console.error("Report save failed", error);
    return json({ error: "Report could not be saved. Please retry." }, 503);
  }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);
  try {
    const account = await currentAccount(request);
    if (!account) return json({ error: "Sign in required." }, 401);
    if (account.role !== "maintenance")
      return json({ error: "Maintenance access required." }, 403);
    let body: { id?: string; status?: string; expectedStatus?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid update." }, 400);
    }
    if (
      !body.id ||
      !["unaddressed", "in-progress", "completed"].includes(body.status ?? "")
    )
      return json({ error: "Invalid update." }, 400);
    const db = database();
    const current = await db
      .prepare("SELECT status FROM issues WHERE id = ?")
      .bind(body.id)
      .first<{ status: string }>();
    if (!current) return json({ error: "Issue not found." }, 404);
    const transitions: Record<string, string> = {
      unaddressed: "in-progress",
      "in-progress": "completed",
      completed: "unaddressed",
    };
    if (
      current.status !== body.expectedStatus ||
      transitions[current.status] !== body.status
    )
      return json(
        { error: "This repair changed. Refresh and try again." },
        409,
      );
    const now = new Date().toISOString();
    const result = await db.batch([
      db
        .prepare(
          "INSERT INTO issue_updates (id, issue_id, status, actor_name, note, created_at) SELECT ?, id, ?, ?, '', ? FROM issues WHERE id = ? AND status = ?",
        )
        .bind(
          crypto.randomUUID(),
          body.status,
          account.name,
          now,
          body.id,
          current.status,
        ),
      db
        .prepare(
          "UPDATE issues SET status = ?, assignee_name = CASE WHEN ? = 'unaddressed' THEN NULL WHEN ? = 'in-progress' THEN ? ELSE assignee_name END, updated_at = ?, completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END WHERE id = ? AND status = ?",
        )
        .bind(
          body.status,
          body.status,
          body.status,
          account.name,
          now,
          body.status,
          now,
          body.id,
          current.status,
        ),
    ]);
    if (!result[1].meta.changes)
      return json(
        { error: "This repair changed. Refresh and try again." },
        409,
      );
    return json({ issue: (await listIssues(body.id))[0] });
  } catch (error) {
    console.error("Status update failed", error);
    return json({ error: "Status could not be saved." }, 503);
  }
}
