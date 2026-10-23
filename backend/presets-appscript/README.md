# Community presets backend (Google Apps Script)

A Google Sheet stores the presets. An Apps Script bound to that sheet serves them over HTTP. You don't need a server, a database, or API keys in the app.

## Setup

You need a Google account. You can set it up from the terminal or by hand. Either way, the presets and votes tabs are created on the first publish, so you don't have to run anything inside the script.

### Option A — from the terminal (clasp)

1. Turn on the Apps Script API at <https://script.google.com/home/usersettings>.
2. Log in (this opens a browser):
   ```bash
   npx @google/clasp@3.4.1 login
   ```
3. From `backend/presets-appscript/`, create the Sheet and script, upload the code, and deploy:
   ```bash
   npx @google/clasp@3.4.1 create-script --type sheets --title "YUKINON Presets" --rootDir .
   npx @google/clasp@3.4.1 push -f
   npx @google/clasp@3.4.1 create-deployment -d "presets v1"
   ```
   `create-deployment` prints a deployment ID. The URL is `https://script.google.com/macros/s/<deploymentId>/exec`.
4. **Authorize it once:** run `npx @google/clasp@3.4.1 open-script`, select `setup`, click **Run**, and approve the permission prompt. Until you do this, anonymous requests fail.
5. Put the URL in the app's `.env`, then rebuild:
   ```
   VITE_PRESETS_API_URL=https://script.google.com/macros/s/XXXX/exec
   ```

To update it later, run `push -f`, then `update-deployment <deploymentId>`. The URL stays the same.

### Option B — by hand

1. Create a Google Sheet, then open **Extensions → Apps Script**.
2. Paste [`Code.gs`](./Code.gs) into the editor. Optionally, enable *Show "appsscript.json" manifest file* under **Project Settings** and paste [`appsscript.json`](./appsscript.json).
3. Select `setup` and click **Run** to approve permissions.
4. Go to **Deploy → New deployment → Web app**, set Execute as **Me** and Who has access **Anyone**, then copy the URL into `.env` as above.

After editing the code, use **Deploy → Manage deployments → Edit → New version**. Otherwise the URL keeps serving the old code.

## API

| Method | Request | Response |
| --- | --- | --- |
| GET | `?action=list&genre=Rock&device=hd600&sort=upvotes\|newest&limit=50` | `{ ok, presets: CommunityPreset[] }` |
| POST | `{ "action": "publish", "clientId", "title", "authorName", "deviceModel", "genre", "bands" }` | `{ ok, preset }` |
| POST | `{ "action": "upvote", "clientId", "id" }` | `{ ok, upvotes }` |

Send POST bodies as `Content-Type: text/plain` so the browser doesn't send a CORS preflight, which Apps Script doesn't support. Errors come back as `{ ok: false, error }`, still with HTTP 200.

## Limits and moderation

- **Validation:** every band must be within ±12 dB, and title, author and device have length caps. The genre must be in the app's list. Text starting with `=`, `+`, `-` or `@` gets a leading `'` so Sheets won't evaluate it as a formula.
- **Rate limits:** 5 publishes per client per hour, 300 publishes per day in total, and 60 upvotes per client per hour. Each client gets one upvote per preset.
- **`clientId` is not authentication.** It's a random ID each install generates for itself, so a determined user can fake it. The global daily cap is the real backstop. To moderate, delete the row from the sheet. To ban a client, filter the sheet by `client_id`.
- **Caching:** list results are cached for 60 s. Publishing or upvoting clears the cache.
- **Apps Script quotas:** on a free account, about 20k requests per day and 30 running at once. That's plenty for a hobby community.
