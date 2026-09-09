import { listIssues } from "../../lib/issues";
import { imageType } from "../../lib/image";
import { env } from "cloudflare:workers";
import { approvedAccount, database, sameOrigin } from "../../lib/auth";

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
export async function GET(request: Request) {
  try {
    if (!(await approvedAccount(request)))
      return json({ error: "Sign in required." }, 401);
    return json({ issues: await listIssues() });
  } catch (error) {
    console.error("Issue load failed", error);
    return json({ error: "Repairs could not be loaded." }, 503);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const uploaded: string[] = [];
  let committed = false;
  const bucket = env.PHOTOS as R2Bucket;
  try {
    const account = await approvedAccount(request);
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
    const account = await approvedAccount(request);
    if (!account) return json({ error: "Sign in required." }, 401);
    let body: {
      id?: string;
      status?: string;
      expectedStatus?: string;
      submissionId?: string;
      note?: string;
    };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid update." }, 400);
    }
    if (!body?.id) return json({ error: "Invalid update." }, 400);
    const db = database();
    const current = await db
      .prepare("SELECT status, latest_submission_id FROM issues WHERE id = ?")
      .bind(body.id)
      .first<{ status: string; latest_submission_id: string | null }>();
    if (!current) return json({ error: "Issue not found." }, 404);
    const admin = account.role === "admin";
    const review = current.status === "awaiting-review";
    if (review && !admin)
      return json(
        { error: "Only the administrator can review a finished repair." },
        403,
      );
    if (!review && !["admin", "maintenance"].includes(account.role))
      return json({ error: "Maintenance access required." }, 403);
    const allowed = review
      ? ["completed", "in-progress"].includes(body.status ?? "")
      : current.status === "unaddressed"
        ? body.status === "in-progress"
        : current.status === "completed" &&
          admin &&
          body.status === "unaddressed";
    if (!allowed || current.status !== body.expectedStatus)
      return json(
        { error: "This action is unavailable. Refresh the ticket." },
        409,
      );
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (
      note.length > 1000 ||
      (review && body.status === "in-progress" && note.length < 3)
    )
      return json({ error: "Explain what needs more work." }, 400);
    if (
      review &&
      (!body.submissionId || body.submissionId !== current.latest_submission_id)
    )
      return json(
        { error: "The repair submission changed. Review it again." },
        409,
      );
    if (review) {
      const evidence = await db
        .prepare(
          "SELECT s.id FROM repair_submissions s WHERE s.id = ? AND s.issue_id = ? AND s.review_status = 'pending' AND length(trim(s.comment)) >= 8 AND (SELECT COUNT(*) FROM repair_photos p WHERE p.submission_id = s.id) = 3",
        )
        .bind(body.submissionId, body.id)
        .first();
      if (!evidence)
        return json(
          {
            error:
              "The repair requires a comment and three photos before review.",
          },
          409,
        );
    }
    const now = new Date().toISOString();
    const conditions =
      "id = ? AND status = ? AND COALESCE(latest_submission_id, '') = ?";
    const match = [body.id, current.status, current.latest_submission_id ?? ""];
    const statements = [];
    if (review)
      statements.push(
        db
          .prepare(
            `UPDATE repair_submissions SET review_status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ? AND review_status = 'pending' AND EXISTS (SELECT 1 FROM issues WHERE ${conditions})`,
          )
          .bind(
            body.status === "completed" ? "approved" : "returned",
            note,
            account.name,
            now,
            body.submissionId,
            ...match,
          ),
      );
    statements.push(
      db
        .prepare(
          `INSERT INTO issue_updates (id, issue_id, status, actor_name, note, created_at) SELECT ?, id, ?, ?, ?, ? FROM issues WHERE ${conditions}`,
        )
        .bind(
          crypto.randomUUID(),
          body.status,
          account.name,
          note,
          now,
          ...match,
        ),
    );
    statements.push(
      db
        .prepare(
          `UPDATE issues SET status = ?, assignee_name = CASE WHEN ? = 'unaddressed' THEN NULL WHEN ? = 'unaddressed' THEN ? ELSE assignee_name END, updated_at = ?, completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END WHERE ${conditions}`,
        )
        .bind(
          body.status,
          body.status,
          current.status,
          account.name,
          now,
          body.status,
          now,
          ...match,
        ),
    );
    const result = await db.batch(statements);
    if (!result.at(-1)?.meta.changes)
      return json(
        { error: "This ticket changed. Refresh and try again." },
        409,
      );
    return json({ issue: (await listIssues(body.id))[0] });
  } catch (error) {
    console.error("Status update failed", error);
    return json({ error: "Status could not be saved." }, 503);
  }
}
