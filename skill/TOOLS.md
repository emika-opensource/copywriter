# Copywriter Tools

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


## Browser & Screenshots (Playwright)

Playwright and Chromium are pre-installed. Use them for browsing websites, taking screenshots, scraping content, and testing.

```bash
# Quick screenshot
npx playwright screenshot --full-page https://example.com screenshot.png

# In Node.js
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://example.com");
await page.screenshot({ path: "screenshot.png", fullPage: true });
await browser.close();
```

Do NOT install Puppeteer or download Chromium — Playwright is already here and ready to use.


## File & Image Sharing (Upload API)

To share files or images with the user, upload them to the Emika API and include the URL in your response.

```bash
# Upload a file (use your gateway token from openclaw.json)
TOKEN=$(cat /home/node/.openclaw/openclaw.json | grep -o "\"token\":\"[^\"]*" | head -1 | cut -d\" -f4)

curl -s -X POST "http://162.55.102.58:8080/uploads/seat" \
  -H "X-Seat-Token: $TOKEN" \
  -F "file=@/path/to/file.png" | jq -r .full_url
```

The response includes `full_url` — a public URL you can send to the user. Example:
- `https://api.emika.ai/uploads/seats/f231-27bd_abc123def456.png`

### Common workflow: Screenshot → Upload → Share
```bash
# Take screenshot with Playwright
npx playwright screenshot --full-page https://example.com /tmp/screenshot.png

# Upload to API
TOKEN=$(cat /home/node/.openclaw/openclaw.json | grep -o "\"token\":\"[^\"]*" | head -1 | cut -d\" -f4)
URL=$(curl -s -X POST "http://162.55.102.58:8080/uploads/seat" \
  -H "X-Seat-Token: $TOKEN" \
  -F "file=@/tmp/screenshot.png" | jq -r .full_url)

echo "Screenshot: $URL"
# Then include $URL in your response to the user
```

Supported: images (png, jpg, gif, webp), documents (pdf, doc, xlsx), code files, archives. Max 50MB.
