# Copywriter — Time-to-First-Value Audit

**Date:** 2026-02-11
**Auditor:** AI Audit Agent
**Verdict:** Solid foundation, but first-run experience is a cold start with no guided path to value.

---

## 1. First-Run Experience

**Rating: 4/10**

When a new user opens the dashboard for the first time, they see:
- A dashboard with all stats at **zero** (0 published articles, 0 knowledge docs, 0 screenshots, 0 videos)
- An empty "Recent Articles" table with "No articles yet" message
- No suggestions appear (suggestions require existing KB docs or articles to generate gaps)

**Time to first value:** At least **5-8 clicks** and significant mental overhead:
1. Figure out what the tool does (no onboarding tour or welcome state)
2. Navigate to Knowledge Base
3. Switch to Upload or Paste tab
4. Upload a document
5. Navigate to Articles
6. Create an article (or use template)
7. Write content
8. Publish

**Critical gap:** The dashboard is completely empty on first run. The suggestions engine only fires *after* you already have content — the exact moment you no longer need as much guidance. There's no welcome wizard, no sample content, no "here's what to do first" flow.

**BOOTSTRAP.md asks 7 questions** before doing anything. A new user talking to the AI agent will spend their first interaction answering a questionnaire instead of getting value.

---

## 2. UI/UX Issues

**Rating: 7/10** — Clean and professional, but several gaps:

- **No loading states.** Every page transition just blanks the content area while API calls resolve. On slow connections, the user sees nothing.
- **No keyboard shortcuts.** Power users can't Cmd+S to save articles.
- **No autosave.** Article editing has no autosave or unsaved-changes warning. Navigating away loses work silently.
- **`prompt()` for text annotations.** The screenshot text tool uses `window.prompt()` — breaks the dark theme immersion and feels cheap.
- **Suggestions page isn't actionable.** Suggestion cards have no click handlers — they show "Create Article" or "Upload Document" as text but clicking does nothing. Dead end.
- **No breadcrumbs.** When editing an article or screenshot, the only way back is the "Back" button. No URL routing means browser back/forward doesn't work.
- **No URL routing at all.** The SPA has no hash or history-based routing. Refreshing always returns to dashboard. Can't share links to specific articles.
- **Sidebar doesn't indicate current page** properly when in sub-pages (article editor, screenshot editor, video editor) — `currentPage` becomes `'article-editor'` etc., which doesn't match any nav item.
- **Mobile sidebar collapses** to 56px but nav text disappears with no tooltip fallback — icons only, no labels.
- **No confirmation on publish.** Changing status to "published" is just a dropdown change + save. No "are you sure?" for going live.
- **Markdown preview is basic.** `simpleMarkdown()` handles basics but misses tables, nested lists, horizontal rules, blockquotes. Articles referencing these will render broken in preview.

---

## 3. Feature Completeness

**Rating: 5/10** — Several features are stubs:

| Feature | Status | Notes |
|---------|--------|-------|
| Knowledge Base (upload/search) | ✅ Complete | BM25 works, chunking works |
| Article CRUD | ✅ Complete | Templates, sections, SEO metadata |
| Screenshot capture | ⚠️ Partial | Requires Playwright + Chromium installed; `start.sh` installs it but it's heavy |
| Screenshot annotation | ✅ Complete | Arrow, box, circle, highlight, text, step markers |
| Video rendering | ❌ Stubbed | `render` endpoint just sets status to "rendered" with a fake path. No actual video composition. Comment says "Configure Remotion for actual video composition." |
| TTS voiceover | ⚠️ External dep | Works but requires ElevenLabs API key. No fallback, no free tier guidance. |
| Content suggestions | ⚠️ Limited | Only keyword-gap analysis. "AI-powered" is misleading — it's simple string matching, not LLM-based. |
| Article export/publishing | ❌ Missing | No way to export articles to HTML, push to a CMS, or publish to a URL. Articles exist only inside the dashboard. |
| Search within articles | ❌ Missing | KB search exists but no way to search across your own articles. |

**Remotion is listed as a dependency** in package.json (`@remotion/renderer`, `@remotion/cli`) adding significant install bloat (~200MB+) for a feature that doesn't work.

---

## 4. Error Handling

**Rating: 5/10**

**Good:**
- Server-side try/catch on most routes, returns JSON errors
- File upload validates presence of file/content
- API key is masked in GET /settings response
- Empty states exist for all list views

**Bad:**
- **Client-side `api()` never checks `res.ok`.** Every `fetch` call does `return res.json()` regardless of status code. A 500 error will parse the error JSON but the caller just uses it as if it succeeded. No global error handling.
- **No validation on article save.** Server accepts any body on PUT. Empty titles, empty sections, invalid categories — all accepted.
- **Screenshot capture can hang.** 30s timeout on Playwright `goto`, but no client-side timeout. User sees "Capturing..." forever if the server is slow.
- **`pdf-parse` is required at call time** (`require('pdf-parse')` inside the async function). If not installed, error only shows when you try to upload a PDF.
- **`playwright` is required at call time** similarly. If Chromium isn't installed, screenshot capture fails with a cryptic error.
- **No rate limiting.** Any client can hammer the API.
- **No input sanitization.** `escHtml` is used in the frontend but server stores raw user input in JSON files. XSS through article content is partially mitigated by frontend escaping, but `simpleMarkdown()` converts markdown to raw HTML including `<img>` tags from `![]()` syntax — potential XSS vector.

---

## 5. Code Quality

**Rating: 6/10**

