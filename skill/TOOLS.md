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
