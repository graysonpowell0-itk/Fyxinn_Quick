import { env as workerEnv } from "cloudflare:workers";

type Status = "unaddressed" | "in-progress" | "completed";

interface PreparedStatement {
  bind: (...values: unknown[]) => PreparedStatement;
  run: () => Promise<unknown>;
  all: <T>() => Promise<{ results: T[] }>;
}

interface Database {
  prepare: (query: string) => PreparedStatement;
  batch: (statements: PreparedStatement[]) => Promise<unknown>;
}

interface Bucket {
  put: (
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
}

interface RuntimeEnv {
  DB: Database;
  PHOTOS: Bucket;
}

type IssueRow = {
  id: string;
  location: string;
  location_type: string;
  category: string;
  description: string;
  status: Status;
  reporter_name: string;
  reporter_phone: string;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  photo_keys: string | null;
};

const seedIssues = [
  {
    id: "FXQ-1048",
    location: "108",
    category: "Plumbing",
    description: "Bathroom faucet is leaking steadily at the base.",
    status: "unaddressed",
    reporterName: "Maria S.",
    reporterPhone: "4045550146",
    assigneeName: null,
    createdAt: "2026-09-09T12:14:00.000Z",
  },
  {
    id: "FXQ-1047",
    location: "114",
    category: "HVAC",
    description: "Air conditioner turns on but is not cooling the room.",
    status: "in-progress",
    reporterName: "Elena R.",
    reporterPhone: "4045550118",
    assigneeName: "Marcus T.",
    createdAt: "2026-09-09T11:38:00.000Z",
  },
  {
    id: "FXQ-1044",
    location: "123",
    category: "Electrical",
    description: "Bedside lamp outlet is not working.",
    status: "completed",
    reporterName: "James K.",
    reporterPhone: "4045550161",
    assigneeName: "Marcus T.",
    createdAt: "2026-09-08T16:21:00.000Z",
  },
  {
    id: "FXQ-1046",
    location: "207",
    category: "Furniture",
    description: "Desk chair arm is loose and needs to be tightened.",
    status: "unaddressed",
    reporterName: "Ana P.",
    reporterPhone: "4045550129",
    assigneeName: null,
    createdAt: "2026-09-09T10:55:00.000Z",
  },
  {
    id: "FXQ-1045",
    location: "218",
    category: "Plumbing",
    description: "Shower is draining slowly after use.",
    status: "in-progress",
    reporterName: "Maria S.",
    reporterPhone: "4045550146",
    assigneeName: "David L.",
    createdAt: "2026-09-09T09:42:00.000Z",
  },
  {
    id: "FXQ-1042",
    location: "229",
    category: "Appliance",
    description: "Mini refrigerator was not cooling; thermostat replaced.",
    status: "completed",
    reporterName: "Elena R.",
    reporterPhone: "4045550118",
    assigneeName: "David L.",
    createdAt: "2026-09-08T13:05:00.000Z",
  },
  {
    id: "FXQ-1043",
    location: "North Lobby",
    category: "Lighting",
    description: "Two ceiling lights near the elevators are flickering.",
    status: "unaddressed",
    reporterName: "James K.",
    reporterPhone: "4045550161",
    assigneeName: null,
    createdAt: "2026-09-09T08:27:00.000Z",
  },
] as const;

async function initialize(db: Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      location TEXT NOT NULL,
      location_type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unaddressed',
      reporter_name TEXT NOT NULL,
      reporter_phone TEXT NOT NULL,
      assignee_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS issue_photos (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      object_key TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS issue_updates (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_issues_location_updated ON issues(location, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_issues_open_status ON issues(status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_issue_photos_issue_id ON issue_photos(issue_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_issue_updates_issue_id ON issue_updates(issue_id)"),
  ]);

  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM issues")
    .all<{ count: number }>();
  if (Number(count.results[0]?.count ?? 0) > 0) return;

  await db.batch(
    seedIssues.flatMap((issue) => {
      const locationType = /^\d{3}$/.test(issue.location) ? "room" : "common";
      return [
        db
          .prepare(
            `INSERT INTO issues (
              id, location, location_type, category, description, status,
              reporter_name, reporter_phone, assignee_name, created_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            issue.id,
            issue.location,
            locationType,
            issue.category,
            issue.description,
            issue.status,
            issue.reporterName,
            issue.reporterPhone,
            issue.assigneeName,
            issue.createdAt,
            issue.createdAt,
            issue.status === "completed" ? issue.createdAt : null,
          ),
        db
          .prepare(
            "INSERT INTO issue_updates (id, issue_id, status, actor_name, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            issue.id,
            issue.status,
            issue.status === "unaddressed"
              ? issue.reporterName
              : issue.assigneeName ?? issue.reporterName,
            issue.status === "completed"
              ? "Repair completed and room checked."
              : issue.status === "in-progress"
                ? "Repair accepted by maintenance."
                : "Issue reported with three photos.",
            issue.createdAt,
          ),
      ];
    }),
  );
}

function serialize(row: IssueRow) {
  return {
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
    photos: row.photo_keys
      ? row.photo_keys.split(",").map((key) => `/api/photos?key=${encodeURIComponent(key)}`)
      : [],
  };
}

export async function GET() {
  const { DB } = workerEnv as unknown as RuntimeEnv;
  await initialize(DB);
  const rows = await DB.prepare(
    `SELECT issues.*, GROUP_CONCAT(issue_photos.object_key) AS photo_keys
     FROM issues
     LEFT JOIN issue_photos ON issue_photos.issue_id = issues.id
     GROUP BY issues.id
     ORDER BY issues.updated_at DESC`,
  ).all<IssueRow>();
  return Response.json({ issues: rows.results.map(serialize) });
}

export async function POST(request: Request) {
  const { DB, PHOTOS } = workerEnv as unknown as RuntimeEnv;
  await initialize(DB);
  const form = await request.formData();
  const photos = form.getAll("photos").filter((item): item is File => item instanceof File);
  if (photos.length !== 3) {
    return Response.json({ error: "Exactly three photos are required." }, { status: 400 });
  }

  const location = String(form.get("location") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const reporterName = String(form.get("reporterName") ?? "").trim();
  const reporterPhone = String(form.get("reporterPhone") ?? "").replace(/\D/g, "");
  if (!location || !category || description.length < 8 || !reporterName || reporterPhone.length < 10) {
    return Response.json({ error: "Please complete every required field." }, { status: 400 });
  }

  const id = `FXQ-${String(Date.now()).slice(-6)}`;
  const now = new Date().toISOString();
  const photoStatements: PreparedStatement[] = [];
  for (const [index, photo] of photos.entries()) {
    const extension = photo.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
    const key = `issues/${id}/${index + 1}-${crypto.randomUUID()}.${extension}`;
    await PHOTOS.put(key, await photo.arrayBuffer(), {
      httpMetadata: { contentType: photo.type || "image/jpeg" },
    });
    photoStatements.push(
      DB.prepare(
        "INSERT INTO issue_photos (id, issue_id, object_key, file_name, content_type) VALUES (?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), id, key, photo.name, photo.type || "image/jpeg"),
    );
  }

  await DB.batch([
    DB.prepare(
      `INSERT INTO issues (
        id, location, location_type, category, description, status, reporter_name,
        reporter_phone, assignee_name, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, 'unaddressed', ?, ?, NULL, ?, ?, NULL)`,
    ).bind(
      id,
      location,
      /^\d{3}$/.test(location) ? "room" : "common",
      category,
      description,
      reporterName,
      reporterPhone,
      now,
      now,
    ),
    DB.prepare(
      "INSERT INTO issue_updates (id, issue_id, status, actor_name, note, created_at) VALUES (?, ?, 'unaddressed', ?, ?, ?)",
    ).bind(crypto.randomUUID(), id, reporterName, "Issue reported with three photos.", now),
    ...photoStatements,
  ]);

  return Response.json({ id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { DB } = workerEnv as unknown as RuntimeEnv;
  await initialize(DB);
  const body = (await request.json()) as {
    id?: string;
    status?: Status;
    actorName?: string;
    note?: string;
  };
  if (!body.id || !body.actorName || !["unaddressed", "in-progress", "completed"].includes(body.status ?? "")) {
    return Response.json({ error: "Invalid status update." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const status = body.status as Status;
  await DB.batch([
    DB.prepare(
      "UPDATE issues SET status = ?, assignee_name = CASE WHEN ? = 'in-progress' THEN ? ELSE assignee_name END, updated_at = ?, completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END WHERE id = ?",
    ).bind(status, status, body.actorName, now, status, now, body.id),
    DB.prepare(
      "INSERT INTO issue_updates (id, issue_id, status, actor_name, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(
      crypto.randomUUID(),
      body.id,
      status,
      body.actorName,
      body.note ?? (status === "completed" ? "Repair completed." : "Repair is now in progress."),
      now,
    ),
  ]);
  return Response.json({ ok: true });
}
