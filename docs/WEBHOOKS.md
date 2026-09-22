# Relay Webhooks Integration Guide

Relay includes a native GitHub webhook receiver that automatically routes repository activity into your workspace's `#git-events` room.

---

## Configuring GitHub Webhooks

1. Open your GitHub repository settings: `https://github.com/<org>/<repo>/settings/hooks`
2. Click **Add webhook**.
3. Set **Payload URL**:
   ```
   https://<your-relay-host>/api/v1/webhooks/github/<workspace_id>
   ```
4. Set **Content type**: `application/json`
5. (Optional) Set **Secret**: Match your `GITHUB_WEBHOOK_SECRET` in `.env`.
6. Select events to send:
   - **Pushes**
   - **Pull requests**
   - **Branch or tag creation**
7. Click **Add webhook**.

---

## Local Testing with Relay CLI

If you are developing locally without an external IP address, use Relay CLI's built-in webhook server:

```bash
relay webhook serve --port 9000 --workspace-id <workspace_id>
```
Forward your local port using a tunnel (e.g. cloudflared or ngrok):
```bash
ngrok http 9000
```
Then configure the ngrok URL in GitHub.
