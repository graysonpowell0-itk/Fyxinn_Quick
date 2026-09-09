import { env } from "cloudflare:workers";
import { approvedAccount, database, sameOrigin } from "../../lib/auth";
import { listIssues } from "../../lib/issues";
import { imageType } from "../../lib/image";
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const bucket = env.PHOTOS as R2Bucket;
  const uploaded: string[] = [];
  let committed = false;
  try {
    const account = await approvedAccount(request);
    if (!account) return json({ error: "Sign in required." }, 401);
    if (account.role !== "maintenance")
      return json(
        { error: "Only maintenance can submit a finished repair." },
        403,
      );
    if (Number(request.headers.get("Content-Length") ?? 0) > 26000000)
      return json({ error: "Photos are too large." }, 413);
    const form = await request.formData();
    const id = String(form.get("requestId") ?? "");
    const issueId = String(form.get("issueId") ?? "");
    const expectedUpdatedAt = String(form.get("expectedUpdatedAt") ?? "");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ) ||
      !issueId
    )
      return json({ error: "Invalid repair." }, 400);
    const db = database();
    const previous = await db
      .prepare("SELECT issue_id FROM repair_submissions WHERE id = ?")
      .bind(id)
      .first<{ issue_id: string }>();
    if (previous)
      return previous.issue_id === issueId
        ? json({ issue: (await listIssues(issueId))[0] })
        : json({ error: "Invalid repair." }, 409);
    const issue = await db
      .prepare("SELECT status, updated_at FROM issues WHERE id = ?")
      .bind(issueId)
      .first<{ status: string; updated_at: string }>();
    if (!issue) return json({ error: "Ticket not found." }, 404);
    if (
      issue.status !== "in-progress" ||
      issue.updated_at !== expectedUpdatedAt
    )
      return json(
        { error: "This ticket changed. Reopen it before submitting." },
        409,
      );
    const comment = String(form.get("comment") ?? "").trim();
    const photos = form
      .getAll("photos")
      .filter((file): file is File => file instanceof File);
    if (comment.length < 8 || comment.length > 1000 || photos.length !== 3)
      return json(
        { error: "Add a repair comment and exactly three photos." },
        400,
      );
    if (photos.some((p) => !p.size || p.size > 8000000))
      return json({ error: "Each photo must be under 8 MB." }, 400);
    const types = await Promise.all(photos.map(imageType));
    if (types.some((type) => !type))
      return json({ error: "Use JPEG, PNG, or WebP photos." }, 400);
    for (const [index, photo] of photos.entries()) {
      const key = `issues/${issueId}/repairs/${id}/${index + 1}-${crypto.randomUUID()}`;
      await bucket.put(key, await photo.arrayBuffer(), {
        httpMetadata: { contentType: types[index]! },
      });
      uploaded.push(key);
    }
    const now = new Date().toISOString();
    const result = await db.batch([
      db
        .prepare(
          "INSERT INTO repair_submissions (id, issue_id, comment, submitted_by, submitted_at, review_status) SELECT ?, id, ?, ?, ?, 'pending' FROM issues WHERE id = ? AND status = 'in-progress' AND updated_at = ?",
        )
        .bind(id, comment, account.name, now, issueId, expectedUpdatedAt),
      ...uploaded.map((key) =>
        db
          .prepare(
            "INSERT INTO repair_photos (id, submission_id, object_key) SELECT ?, id, ? FROM repair_submissions WHERE id = ?",
          )
          .bind(crypto.randomUUID(), key, id),
      ),
      db
        .prepare(
          "INSERT INTO issue_updates (id, issue_id, status, actor_name, note, created_at) SELECT ?, issue_id, 'awaiting-review', ?, ?, ? FROM repair_submissions WHERE id = ?",
        )
        .bind(crypto.randomUUID(), account.name, comment, now, id),
      db
        .prepare(
          "UPDATE issues SET status = 'awaiting-review', latest_submission_id = ?, updated_at = ?, completed_at = NULL WHERE id = ? AND status = 'in-progress' AND updated_at = ? AND EXISTS (SELECT 1 FROM repair_submissions WHERE id = ?)",
        )
        .bind(id, now, issueId, expectedUpdatedAt, id),
    ]);
    if (!result.at(-1)?.meta.changes) {
      await bucket.delete(uploaded);
      return json(
        { error: "This ticket changed. Reopen it before submitting." },
        409,
      );
    }
    committed = true;
    return json({ issue: (await listIssues(issueId))[0] }, 201);
  } catch (error) {
    if (!committed && uploaded.length)
      await bucket.delete(uploaded).catch(() => undefined);
    console.error("Repair submission failed", error);
    return json(
      { error: "The repair was not submitted. Your draft can be retried." },
      503,
    );
  }
}
