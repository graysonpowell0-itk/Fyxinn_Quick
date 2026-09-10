import assert from "node:assert/strict";
import test from "node:test";
const base = process.env.TEST_BASE_URL;
if (!base || !["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Tests require a disposable local server.");
const admin = {
  headers: {
    "oai-authenticated-user-id": "qa-owner",
    "oai-authenticated-user-email": "owner@fyxinn.test",
  },
};
const request = (path, options = {}, actor = {}) =>
  fetch(`${base}${path}`, {
    ...options,
    headers: { ...actor.headers, ...options.headers },
  });
const json = (body, method = "POST") => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
async function expect(response, status) {
  assert.equal(response.status, status, await response.clone().text());
  return response.headers.get("content-type")?.includes("application/json")
    ? response.json()
    : response.text();
}
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY3sAAAAASUVORK5CYII=",
  "base64",
);
function photos(form, count = 3, valid = true) {
  for (let i = 0; i < count; i++)
    form.append(
      "photos",
      new Blob([valid ? png : '<svg onload="alert(1)"/>'], {
        type: "image/png",
      }),
      `photo-${i}.png`,
    );
  return form;
}
test("sign-in screen renders", async () => {
  const r = await fetch(base);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Fyxinn Quick/);
  assert.match(html, /Sign in/);
  assert.match(html, /Site owner \/ admin sign in/);
});
test("approval, revocation, repair evidence, administrator review, and history", async () => {
  const suffix = String(Date.now()).slice(-6);
  async function account(role, n) {
    const body = {
      action: "register",
      name: `QA ${role}`,
      phone: `555${suffix}${n}`,
      pin: "839271",
      role,
    };
    const r = await request("/api/auth", json(body));
    const data = await expect(r, 200);
    assert.equal(data.account.approvalStatus, "pending");
    assert.match(r.headers.get("set-cookie"), /HttpOnly/);
    return {
      body,
      id: data.account.id,
      headers: { Cookie: r.headers.get("set-cookie").split(";")[0] },
    };
  }
  const staff = await account("staff", 1),
    tech = await account("maintenance", 2);
  assert.equal(
    (await expect(await request("/api/auth", {}, admin), 200)).account?.role,
    "admin",
    "Owner environment must be configured to owner@fyxinn.test locally.",
  );
  await expect(
    await request(
      "/api/users",
      {},
      {
        headers: {
          "oai-authenticated-user-id": "qa-other",
          "oai-authenticated-user-email": "other@fyxinn.test",
        },
      },
    ),
    403,
  );
  await expect(
    await request(
      "/api/auth",
      json({ ...staff.body, phone: `555${suffix}3`, role: "admin" }),
    ),
    400,
  );
  for (const actor of [{}, staff, tech]) {
    await expect(await request("/api/issues", {}, actor), 401);
    await expect(await request("/api/photos?key=issues/test", {}, actor), 401);
    await expect(await request("/api/issues", json({}), actor), 401);
    await expect(await request("/api/repairs", json({}), actor), 401);
    await expect(await request("/api/users", {}, actor), 403);
  }
  const userAction = (actor, action, expectedStatus, who = admin) =>
    request(
      "/api/users",
      json({ id: actor.id, action, expectedStatus }, "PATCH"),
      who,
    );
  await expect(await userAction(staff, "approve", "pending", staff), 403);
  await expect(await userAction(staff, "approve", "pending"), 200);
  await expect(await userAction(tech, "approve", "pending"), 200);
  await expect(await userAction(staff, "approve", "pending"), 409);
  assert.equal(
    (await expect(await request("/api/auth", {}, staff), 200)).account
      .approvalStatus,
    "approved",
  );
  await expect(await request("/api/auth", json(staff.body)), 409);
  await expect(
    await request(
      "/api/auth",
      json({ ...staff.body, action: "login", pin: "000000" }),
    ),
    401,
  );
  const reportId = crypto.randomUUID();
  const report = (count = 3, valid = true) => {
    const f = new FormData();
    f.set("requestId", reportId);
    f.set("location", "108");
    f.set("category", "Plumbing");
    f.set("description", "QA sink repair and approval check");
    f.set("reporterName", "Spoofed");
    return photos(f, count, valid);
  };
  await expect(
    await request("/api/issues", { method: "POST", body: report(2) }, staff),
    400,
  );
  await expect(
    await request(
      "/api/issues",
      { method: "POST", body: report(3, false) },
      staff,
    ),
    400,
  );
  let issue = (
    await expect(
      await request("/api/issues", { method: "POST", body: report() }, staff),
      201,
    )
  ).issue;
  assert.equal(issue.reporterName, "QA staff");
  assert.equal(issue.photos.length, 3);
  await expect(
    await request("/api/issues", { method: "POST", body: report() }, staff),
    200,
  );
  const photo = await request(issue.photos[0], {}, staff);
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get("content-type"), "image/png");
  assert.match(photo.headers.get("cache-control"), /no-store/);
  const patch = (status, expectedStatus, extra = {}) =>
    json({ id: issue.id, status, expectedStatus, ...extra }, "PATCH");
  await expect(
    await request("/api/issues", patch("in-progress", "unaddressed"), staff),
    403,
  );
  await expect(
    await request("/api/issues", patch("completed", "unaddressed"), tech),
    409,
  );
  await expect(
    await request(
      "/api/issues",
      {
        ...patch("in-progress", "unaddressed"),
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.test",
        },
      },
      tech,
    ),
    403,
  );
  issue = (
    await expect(
      await request("/api/issues", patch("in-progress", "unaddressed"), tech),
      200,
    )
  ).issue;
  assert.equal(issue.assigneeName, "QA maintenance");
  await expect(
    await request("/api/issues", patch("in-progress", "unaddressed"), tech),
    409,
  );
  await expect(
    await request("/api/issues", patch("completed", "in-progress"), tech),
    409,
  );
  await expect(
    await request("/api/issues", patch("completed", "in-progress"), admin),
    409,
  );
  let submissionId = crypto.randomUUID();
  const repair = (
    count = 3,
    comment = "Replaced the washer and verified no leaks.",
    valid = true,
    updatedAt = issue.updatedAt,
  ) => {
    const f = new FormData();
    f.set("requestId", submissionId);
    f.set("issueId", issue.id);
    f.set("expectedUpdatedAt", updatedAt);
    f.set("comment", comment);
    return photos(f, count, valid);
  };
  await expect(
    await request("/api/repairs", { method: "POST", body: repair() }, staff),
    403,
  );
  await expect(
    await request("/api/repairs", { method: "POST", body: repair(2) }, tech),
    400,
  );
  await expect(
    await request(
      "/api/repairs",
      { method: "POST", body: repair(3, "short") },
      tech,
    ),
    400,
  );
  await expect(
    await request(
      "/api/repairs",
      { method: "POST", body: repair(3, "Repaired and tested.", false) },
      tech,
    ),
    400,
  );
  await expect(
    await request(
      "/api/repairs",
      { method: "POST", body: repair(3, undefined, true, "stale") },
      tech,
    ),
    409,
  );
  const firstForm = repair();
  issue = (
    await expect(
      await request("/api/repairs", { method: "POST", body: firstForm }, tech),
      201,
    )
  ).issue;
  assert.equal(issue.status, "awaiting-review");
  assert.equal(issue.completedAt, null);
  assert.equal(issue.repairs.length, 1);
  assert.equal(issue.repairs[0].photos.length, 3);
  assert.equal(issue.repairs[0].submittedBy, "QA maintenance");
  await expect(
    await request("/api/repairs", { method: "POST", body: repair() }, tech),
    200,
  );
  assert.equal(
    (await request(issue.repairs[0].photos[0], {}, admin)).status,
    200,
  );
  await expect(
    await request(
      "/api/issues",
      patch("completed", "awaiting-review", { submissionId }),
      tech,
    ),
    403,
  );
  await expect(
    await request(
      "/api/issues",
      patch("completed", "awaiting-review", { submissionId: "wrong" }),
      admin,
    ),
    409,
  );
  await expect(
    await request(
      "/api/issues",
      patch("in-progress", "awaiting-review", { submissionId }),
      admin,
    ),
    400,
  );
  issue = (
    await expect(
      await request(
        "/api/issues",
        patch("in-progress", "awaiting-review", {
          submissionId,
          note: "Check the drain connection too.",
        }),
        admin,
      ),
      200,
    )
  ).issue;
  assert.equal(issue.repairs[0].reviewStatus, "returned");
  assert.equal(issue.repairs[0].reviewedBy, "Grayson Powell");
  assert.equal(issue.completedAt, null);
  const firstId = submissionId;
  submissionId = crypto.randomUUID();
  issue = (
    await expect(
      await request("/api/repairs", { method: "POST", body: repair() }, tech),
      201,
    )
  ).issue;
  await expect(
    await request(
      "/api/issues",
      patch("completed", "awaiting-review", { submissionId: firstId }),
      admin,
    ),
    409,
  );
  const reviews = await Promise.all([
    request(
      "/api/issues",
      patch("completed", "awaiting-review", { submissionId }),
      admin,
    ),
    request(
      "/api/issues",
      patch("in-progress", "awaiting-review", {
        submissionId,
        note: "Concurrent stale review",
      }),
      admin,
    ),
  ]);
  assert.deepEqual(reviews.map((r) => r.status).sort(), [200, 409]);
  issue = (await reviews.find((r) => r.status === 200).json()).issue;
  // Finish if the concurrent return won, preserving both review submissions.
  if (issue.status === "in-progress") {
    submissionId = crypto.randomUUID();
    issue = (
      await expect(
        await request("/api/repairs", { method: "POST", body: repair() }, tech),
        201,
      )
    ).issue;
    issue = (
      await expect(
        await request(
          "/api/issues",
          patch("completed", "awaiting-review", { submissionId }),
          admin,
        ),
        200,
      )
    ).issue;
  }
  assert.equal(issue.status, "completed");
  assert.ok(issue.completedAt);
  assert.equal(issue.repairs[0].reviewStatus, "approved");
  assert.ok(
    issue.repairs.some(
      (r) => r.id === firstId && r.reviewStatus === "returned",
    ),
  );
  assert.equal(issue.updates.filter((u) => u.status === "completed").length, 1);
  await expect(
    await request("/api/issues", patch("unaddressed", "completed"), tech),
    409,
  );
  const completed = issue;
  issue = (
    await expect(
      await request("/api/issues", patch("unaddressed", "completed"), admin),
      200,
    )
  ).issue;
  assert.equal(issue.completedAt, null);
  assert.equal(issue.assigneeName, null);
  assert.equal(issue.repairs.length, completed.repairs.length);
  await expect(await userAction(tech, "remove", "approved"), 200);
  await expect(await request("/api/issues", {}, tech), 401);
  await expect(await request(issue.photos[0], {}, tech), 401);
  await expect(await request(completed.repairs[0].photos[0], {}, tech), 401);
  await expect(
    await request("/api/auth", json({ ...tech.body, action: "login" })),
    403,
  );
  await expect(await userAction(tech, "restore", "removed"), 200);
  await expect(await request("/api/issues", {}, tech), 401);
  assert.equal(
    (
      await expect(
        await request("/api/auth", json({ ...tech.body, action: "login" })),
        200,
      )
    ).account.approvalStatus,
    "approved",
  );
  await expect(await request("/api/auth", { method: "DELETE" }, staff), 200);
  await expect(await request("/api/issues", {}, staff), 401);
});

