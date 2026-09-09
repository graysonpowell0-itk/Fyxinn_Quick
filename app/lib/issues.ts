import { database } from "./auth";
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
  latest_submission_id: string | null;
};
export async function listIssues(id?: string) {
  const db = database();
  const rows = await db
    .prepare(
      `SELECT * FROM issues ${id ? "WHERE id = ?" : ""} ORDER BY updated_at DESC, id DESC`,
    )
    .bind(...(id ? [id] : []))
    .all<Row>();
  const [photos, updates, submissions, repairPhotos] = await Promise.all([
    db
      .prepare(
        `SELECT issue_id, object_key FROM issue_photos ${id ? "WHERE issue_id = ?" : ""} ORDER BY object_key`,
      )
      .bind(...(id ? [id] : []))
      .all<{ issue_id: string; object_key: string }>(),
    db
      .prepare(
        `SELECT issue_id, status, actor_name, note, created_at FROM issue_updates ${id ? "WHERE issue_id = ?" : ""} ORDER BY created_at, rowid`,
      )
      .bind(...(id ? [id] : []))
      .all<{
        issue_id: string;
        status: string;
        note: string;
        actor_name: string;
        created_at: string;
      }>(),
    db
      .prepare(
        `SELECT * FROM repair_submissions ${id ? "WHERE issue_id = ?" : ""} ORDER BY submitted_at DESC, rowid DESC`,
      )
      .bind(...(id ? [id] : []))
      .all<{
        id: string;
        issue_id: string;
        comment: string;
        submitted_by: string;
        submitted_at: string;
        review_status: string;
        review_note: string | null;
        reviewed_by: string | null;
        reviewed_at: string | null;
      }>(),
    db
      .prepare(
        `SELECT p.submission_id, p.object_key FROM repair_photos p JOIN repair_submissions s ON s.id = p.submission_id ${id ? "WHERE s.issue_id = ?" : ""} ORDER BY p.object_key`,
      )
      .bind(...(id ? [id] : []))
      .all<{ submission_id: string; object_key: string }>(),
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
    latestSubmissionId: row.latest_submission_id,
    repairs: submissions.results
      .filter((s) => s.issue_id === row.id)
      .map((s) => ({
        id: s.id,
        comment: s.comment,
        submittedBy: s.submitted_by,
        submittedAt: s.submitted_at,
        reviewStatus: s.review_status,
        reviewNote: s.review_note,
        reviewedBy: s.reviewed_by,
        reviewedAt: s.reviewed_at,
        photos: repairPhotos.results
          .filter((p) => p.submission_id === s.id)
          .map((p) => `/api/photos?key=${encodeURIComponent(p.object_key)}`),
      })),
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
        note: update.note,
        createdAt: update.created_at,
      })),
  }));
}
