# Fyxinn Quick

Bilingual hotel maintenance reporting for rooms 100–127, 200–233, and common areas.

Live site: https://fyxinn-quick.graysonpowell0.chatgpt.site/

## Features

- Persistent phone/PIN accounts and staff/maintenance roles.
- Reports with exactly three photos, using the camera or existing files.
- Live camera preview, capture, retake, camera switching, and device-camera fallback.
- Room status overview, searchable repair queue, and a durable repair history.
- English and Spanish interfaces with responsive mobile layouts.
- Isolated practice demos. Demo changes never write to the hotel database.

## Local development

Use Node.js 22.13 or newer.

```sh
npm ci
npm run db:migrate:local
npm run dev
```

The local database and photo bucket live in ignored `.wrangler/` storage. Local accounts and reports are separate from production. Create a local account or use either demo button.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` applies local migrations, starts a temporary local server on port 3199, verifies account persistence, uploads, validation, authorization, idempotency, and repair history, then stops the server. It creates clearly named QA records in the local database. Set `TEST_BASE_URL` to test an already-running local server. Tests reject non-local URLs.

## Hosting and GitHub

This GitHub repository stores the source for the existing Sites-hosted application. Its homepage points to the live app. Production remains hosted by Sites with its existing private audience; GitHub source visibility does not change access to hotel records.

`.openai/hosting.json` identifies the existing Site and its logical D1 (`DB`) and R2 (`PHOTOS`) bindings. Sites owns the production resources and applies the committed Drizzle migrations when publishing. `wrangler.jsonc` provides local development bindings and type generation; its placeholder database ID is not a production deployment target.

To release changes, validate the source, push the same commit to GitHub and the managed Sites source repository, package the matching Worker build, and publish a saved version through Sites. A GitHub push alone does not publish the site.

Keep environment files, credentials, database contents, and personal uploads out of Git. Existing migration files are immutable; generate a new migration for schema changes.

## Access

The current deployment retains the owner's private Sites access. Phone/PIN accounts operate within that access boundary. The existing role-selection flow is retained; only maintenance accounts may update repair status. PINs are salted and hashed, sessions use HttpOnly cookies, and repeated login attempts are limited.

Camera access requires HTTPS (or localhost) and the user's browser permission. JPEG, PNG, and WebP photos are supported. Photos are resized before upload. A physical iPhone/Android camera check remains advisable before expanding use to staff devices.
