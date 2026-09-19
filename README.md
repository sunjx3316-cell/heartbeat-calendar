# Heartbeat Calendar

A self-hosted couples calendar PWA: shared memories, photos, comments,
anniversaries, mood status, period tracking, and optional city-level distance.

This is a **bring-your-own-CloudBase** template. It is intentionally empty:
there is no deployed environment ID, API key, invitation, account, photo, or
relationship data in the repository. Every installer creates and pays for
their own Tencent Cloud CloudBase environment.

## What is included

- A mobile-first static web app in [`app/`](app/)
- A single CloudBase function in [`cloudbase/functions/couple-calendar/`](cloudbase/functions/couple-calendar/)
- A minimal PostgreSQL table for each independently-owned couple space
- Deployment instructions that keep the service API key server-only
- Batched photo URL/deletion operations for long-running, photo-heavy spaces
- Full-screen memory feed and single-post views with comments
- Opt-in Web Push notifications for a partner's new posts and comments

## Quick start

Follow [the deployment guide](DEPLOY.md). In short:

1. Create your own CloudBase environment and PostgreSQL table.
2. Deploy the function and configure its CloudBase plus Web Push runtime environment variables.
3. Put your **environment ID only** in `app/config.js`.
4. Deploy `app/` to your own static hosting service.

Then the first visitor creates a couple space. They share the generated invite
code with their partner; extra devices use the device-sync code. Anyone using
the same invite/device code sees that space, while unrelated couples create a
separate space in the same deployment.

## Security model

- The browser has only a CloudBase environment ID. It never receives the
  server API key.
- The function stores invitation and device credentials only as hashes.
- The per-member secret controls read/write access to a couple space.
- Location is refreshed only when the person presses refresh; only a
  city-level label and coordinate-derived distance are shared.

This is a personal-project template, not a security-audited product. Do not
use it for information where a compromise would cause serious harm.

## Local checks

With Node.js 18 or newer:

```powershell
node tests/calendar-date-smoke.cjs
node tests/location-utils-smoke.cjs
node tests/cloud-function-smoke.cjs
node tests/moment-detail-smoke.cjs
```

## Publish it to GitHub

Create an empty GitHub repository, upload the contents of this folder, and
make it public. Do **not** add a real `CLOUDBASE_APIKEY`, database export,
`cloudbaserc.json`, generated release ZIP, or a `config.js` containing private
notes. Environment IDs are not secrets, but keeping `config.js` blank makes a
fork safer by default.

The template is released under the [MIT License](LICENSE).
