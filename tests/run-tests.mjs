import { pbkdf2Sync } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.TEST_BASE_URL || "http://localhost:3199";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Use a disposable local database for tests.");
let server;
let createdEnv = false;
try {
  if (!process.env.TEST_BASE_URL) {
    if (!existsSync(".dev.vars")) {
      writeFileSync(
        ".dev.vars",
        `ADMIN_EMAIL=owner@fyxinn.test\nADMIN_PHONE=5550100999\nADMIN_PASSWORD_SALT=qa-admin-password-salt\nADMIN_PASSWORD_HASH=${pbkdf2Sync("QA#Owner2026", "qa-admin-password-salt", 100000, 32, "sha256").toString("hex")}\n`,
        {
          mode: 0o600,
        },
      );
      createdEnv = true;
    }
    const migration = spawnSync(
      "npx",
      ["wrangler", "d1", "migrations", "apply", "site-creator-d1", "--local"],
      { stdio: "inherit" },
    );
    if (migration.status !== 0) throw new Error("Local migrations failed.");
    server = spawn(
      "npm",
      ["run", "dev", "--", "--port", "3199", "--strictPort"],
      { stdio: "inherit", detached: process.platform !== "win32" },
    );
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch(base);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Server is starting. */
      }
      if (server.exitCode !== null)
        throw new Error("Test server exited before it was ready.");
      await delay(500);
    }
    if (!ready) throw new Error("Test server did not become ready.");
  }
  const result = spawnSync(
    process.execPath,
    ["--test", "tests/rendered-html.test.mjs"],
    { stdio: "inherit", env: { ...process.env, TEST_BASE_URL: base } },
  );
  process.exitCode = result.status ?? 1;
} finally {
  if (createdEnv) unlinkSync(".dev.vars");
  if (server?.pid) {
    try {
      if (process.platform === "win32") server.kill();
      else process.kill(-server.pid, "SIGTERM");
    } catch {
      /* Server already stopped. */
    }
  }
}