**Good:**
- Clean, readable code. Single-file server and single-file client are easy to understand.
- Consistent coding style.
- No framework overhead — vanilla JS is appropriate for this scope.

**Bad:**
- **JSON file storage** reads/writes entire files on every request. Will corrupt under concurrent writes. No file locking.
- **`loadJSON` is called multiple times per request.** `GET /api/suggestions` calls `loadJSON` 5 times for different files. Each is a synchronous file read. Should cache or batch.
- **Global mutable state in client.** `annotationState`, `kbTab`, `articleFilter` etc. are loose globals.
- **No TypeScript.** Large app.js (1160 lines) with no type safety.
- **`collectVideoData`** captures `img.src` which will be the full absolute URL, not the relative path. Bug when saving.
- **Memory leak potential:** Toast elements are created and appended but rely on `setTimeout` for cleanup. If toasts fire rapidly, DOM fills up.
- **`slideItemHtml`** takes `screenshots` parameter but never uses it.
- **HTML injection in `showModal`:** `title` parameter is inserted raw into innerHTML. If a document name contains HTML, it could break the modal.

---

## 6. BOOTSTRAP.md Quality

**Rating: 5/10**

The bootstrap asks 7 questions before doing anything:
1. What product do you document?
2. Do you have existing docs?
3. Documentation style?
4. Audience?
5. Most urgent content needs?
6. Need explainer videos?
7. Help center URL?

**Problems:**
- **Too many questions upfront.** A user who just wants to try the tool is hit with a 7-question interview. This is a barrier to first value.
- **No progressive disclosure.** Questions 3-7 could be deferred until actually needed.
- **No action taken without answers.** The bootstrap doesn't do anything proactive — it waits for input.
- **Should offer a "just show me what you can do" path** — create a sample article from a template, or analyze a pasted URL.

---

## 7. SKILL.md Quality

**Rating: 8/10** — Best part of the repo.

- Complete API reference with curl examples for every endpoint
- Clear workflow sections (1-6)
- Content guidelines included
- API reference table at the bottom
- TOOLS.md mirrors the API reference concisely

**Minor issues:**
- `GET /api/knowledge-base/:id` endpoint is documented in the code but missing from SKILL.md API table
- No mention of error response format
- No mention of the dashboard URL pattern (always localhost:3000)
- Video rendering is documented as if it works, but it's stubbed

---

## 8. Specific Improvements (Ranked by Impact)

### Critical (Time-to-First-Value)

1. **Add a welcome/onboarding state to the dashboard.** When stats are all zero, show a guided 3-step card: "1. Upload a document → 2. Create your first article → 3. Publish it." Each step should be a direct link/button.

2. **Make suggestion cards clickable and actionable.** "Create Article" should navigate to article creation. "Upload Document" should navigate to KB upload tab. Currently they're dead text.

3. **Reduce BOOTSTRAP.md to 2 questions max.** Ask "What product?" and "Paste a doc or URL to get started." Then immediately create a draft article to show value. Defer style/audience/video questions.

4. **Add URL routing** (hash-based at minimum). Users can't bookmark, share, or refresh without losing their place. This is a fundamental SPA requirement.

5. **Fix client-side error handling.** Check `res.ok` in the `api()` function and show toast on failure. Currently errors are silently swallowed.

### High Impact

6. **Add autosave to article editor** (debounced, save draft every 30s). Losing work is unacceptable.

7. **Remove Remotion dependencies** from package.json until video rendering is actually implemented. Saves 200MB+ install time and avoids broken expectations.

8. **Add a "Quick Start" article template** that pre-fills with sample content the user can edit, instead of starting from blank sections.

9. **Add loading spinners/skeletons** for page transitions. A simple `el.innerHTML = '<div class="loading">Loading...</div>'` before async calls.

10. **Fix sidebar active state** for sub-pages. When in article-editor, highlight "Articles" in the sidebar. Map sub-pages to parent pages.

### Medium Impact

11. **Add article search/filter** on the articles page. Currently only status filter exists.

12. **Add unsaved changes detection.** `beforeunload` handler when article/video editor has unsaved changes.

13. **Replace `window.prompt()`** in screenshot text annotation with an inline input.

14. **Add article export** — at minimum "Copy as Markdown" and "Copy as HTML" buttons.

15. **Add file locking or atomic writes** for JSON storage to prevent corruption under concurrent access.

16. **Improve `simpleMarkdown()`** — add blockquote, table, and horizontal rule support, or pull in a lightweight markdown library (marked.js is 10KB gzipped).

### Low Impact

17. **Add keyboard shortcuts.** Cmd/Ctrl+S to save, Escape to close modal.

18. **Add dark/light theme toggle** (currently dark-only).

19. **Add tags autocomplete** based on existing tags across articles.

20. **Add word count and reading time** to article editor sidebar.

21. **Add bulk operations** (delete multiple articles, bulk status change).

22. **Document the actual Remotion integration** or remove all references to video rendering from the UI until it works.

---

## Summary

The Copywriter is a **well-designed tool with a polished UI** that suffers from a **cold-start problem**. A new user lands on an empty dashboard with no guidance, the AI agent asks 7 questions before doing anything, and several advertised features (video rendering) don't work.

**Biggest wins for least effort:**
1. Welcome state on empty dashboard (+30min)
2. Make suggestions clickable (+15min)  
3. Fix `api()` error handling (+5min)
4. Trim BOOTSTRAP.md (+10min)
5. Remove Remotion deps (+2min)

These five changes would dramatically improve the first-run experience with under 1 hour of work.