test("administrator password login, reservation, persistence, and sign-out", async () => {
  const login = { action: "login", phone: "555-010-0999", pin: "QA#Owner2026" };
  await expect(
    await request("/api/auth", json({ ...login, pin: "wrong#Password" })),
    401,
  );
  await expect(
    await request(
      "/api/auth",
      json({
        ...login,
        action: "register",
        pin: "123456",
        name: "Imposter",
        role: "staff",
      }),
    ),
    409,
  );
  const r = await request("/api/auth", json(login));
  const data = await expect(r, 200);
  assert.equal(data.account.role, "admin");
  assert.equal(data.account.approvalStatus, "approved");
  assert.equal(data.account.authMethod, "password");
  assert.equal(data.account.name, "Grayson Powell");
  assert.equal(data.account.phone, "5550100999");
  assert.equal(data.account.pin_hash, undefined);
  assert.equal(data.account.salt, undefined);
  const actor = {
    headers: { Cookie: r.headers.get("set-cookie").split(";")[0] },
  };
  const current = await expect(await request("/api/auth", {}, actor), 200);
  assert.equal(current.account.role, "admin");
  assert.equal(current.account.authMethod, "password");
  const users = await expect(await request("/api/users", {}, actor), 200);
  assert.ok(users.users.every((user) => user.role !== "admin"));
  await expect(
    await request(
      "/api/users",
      json(
        { id: data.account.id, action: "remove", expectedStatus: "approved" },
        "PATCH",
      ),
      actor,
    ),
    403,
  );
  await expect(await request("/api/auth", { method: "DELETE" }, actor), 200);
  assert.equal(
    (await expect(await request("/api/auth", {}, actor), 200)).account,
    null,
  );
  await expect(await request("/api/users", {}, actor), 403);
});
