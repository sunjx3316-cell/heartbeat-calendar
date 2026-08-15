# Deploy your own CloudBase instance

These instructions create an independent backend. No step connects to another
person's CloudBase account.

## 1. Create CloudBase resources

Create a CloudBase environment with PostgreSQL enabled. In its PostgreSQL
database, create a table named `heartbeat_spaces` in schema `public` with
these columns:

| Column | Type | Default / notes |
| --- | --- | --- |
| `id` | `uuid` | primary key, default `gen_random_uuid()` |
| `created_at` | `timestamptz` | default `now()` |
| `invite_hash` | `text` | required |
| `owner_token_hash` | `text` | required |
| `partner_token_hash` | `text` | nullable |
| `snapshot` | `jsonb` | required |
| `revision` | `int4` | default `1` |

Keep RLS enabled and do not create public browser policies. The function uses a
service API key; the browser accesses data only through that function.

Also enable **anonymous login** in CloudBase Authentication. Add the hostname
of your static website to CloudBase's Web security domain / CORS allow-list.

## 2. Create a service API key

In CloudBase, create an API key intended for the server function. Copy it once
and store it safely. This key is secret: never put it in `app/config.js`, HTML,
GitHub issues, screenshots, or a frontend build.

## 3. Deploy the function

Create a normal Node.js 20 Cloud Function called `couple-calendar` and upload
the contents of:

```
cloudbase/functions/couple-calendar/
```

Use entry point `index.main`, then install dependencies. In its runtime
environment variables create:

| Key | Value |
| --- | --- |
| `CLOUDBASE_ENV_ID` | your CloudBase environment ID |
| `CLOUDBASE_APIKEY` | the server API key from step 2 |

The function needs outbound network access because it calls the CloudBase
PostgreSQL REST gateway. Do not enable a public HTTP endpoint for this function
unless you separately add authentication and rate limiting.

## 4. Configure and publish the web app

Edit `app/config.js`:

```js
window.HEARTBEAT_CONFIG = {
  cloudbaseEnvId: 'your-cloudbase-environment-id',
  cloudFunctionName: 'couple-calendar'
};
```

Deploy the **contents** of `app/` to CloudBase Static Hosting, GitHub Pages,
Cloudflare Pages, or another HTTPS static host. If you rename the function,
change `cloudFunctionName` to match.

Open the deployed web address in an incognito window. The first save should
create a space and display an invite code. Open the same address on a second
device and use that invite code to join.

## Troubleshooting

- **"尚未配置云端"**: edit `app/config.js` and redeploy it.
- **Anonymous login failed**: enable anonymous login and allow the web domain.
- **Function not found**: deploy a function with the exact name in
  `cloudFunctionName`.
- **Cloud function not configured**: set both runtime variables and redeploy
  the function. Never put the API key in the client.
- **Photos save locally but not to cloud**: check the function's API key,
  Cloud Storage permissions, and CloudBase allow-list. The app preserves the
  local record so the owner can retry.
