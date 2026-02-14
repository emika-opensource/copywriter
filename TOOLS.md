# TOOLS.md - Local Notes

# Copywriter Tools

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.
NEVER use port 3001, 8080, or any other port. ONLY port 3000.

## ⚠️ IMPORTANT: Port 3000

Your **Help Center** web application is ALREADY RUNNING on port 3000. It starts automatically via start.sh.

- **DO NOT** kill anything on port 3000 — that is YOUR app
- **DO NOT** try to start a new server on port 3000
- The app is accessible to the user via the browser panel (iframe)
- If you need to build something for the user, deploy it on a DIFFERENT port using PM2


## Dashboard
- `GET /api/stats` — Article counts, KB stats, screenshot/video totals

## Knowledge Base (RAG)
- `GET /api/knowledge-base` — List all documents
- `POST /api/knowledge-base` — Upload file (multipart: file, name, category, tags) or paste content (JSON: title, content, category)
- `DELETE /api/knowledge-base/:id` — Delete document and chunks
- `POST /api/knowledge-base/search` — BM25 search: `{"query": "search terms", "limit": 5}`

## Articles
- `GET /api/articles` — List (filter: ?status, ?category)
- `GET /api/articles/templates` — Available templates
- `POST /api/articles` — Create: `{title, category, status, sections: [{title, content}], tags, seo: {title, description, keywords}}`
- `GET /api/articles/:id` — Get article
- `PUT /api/articles/:id` — Update article
- `DELETE /api/articles/:id` — Delete article

## Screenshots
- `GET /api/screenshots` — List all
- `POST /api/screenshots/capture` — Capture: `{url, width, height, fullPage, selector}`
- `GET /api/screenshots/:id` — Get screenshot
- `PUT /api/screenshots/:id` — Update annotations
- `POST /api/screenshots/:id/annotated` — Save annotated PNG: `{imageData}` (base64)
- `DELETE /api/screenshots/:id` — Delete screenshot

## Videos
- `GET /api/videos` — List all
- `POST /api/videos` — Create: `{title, slides: [{screenshotId, imagePath, script, duration}]}`
- `GET /api/videos/:id` — Get video
- `PUT /api/videos/:id` — Update video
- `DELETE /api/videos/:id` — Delete video
- `POST /api/videos/tts` — Generate voiceover: `{text, voiceId}`
- `POST /api/videos/render` — Render video: `{videoId}`

## Suggestions
- `GET /api/suggestions` — Get content gap suggestions

## Settings
- `GET /api/settings` — Get settings (API key masked)
- `POST /api/settings` — Update settings

## Screenshots & File Sharing

### Taking Screenshots
Use Playwright (pre-installed) to capture any website:
```bash
npx playwright screenshot --browser chromium https://example.com /tmp/screenshot.png
```

If Chromium is not installed yet, install it first:
```bash
npx playwright install chromium
```

### Sharing Files & Images with the User
Upload to the Emika API to get a shareable URL:
```bash
# Get your seat token

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.
NEVER use port 3001, 8080, or any other port. ONLY port 3000.
TOKEN=$(python3 -c "import json; print(json.load(open('/home/node/.openclaw/openclaw.json'))['gateway']['auth']['token'])")

# Upload any file

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.
NEVER use port 3001, 8080, or any other port. ONLY port 3000.
URL=$(curl -s -X POST "http://162.55.102.58:8080/uploads/seat" \
  -H "X-Seat-Token: $TOKEN" \
  -F "file=@/tmp/screenshot.png" | python3 -c "import sys,json; print(json.load(sys.stdin)['full_url'])")

# Include the URL in your response as markdown image

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.
NEVER use port 3001, 8080, or any other port. ONLY port 3000.
echo "![Screenshot]($URL)"
```

**IMPORTANT:**
- Do NOT use the `read` tool on image files — it sends the image to the AI model but does NOT display it to the user
- Always upload files and share the URL instead
- The URL format is `https://api.emika.ai/uploads/seats/<filename>`
- Supports: images, PDFs, documents, code files, archives (max 50MB)
