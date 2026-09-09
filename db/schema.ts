import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const issues = sqliteTable(
  "issues",
  {
    id: text("id").primaryKey(),
    location: text("location").notNull(),
    locationType: text("location_type").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("unaddressed"),
    reporterName: text("reporter_name").notNull(),
    reporterPhone: text("reporter_phone").notNull(),
    assigneeName: text("assignee_name"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("idx_issues_location_updated").on(table.location, table.updatedAt),
    index("idx_issues_open_status").on(table.status),
  ],
);

export const issuePhotos = sqliteTable(
  "issue_photos",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
  },
  (table) => [index("idx_issue_photos_issue_id").on(table.issueId)],
);

export const issueUpdates = sqliteTable(
  "issue_updates",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    actorName: text("actor_name").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_issue_updates_issue_id").on(table.issueId)],
);

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  salt: text("salt").notNull(),
  role: text("role").notNull(),
});
export const accountSessions = sqliteTable("account_sessions", {
  token: text("token").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});
export const loginAttempts = sqliteTable("login_attempts", {
  id: text("id").primaryKey(),
  count: integer("count").notNull(),
});
