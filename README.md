# Copywriter — Emika AI Employee

AI-powered copywriter for help center articles, annotated screenshots, explainer videos, and content gap analysis with RAG knowledge base.

## Features

- **RAG Knowledge Base** — Upload PDFs, Markdown, text files. Auto-chunked and searchable via BM25
- **Article Creator** — Help center articles with templates, sections, categories, tags, and SEO metadata
- **Screenshot Tool** — Capture screenshots via Playwright, annotate with arrows, boxes, circles, text labels, highlights, and numbered steps
- **Explainer Videos** — Compose videos from screenshot sequences with ElevenLabs TTS voiceover
- **Content Suggestions** — AI-powered gap analysis suggesting missing articles, videos, and screenshots
- **Blog/Post Creator** — SEO-optimized articles with inline images and preview mode

## Quick Start

```bash
npm install
npx playwright install chromium
node server.js
```

Dashboard at `http://localhost:3000`

## Stack

- Express.js server with JSON file storage
- Static SPA frontend (vanilla JS, no framework)
- BM25 search engine (no external API dependencies)
- Playwright for screenshot capture
- ElevenLabs REST API for TTS (API key required)
- Remotion for video rendering
- PDF text extraction via pdf-parse
