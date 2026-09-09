import assert from "node:assert/strict";
import test from "node:test";

// Run only against a local disposable database, never the production site.
const base = process.env.TEST_BASE_URL;
if (base && !["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Tests require a local disposable server.");
test("Fyxinn Quick renders its sign-in screen", { skip: !base }, async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Fyxinn Quick/);
  assert.match(html, /Sign in/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});
test(
  "accounts, reports, photos, permissions, persistence, and status history",
  { skip: !base },
  async () => {
    const suffix = String(Date.now()).slice(-7);
    async function account(role, n) {
      const phone = `555${suffix.slice(0, 6)}${n}`;
      const body = {
        action: "register",
        name: `QA ${role}`,
        phone,
        pin: "839271",
        role,
      };
      const response = await fetch(`${base}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 200, await response.clone().text());
      const cookie = response.headers.get("set-cookie").split(";")[0];
      assert.match(response.headers.get("set-cookie"), /HttpOnly/);
      assert.equal((await response.json()).account.role, role);
      return { cookie, body };
    }
    const staff = await account("staff", 1),
      tech = await account("maintenance", 2);
    const request = (path, options = {}, actor = staff) =>
      fetch(`${base}${path}`, {
        ...options,
        headers: { Cookie: actor.cookie, ...options.headers },
      });
    assert.equal((await fetch(`${base}/api/issues`)).status, 401);
    assert.equal(
      (await fetch(`${base}/api/photos?key=issues/test`)).status,
      401,
    );
    assert.equal(
      (await (await request("/api/auth")).json()).account.name,
      "QA staff",
    );
    assert.equal(
      (
        await request("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(staff.body),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...staff.body,
            action: "login",
            pin: "000000",
          }),
        })
      ).status,
      401,
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY3sAAAAASUVORK5CYII=",
      "base64",
    );
    const reportId = crypto.randomUUID();
    function form(count = 3, type = "valid", id = reportId) {
      const form = new FormData();
      form.set("requestId", id);
      form.set("location", "108");
      form.set("category", "Plumbing");
      form.set("description", "QA sink repair persistence check");
      form.set("reporterName", "Spoofed Name");
      for (let i = 0; i < count; i++)
        form.append(
          "photos",
          new Blob([type === "valid" ? png : "<svg onload='alert(1)'/>"], {
            type: "image/png",
          }),
          `photo-${i}.png`,
        );
      return form;
    }
    assert.equal(
      (await request("/api/issues", { method: "POST", body: form(2) })).status,
      400,
    );
    assert.equal(
      (
        await request("/api/issues", {
          method: "POST",
          body: form(3, "invalid"),
        })
      ).status,
      400,
    );
    const created = await request("/api/issues", {
      method: "POST",
      body: form(),
    });
    assert.equal(created.status, 201, await created.clone().text());
    const issue = (await created.json()).issue;
    assert.equal(issue.reporterName, "QA staff");
    assert.equal(issue.photos.length, 3);
    assert.equal(
      (await request("/api/issues", { method: "POST", body: form() })).status,
      200,
    );
    assert.equal(
      (await request(issue.photos[0])).headers.get("content-type"),
      "image/png",
    );
    assert.equal(
      (await (await request("/api/issues")).json()).issues.filter(
        (item) => item.id === issue.id,
      ).length,
      1,
    );
    const patch = (status, expectedStatus, id = issue.id) => ({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        expectedStatus,
        actorName: "Spoofed Tech",
      }),
    });
    assert.equal(
      (await request("/api/issues", patch("in-progress", "unaddressed")))
        .status,
      403,
    );
    assert.equal(
      (
        await request(
          "/api/issues",
          patch("in-progress", "unaddressed", "missing"),
          tech,
        )
      ).status,
      404,
    );
    assert.equal(
      (await request("/api/issues", patch("completed", "unaddressed"), tech))
        .status,
      409,
    );
    const start = await request(
      "/api/issues",
      patch("in-progress", "unaddressed"),
      tech,
    );
    assert.equal(start.status, 200, await start.clone().text());
    assert.equal((await start.json()).issue.assigneeName, "QA maintenance");
    assert.equal(
      (await request("/api/issues", patch("in-progress", "unaddressed"), tech))
        .status,
      409,
    );
    assert.equal(
      (await request("/api/issues", patch("completed", "in-progress"), tech))
        .status,
      200,
    );
    const reopened = (
      await (
        await request("/api/issues", patch("unaddressed", "completed"), tech)
      ).json()
    ).issue;
    assert.equal(reopened.assigneeName, null);
    assert.equal(reopened.completedAt, null);
    assert.equal(reopened.updates.length, 4);
    assert.equal(
      (
        await request(
          "/api/issues",
          {
            ...patch("in-progress", "unaddressed"),
            headers: {
              "Content-Type": "application/json",
              Origin: "https://example.com",
            },
          },
          tech,
        )
      ).status,
      403,
    );
    assert.equal(
      (await request("/api/auth", { method: "DELETE" })).status,
      200,
    );
    assert.equal((await request("/api/issues")).status, 401);
    const login = await fetch(`${base}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...staff.body, action: "login" }),
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).account.name, "QA staff");
  },
);
