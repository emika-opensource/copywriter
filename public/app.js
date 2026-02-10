// ============ Copywriter SPA ============
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

let currentPage = 'dashboard';
let state = { stats: {}, articles: [], kbDocs: [], screenshots: [], videos: [], suggestions: [], settings: {}, templates: {} };

// ============ API ============
async function api(url, opts = {}) {
  const res = await fetch('/api' + url, {
    headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
    ...opts,
    body: opts.body instanceof FormData ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined
  });
  return res.json();
}

// ============ Toast ============
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ============ Modal ============
function showModal(title, contentHtml, footerHtml = '', wide = false) {
  const overlay = $('#modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="modal ${wide ? 'modal-wide' : ''}">
    <div class="modal-header"><h2>${title}</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">${contentHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
  </div>`;
}
function closeModal() { $('#modal-overlay').classList.add('hidden'); $('#modal-overlay').innerHTML = ''; }

// ============ Navigation ============
$$('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigate(item.dataset.page);
  });
});

function navigate(page) {
  currentPage = page;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  render();
}

async function render() {
  const el = $('#page-content');
  switch (currentPage) {
    case 'dashboard': return renderDashboard(el);
    case 'knowledge': return renderKnowledge(el);
    case 'articles': return renderArticles(el);
    case 'screenshots': return renderScreenshots(el);
    case 'videos': return renderVideos(el);
    case 'suggestions': return renderSuggestions(el);
    case 'settings': return renderSettings(el);
  }
}

// ============ Helpers ============
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function docIcon(type) {
  const map = { pdf: 'PDF', markdown: 'MD', text: 'TXT', html: 'HTM' };
  return `<div class="doc-icon doc-icon-${type}">${map[type] || 'DOC'}</div>`;
}
function simpleMarkdown(text) {
  return (text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent)">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// ============ DASHBOARD ============
async function renderDashboard(el) {
  const [stats, suggestions] = await Promise.all([api('/stats'), api('/suggestions')]);
  state.stats = stats;

  el.innerHTML = `
    <h1>Dashboard</h1>
    <p class="page-subtitle">Content operations overview</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Published Articles</div>
        <div class="stat-value" style="color:var(--accent)">${stats.publishedArticles || 0}</div>
        <div class="stat-sub">${stats.draftArticles || 0} drafts</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Knowledge Docs</div>
        <div class="stat-value">${stats.totalKBDocs || 0}</div>
        <div class="stat-sub">${stats.totalChunks || 0} searchable chunks</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Screenshots</div>
        <div class="stat-value">${stats.totalScreenshots || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Videos</div>
        <div class="stat-value">${stats.totalVideos || 0}</div>
      </div>
    </div>

    ${suggestions.length ? `
    <div class="section-header">
      <h2>Top Suggestions</h2>
      <button class="btn btn-sm" onclick="navigate('suggestions')">View All</button>
    </div>
    <div class="suggestion-grid mb-24">
      ${suggestions.slice(0, 3).map(s => `
        <div class="suggestion-card">
          <div class="suggestion-icon" style="background:var(--${s.priority === 'high' ? 'accent' : s.priority === 'medium' ? 'amber' : 'green'}-dim)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--${s.priority === 'high' ? 'accent' : s.priority === 'medium' ? 'amber' : 'green'})" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">${escHtml(s.title)}</div>
            <div class="suggestion-desc">${escHtml(s.description)}</div>
          </div>
          <span class="badge badge-${s.priority}">${s.priority}</span>
        </div>
      `).join('')}
    </div>` : ''}

    <div class="section-header">
      <h2>Recent Articles</h2>
      <button class="btn btn-primary btn-sm" onclick="navigate('articles')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Article
      </button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            ${(stats.recentArticles || []).length ? stats.recentArticles.map(a => `
              <tr onclick="editArticle('${a.id}')">
                <td style="font-weight:500">${escHtml(a.title)}</td>
                <td>${escHtml(a.category)}</td>
                <td><span class="badge badge-${a.status}">${a.status}</span></td>
                <td style="color:var(--text-muted)">${timeAgo(a.updatedAt || a.createdAt)}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px">No articles yet. Create your first article to get started.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============ KNOWLEDGE BASE ============
let kbTab = 'documents';

async function renderKnowledge(el) {
  const docs = await api('/knowledge-base');
  state.kbDocs = docs;

  el.innerHTML = `
    <h1>Knowledge Base</h1>
    <p class="page-subtitle">Upload documents to power content suggestions and RAG search</p>

    <div class="tabs">
      <div class="tab ${kbTab === 'documents' ? 'active' : ''}" onclick="kbTab='documents';renderKnowledge($('#page-content'))">Documents</div>
      <div class="tab ${kbTab === 'search' ? 'active' : ''}" onclick="kbTab='search';renderKnowledge($('#page-content'))">Search</div>
      <div class="tab ${kbTab === 'upload' ? 'active' : ''}" onclick="kbTab='upload';renderKnowledge($('#page-content'))">Upload</div>
      <div class="tab ${kbTab === 'paste' ? 'active' : ''}" onclick="kbTab='paste';renderKnowledge($('#page-content'))">Paste Content</div>
    </div>
    <div id="kb-content"></div>
  `;

  const content = $('#kb-content');
  if (kbTab === 'documents') renderKBDocList(content, docs);
  else if (kbTab === 'search') renderKBSearch(content);
  else if (kbTab === 'upload') renderKBUpload(content);
  else renderKBPaste(content);
}

function renderKBDocList(el, docs) {
  el.innerHTML = `
    <div class="filter-bar mb-16">
      <div class="search-input">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Filter documents..." oninput="filterKBDocs(this.value)">
      </div>
    </div>
    <div class="doc-grid" id="kb-doc-grid">
      ${docs.length ? docs.map(d => `
        <div class="doc-card" onclick="viewKBDoc('${d.id}')">
          <div class="doc-card-header">
            ${docIcon(d.type)}
            <span class="doc-card-name">${escHtml(d.name)}</span>
          </div>
          <div class="doc-card-meta">
            <span>${d.chunkCount} chunks</span>
            <span>${formatBytes(d.size)}</span>
            <span>${timeAgo(d.uploadedAt)}</span>
          </div>
        </div>
      `).join('') : '<div class="empty-state" style="grid-column:1/-1"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><p>No documents yet. Upload files or paste content to build your knowledge base.</p></div>'}
    </div>
  `;
}

function filterKBDocs(q) {
  const ql = q.toLowerCase();
  $$('.doc-card').forEach(c => { c.style.display = c.textContent.toLowerCase().includes(ql) ? '' : 'none'; });
}

async function viewKBDoc(id) {
  const doc = await api(`/knowledge-base/${id}`);
  showModal(escHtml(doc.name), `
    <div class="flex-between mb-16">
      <div>
        <span class="badge badge-accent" style="margin-right:8px">${(doc.type || 'text').toUpperCase()}</span>
        <span style="color:var(--text-muted);font-size:12px">${formatBytes(doc.size)} &middot; ${doc.chunkCount} chunks &middot; ${timeAgo(doc.uploadedAt)}</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteKBDoc('${id}')">Delete</button>
    </div>
    <div style="background:var(--bg);border-radius:var(--radius);padding:16px;max-height:400px;overflow-y:auto;font-size:13px;line-height:1.6;color:var(--text-dim);white-space:pre-wrap">${escHtml(doc.content)}</div>
  `);
}

async function deleteKBDoc(id) {
  if (!confirm('Delete this document and all its chunks?')) return;
  await api(`/knowledge-base/${id}`, { method: 'DELETE' });
  closeModal();
  toast('Document deleted', 'success');
  renderKnowledge($('#page-content'));
}

function renderKBSearch(el) {
  el.innerHTML = `
    <div class="search-input mb-16" style="max-width:500px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="kb-search-input" placeholder="Search your knowledge base..." onkeydown="if(event.key==='Enter')doKBSearch()">
    </div>
    <div id="kb-search-results"></div>
  `;
}

async function doKBSearch() {
  const q = $('#kb-search-input').value.trim();
  if (!q) return;
  const results = await api('/knowledge-base/search', { method: 'POST', body: { query: q, limit: 10 } });
  const maxScore = results.length ? results[0].score : 1;
  $('#kb-search-results').innerHTML = results.length ? results.map(r => `
    <div class="search-result">
      <div class="search-result-header">
        <span class="search-result-doc">${escHtml(r.documentName)}</span>
        <span class="search-result-score">Score: ${r.score}<span class="relevance-bar"><span class="relevance-fill" style="width:${Math.round(r.score / maxScore * 100)}%"></span></span></span>
      </div>
      <div class="search-result-content">${escHtml(r.content.slice(0, 300))}${r.content.length > 300 ? '...' : ''}</div>
    </div>
  `).join('') : '<p style="color:var(--text-muted);padding:20px;text-align:center">No results found</p>';
}

function renderKBUpload(el) {
  el.innerHTML = `
    <div class="upload-zone" id="kb-upload-zone" onclick="$('#kb-file-input').click()" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="handleKBDrop(event)">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <p>Drop files here or click to upload</p>
      <p class="upload-hint">Supports PDF, Markdown, Text, HTML files (max 50MB)</p>
    </div>
    <input type="file" id="kb-file-input" hidden accept=".pdf,.md,.txt,.html,.htm" onchange="uploadKBFile(this.files[0])">
    <div class="form-group mt-16"><label>Document Name (optional)</label><input type="text" id="kb-upload-name" placeholder="Auto-detected from filename"></div>
    <div class="form-group"><label>Category</label>
      <select id="kb-upload-category"><option value="general">General</option><option value="product">Product</option><option value="faq">FAQ</option><option value="policy">Policy</option><option value="technical">Technical</option><option value="api">API</option></select>
    </div>
    <div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="kb-upload-tags" placeholder="e.g. onboarding, api, billing"></div>
    <div id="kb-upload-progress" style="display:none" class="mt-16">
      <p id="kb-upload-status" style="font-size:13px;margin-bottom:8px">Uploading...</p>
      <div class="progress"><div class="progress-bar" id="kb-upload-bar" style="width:0%"></div></div>
    </div>
  `;
}

function handleKBDrop(e) { e.preventDefault(); $('#kb-upload-zone').classList.remove('dragover'); if (e.dataTransfer.files.length) uploadKBFile(e.dataTransfer.files[0]); }

async function uploadKBFile(file) {
  if (!file) return;
  const prog = $('#kb-upload-progress'); const bar = $('#kb-upload-bar'); const status = $('#kb-upload-status');
  prog.style.display = 'block'; status.textContent = 'Uploading ' + file.name + '...'; bar.style.width = '30%';
  const fd = new FormData();
  fd.append('file', file);
  fd.append('name', $('#kb-upload-name').value || '');
  fd.append('category', $('#kb-upload-category').value);
  fd.append('tags', $('#kb-upload-tags').value);
  try {
    bar.style.width = '60%';
    const doc = await api('/knowledge-base', { method: 'POST', body: fd });
    bar.style.width = '100%'; status.textContent = `Uploaded! ${doc.chunkCount} chunks created.`;
    toast('Document uploaded: ' + doc.name, 'success');
    setTimeout(() => { kbTab = 'documents'; renderKnowledge($('#page-content')); }, 1500);
  } catch (e) { status.textContent = 'Upload failed'; toast('Upload failed', 'error'); }
}

function renderKBPaste(el) {
  el.innerHTML = `
    <div class="card" style="max-width:600px">
      <div class="form-group"><label>Title</label><input type="text" id="kb-paste-title" placeholder="Document title"></div>
      <div class="form-group"><label>Content</label><textarea id="kb-paste-content" rows="12" placeholder="Paste your content here..."></textarea></div>
      <div class="form-group"><label>Category</label>
        <select id="kb-paste-category"><option value="general">General</option><option value="product">Product</option><option value="faq">FAQ</option><option value="policy">Policy</option><option value="technical">Technical</option><option value="api">API</option></select>
      </div>
      <button class="btn btn-primary" onclick="submitKBPaste()">Add to Knowledge Base</button>
    </div>
  `;
}

async function submitKBPaste() {
  const title = $('#kb-paste-title').value;
  const content = $('#kb-paste-content').value;
  if (!content.trim()) return toast('Content is required', 'error');
  const doc = await api('/knowledge-base', { method: 'POST', body: { title: title || 'Pasted Content', content, category: $('#kb-paste-category').value } });
  toast(`Added! ${doc.chunkCount} chunks created.`, 'success');
  kbTab = 'documents'; renderKnowledge($('#page-content'));
}

// ============ ARTICLES ============
let articleFilter = 'all';

async function renderArticles(el) {
  const [articles, templates] = await Promise.all([api('/articles'), api('/articles/templates')]);
  state.articles = articles;
  state.templates = templates;
  const filtered = articleFilter === 'all' ? articles : articles.filter(a => a.status === articleFilter);

  el.innerHTML = `
    <div class="flex-between mb-16">
      <div><h1>Articles</h1><p class="page-subtitle" style="margin-bottom:0">Create and manage help center articles</p></div>
      <div class="flex gap-8">
        <button class="btn" onclick="showTemplateChooser()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          From Template
        </button>
        <button class="btn btn-primary" onclick="createArticle()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Article
        </button>
      </div>
    </div>

    <div class="tabs">
      ${['all', 'draft', 'published', 'archived'].map(t => `<div class="tab ${articleFilter === t ? 'active' : ''}" onclick="articleFilter='${t}';renderArticles($('#page-content'))">${t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}</div>`).join('')}
    </div>

    <div class="article-grid">
      ${filtered.length ? filtered.map(a => `
        <div class="article-card" onclick="editArticle('${a.id}')">
          <div class="article-card-meta">
            <span class="badge badge-${a.status}">${a.status}</span>
            <span>${escHtml(a.category)}</span>
            <span>${timeAgo(a.updatedAt || a.createdAt)}</span>
          </div>
          <div class="article-card-title">${escHtml(a.title)}</div>
          <div class="article-card-excerpt">${escHtml((a.sections || []).map(s => s.content).join(' ').slice(0, 120))}</div>
          ${(a.tags || []).length ? `<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">${a.tags.map(t => `<span class="badge badge-accent">${escHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
      `).join('') : '<div class="empty-state" style="grid-column:1/-1"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg><p>No articles yet. Create your first article or use a template.</p></div>'}
    </div>
  `;
}

function showTemplateChooser() {
  const templates = state.templates;
  const keys = Object.keys(templates);
  showModal('Choose a Template', `
    <div class="article-grid">
      ${keys.map(k => `
        <div class="article-card" onclick="createArticleFromTemplate('${k}')">
          <div class="article-card-title">${escHtml(templates[k].name)}</div>
          <div class="article-card-excerpt">${templates[k].sections.length} sections: ${templates[k].sections.map(s => s.title).join(', ')}</div>
        </div>
      `).join('')}
    </div>
  `);
}

async function createArticleFromTemplate(templateKey) {
  const tpl = state.templates[templateKey];
  if (!tpl) return;
  closeModal();
  const article = await api('/articles', { method: 'POST', body: { title: tpl.name, sections: tpl.sections, template: templateKey, status: 'draft' } });
  toast('Article created from template', 'success');
  editArticle(article.id);
}

async function createArticle() {
  const article = await api('/articles', { method: 'POST', body: { title: 'Untitled Article', sections: [{ title: '', content: '' }], status: 'draft' } });
  toast('Article created', 'success');
  editArticle(article.id);
}

async function editArticle(id) {
  const article = await api(`/articles/${id}`);
  currentPage = 'article-editor';

  const el = $('#page-content');
  el.innerHTML = `
    <div class="flex-between mb-16">
      <button class="btn btn-sm" onclick="navigate('articles')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to Articles
      </button>
      <div class="flex gap-8">
        <button class="btn btn-sm" onclick="previewArticle('${id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteArticle('${id}')">Delete</button>
        <button class="btn btn-primary btn-sm" onclick="saveArticle('${id}')">Save</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:20px">
      <div>
        <div class="form-group">
          <input type="text" id="article-title" value="${escHtml(article.title)}" placeholder="Article Title" style="font-size:20px;font-weight:700;padding:12px">
        </div>

        <div id="sections-container">
          ${(article.sections || []).map((s, i) => sectionEditorHtml(i, s)).join('')}
        </div>
        <button class="btn btn-sm mt-12" onclick="addSection()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Section
        </button>
      </div>

      <div>
        <div class="card mb-12">
          <h3 style="margin-bottom:12px">Properties</h3>
          <div class="form-group"><label>Status</label>
            <select id="article-status">
              ${['draft', 'published', 'archived'].map(s => `<option value="${s}" ${article.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Category</label>
            <select id="article-category">
              ${['general', 'getting-started', 'how-to', 'faq', 'troubleshooting', 'api', 'release-notes', 'guides', 'billing'].map(c => `<option value="${c}" ${article.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Tags (comma-separated)</label>
            <input type="text" id="article-tags" value="${(article.tags || []).join(', ')}" placeholder="tag1, tag2">
          </div>
          <div class="form-group"><label>Author</label>
            <input type="text" id="article-author" value="${escHtml(article.author || '')}" placeholder="Author name">
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:12px">SEO</h3>
          <div class="form-group"><label>SEO Title</label><input type="text" id="seo-title" value="${escHtml(article.seo?.title || '')}" placeholder="Page title for search engines"></div>
          <div class="form-group"><label>SEO Description</label><textarea id="seo-description" rows="3" placeholder="Meta description">${escHtml(article.seo?.description || '')}</textarea></div>
          <div class="form-group"><label>SEO Keywords</label><input type="text" id="seo-keywords" value="${escHtml(article.seo?.keywords || '')}" placeholder="keyword1, keyword2"></div>
        </div>
      </div>
    </div>
  `;
}

function sectionEditorHtml(index, section) {
  return `
    <div class="section-editor" data-index="${index}">
      <div class="section-editor-header">
        <input type="text" class="section-title" value="${escHtml(section.title)}" placeholder="Section Title">
        <button class="btn btn-sm btn-danger" onclick="removeSection(${index})" title="Remove section">&times;</button>
      </div>
      <textarea class="section-content" rows="8" placeholder="Write content in Markdown...">${escHtml(section.content)}</textarea>
    </div>
  `;
}

function addSection() {
  const container = $('#sections-container');
  const index = $$('.section-editor').length;
  container.insertAdjacentHTML('beforeend', sectionEditorHtml(index, { title: '', content: '' }));
}

function removeSection(index) {
  const editors = $$('.section-editor');
  if (editors.length <= 1) return toast('Article must have at least one section', 'error');
  editors[index]?.remove();
}

function collectArticleData() {
  const sections = $$('.section-editor').map(el => ({
    title: el.querySelector('.section-title').value,
    content: el.querySelector('.section-content').value
  }));
  return {
    title: $('#article-title').value,
    status: $('#article-status').value,
    category: $('#article-category').value,
    tags: $('#article-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    author: $('#article-author').value,
    sections,
    seo: {
      title: $('#seo-title').value,
      description: $('#seo-description').value,
      keywords: $('#seo-keywords').value
    }
  };
}

async function saveArticle(id) {
  const data = collectArticleData();
  if (!data.title) return toast('Title is required', 'error');
  await api(`/articles/${id}`, { method: 'PUT', body: data });
  toast('Article saved', 'success');
}

async function deleteArticle(id) {
  if (!confirm('Delete this article?')) return;
  await api(`/articles/${id}`, { method: 'DELETE' });
  toast('Article deleted', 'success');
  navigate('articles');
}

async function previewArticle(id) {
  let data;
  try { data = collectArticleData(); } catch { data = await api(`/articles/${id}`); }

  const html = `
    <div class="article-preview">
      <h1>${escHtml(data.title)}</h1>
      <p style="color:#888;font-size:13px;margin-bottom:24px">${escHtml(data.category)} ${data.author ? '&middot; ' + escHtml(data.author) : ''}</p>
      ${(data.sections || []).map(s => `
        ${s.title ? `<h2>${escHtml(s.title)}</h2>` : ''}
        <p>${simpleMarkdown(s.content)}</p>
      `).join('')}
    </div>
  `;
  showModal('Article Preview', html, '', true);
}

// ============ SCREENSHOTS ============
async function renderScreenshots(el) {
  const screenshots = await api('/screenshots');
  state.screenshots = screenshots;

  el.innerHTML = `
    <div class="flex-between mb-16">
      <div><h1>Screenshots</h1><p class="page-subtitle" style="margin-bottom:0">Capture and annotate screenshots for documentation</p></div>
      <button class="btn btn-primary" onclick="showCaptureForm()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Capture Screenshot
      </button>
    </div>

    <div class="screenshot-grid">
      ${screenshots.length ? screenshots.map(s => `
        <div class="screenshot-card" onclick="viewScreenshot('${s.id}')">
          <img src="${s.annotatedPath || s.path}" alt="Screenshot" onerror="this.style.display='none'">
          <div class="screenshot-card-info">
            <div class="screenshot-card-url">${escHtml(s.url)}</div>
            <div class="screenshot-card-date">${s.width}x${s.height} &middot; ${timeAgo(s.capturedAt)}</div>
          </div>
        </div>
      `).join('') : '<div class="empty-state" style="grid-column:1/-1"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>No screenshots yet. Capture your first screenshot from a URL.</p></div>'}
    </div>
  `;
}

function showCaptureForm() {
  showModal('Capture Screenshot', `
    <div class="form-group"><label>URL</label><input type="url" id="capture-url" placeholder="https://example.com" autofocus></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Width</label><input type="number" id="capture-width" value="1280" min="320" max="3840"></div>
      <div class="form-group"><label>Height</label><input type="number" id="capture-height" value="800" min="200" max="2160"></div>
    </div>
    <div class="form-group"><label>CSS Selector (optional)</label><input type="text" id="capture-selector" placeholder="e.g. .main-content, #hero"></div>
    <div class="form-group flex gap-8" style="align-items:center">
      <label class="toggle" style="margin-bottom:0"><input type="checkbox" id="capture-fullpage"><span class="toggle-slider"></span></label>
      <span style="font-size:13px">Full page screenshot</span>
    </div>
    <div id="capture-progress" style="display:none" class="mt-12">
      <p style="font-size:13px;color:var(--text-dim)">Capturing screenshot...</p>
      <div class="progress"><div class="progress-bar" style="width:50%;animation:pulse 1s infinite"></div></div>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="capture-btn" onclick="captureScreenshot()">Capture</button>
  `);
}

async function captureScreenshot() {
  const url = $('#capture-url').value;
  if (!url) return toast('URL is required', 'error');
  $('#capture-progress').style.display = 'block';
  $('#capture-btn').disabled = true;
  try {
    const ss = await api('/screenshots/capture', { method: 'POST', body: {
      url, width: parseInt($('#capture-width').value) || 1280, height: parseInt($('#capture-height').value) || 800,
      fullPage: $('#capture-fullpage').checked, selector: $('#capture-selector').value || undefined
    }});
    closeModal();
    toast('Screenshot captured', 'success');
    viewScreenshot(ss.id);
  } catch (e) {
    toast('Capture failed: ' + e.message, 'error');
    $('#capture-progress').style.display = 'none';
    $('#capture-btn').disabled = false;
  }
}

// ============ Screenshot Annotation Editor ============
let annotationState = { tool: 'arrow', color: '#ef4444', lineWidth: 3, annotations: [], currentAnnotation: null, stepCounter: 1 };

async function viewScreenshot(id) {
  const ss = await api(`/screenshots/${id}`);
  currentPage = 'screenshot-editor';
  annotationState = { tool: 'arrow', color: '#ef4444', lineWidth: 3, annotations: ss.annotations || [], currentAnnotation: null, stepCounter: (ss.annotations || []).filter(a => a.type === 'step').length + 1 };

  const el = $('#page-content');
  el.innerHTML = `
    <div class="flex-between mb-16">
      <button class="btn btn-sm" onclick="navigate('screenshots')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to Screenshots
      </button>
      <div class="flex gap-8">
        <button class="btn btn-sm btn-danger" onclick="deleteScreenshot('${id}')">Delete</button>
        <button class="btn btn-sm btn-green" onclick="exportAnnotated('${id}')">Export PNG</button>
        <button class="btn btn-primary btn-sm" onclick="saveAnnotations('${id}')">Save</button>
      </div>
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${escHtml(ss.url)} &middot; ${ss.width}x${ss.height}</p>

    <div class="annotation-toolbar" id="anno-toolbar">
      <button class="tool-btn active" data-tool="arrow" onclick="setTool('arrow',this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        Arrow
      </button>
      <button class="tool-btn" data-tool="box" onclick="setTool('box',this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        Box
      </button>
      <button class="tool-btn" data-tool="circle" onclick="setTool('circle',this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
        Circle
      </button>
      <button class="tool-btn" data-tool="highlight" onclick="setTool('highlight',this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="8" rx="1"/></svg>
        Highlight
      </button>
      <button class="tool-btn" data-tool="text" onclick="setTool('text',this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9.5" y1="20" x2="14.5" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        Text
      </button>
      <button class="tool-btn" data-tool="step" onclick="setTool('step',this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="currentColor" stroke="none">1</text></svg>
        Step
      </button>
      <div class="separator"></div>
      ${['#ef4444','#f59e0b','#22c55e','#06b6d4','#a855f7','#ffffff'].map(c => `<div class="color-swatch ${c === annotationState.color ? 'active' : ''}" style="background:${c}" onclick="setAnnoColor('${c}',this)"></div>`).join('')}
      <div class="separator"></div>
      <button class="tool-btn" onclick="undoAnnotation()">Undo</button>
      <button class="tool-btn" onclick="clearAnnotations()">Clear</button>
    </div>

    <div class="annotation-container" id="anno-container">
      <canvas id="anno-canvas"></canvas>
    </div>
  `;

  // Load image and setup canvas
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = $('#anno-canvas');
    const maxW = el.clientWidth - 64;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    canvas._img = img;
    canvas._scale = scale;
    canvas._ssId = id;
    redrawCanvas();
    setupCanvasEvents(canvas);
  };
  img.src = ss.path;
}

function setTool(tool, btn) {
  annotationState.tool = tool;
  $$('.tool-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setAnnoColor(color, el) {
  annotationState.color = color;
  $$('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

function redrawCanvas() {
  const canvas = $('#anno-canvas');
  if (!canvas || !canvas._img) return;
  const ctx = canvas.getContext('2d');
  const scale = canvas._scale;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(canvas._img, 0, 0, canvas.width, canvas.height);

  annotationState.annotations.forEach(a => drawAnnotation(ctx, a, scale));
  if (annotationState.currentAnnotation) drawAnnotation(ctx, annotationState.currentAnnotation, scale);
}

function drawAnnotation(ctx, a, scale) {
  ctx.save();
  ctx.strokeStyle = a.color || '#ef4444';
  ctx.fillStyle = a.color || '#ef4444';
  ctx.lineWidth = (a.lineWidth || 3);
  ctx.font = '14px DM Sans, sans-serif';

  const x1 = a.x1 * scale, y1 = a.y1 * scale, x2 = (a.x2 || a.x1) * scale, y2 = (a.y2 || a.y1) * scale;

  switch (a.type) {
    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 12;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - 0.5), y2 - headLen * Math.sin(angle - 0.5));
      ctx.lineTo(x2 - headLen * Math.cos(angle + 0.5), y2 - headLen * Math.sin(angle + 0.5));
      ctx.closePath();
      ctx.fill();
      break;
    case 'box':
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      break;
    case 'circle':
      const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
      ctx.beginPath();
      ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'highlight':
      ctx.globalAlpha = 0.3;
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.globalAlpha = 1;
      break;
    case 'text':
      ctx.font = 'bold 16px DM Sans, sans-serif';
      ctx.fillText(a.text || 'Text', x1, y1);
      break;
    case 'step':
      const r = 14;
      ctx.beginPath();
      ctx.arc(x1, y1, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.num || '1', x1, y1);
      break;
  }
  ctx.restore();
}

function setupCanvasEvents(canvas) {
  let drawing = false;
  const scale = canvas._scale;
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  canvas.addEventListener('mousedown', (e) => {
    const pos = getPos(e);
    if (annotationState.tool === 'text') {
      const text = prompt('Enter text label:');
      if (text) {
        annotationState.annotations.push({ type: 'text', x1: pos.x, y1: pos.y, text, color: annotationState.color });
        redrawCanvas();
      }
      return;
    }
    if (annotationState.tool === 'step') {
      annotationState.annotations.push({ type: 'step', x1: pos.x, y1: pos.y, num: annotationState.stepCounter++, color: annotationState.color });
      redrawCanvas();
      return;
    }
    drawing = true;
    annotationState.currentAnnotation = { type: annotationState.tool, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color: annotationState.color, lineWidth: annotationState.lineWidth };
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    annotationState.currentAnnotation.x2 = pos.x;
    annotationState.currentAnnotation.y2 = pos.y;
    redrawCanvas();
  });

  canvas.addEventListener('mouseup', () => {
    if (!drawing) return;
    drawing = false;
    if (annotationState.currentAnnotation) {
      annotationState.annotations.push(annotationState.currentAnnotation);
      annotationState.currentAnnotation = null;
      redrawCanvas();
    }
  });
}

function undoAnnotation() {
  annotationState.annotations.pop();
  redrawCanvas();
}
function clearAnnotations() {
  annotationState.annotations = [];
  annotationState.stepCounter = 1;
  redrawCanvas();
}

async function saveAnnotations(id) {
  await api(`/screenshots/${id}`, { method: 'PUT', body: { annotations: annotationState.annotations } });
  // Also export annotated image
  const canvas = $('#anno-canvas');
  if (canvas) {
    const imageData = canvas.toDataURL('image/png');
    await api(`/screenshots/${id}/annotated`, { method: 'POST', body: { imageData } });
  }
  toast('Annotations saved', 'success');
}

async function exportAnnotated(id) {
  const canvas = $('#anno-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `annotated-${id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('Screenshot exported', 'success');
}

async function deleteScreenshot(id) {
  if (!confirm('Delete this screenshot?')) return;
  await api(`/screenshots/${id}`, { method: 'DELETE' });
  toast('Screenshot deleted', 'success');
  navigate('screenshots');
}

// ============ VIDEOS ============
async function renderVideos(el) {
  const videos = await api('/videos');
  state.videos = videos;

  el.innerHTML = `
    <div class="flex-between mb-16">
      <div><h1>Explainer Videos</h1><p class="page-subtitle" style="margin-bottom:0">Compose videos from screenshots with voiceover narration</p></div>
      <button class="btn btn-primary" onclick="createVideo()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Video
      </button>
    </div>

    <div class="video-grid">
      ${videos.length ? videos.map(v => `
        <div class="video-card" onclick="editVideo('${v.id}')">
          <div class="flex-between mb-12">
            <span style="font-weight:600">${escHtml(v.title)}</span>
            <span class="badge badge-${v.status === 'rendered' ? 'published' : v.status === 'rendering' ? 'draft' : 'draft'}">${v.status}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted)">${(v.slides || []).length} slides &middot; ${timeAgo(v.updatedAt || v.createdAt)}</div>
        </div>
      `).join('') : '<div class="empty-state" style="grid-column:1/-1"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><p>No videos yet. Create an explainer video from screenshots and narration.</p></div>'}
    </div>
  `;
}

async function createVideo() {
  const video = await api('/videos', { method: 'POST', body: { title: 'Untitled Video', slides: [] } });
  toast('Video project created', 'success');
  editVideo(video.id);
}

async function editVideo(id) {
  const [video, screenshots] = await Promise.all([api(`/videos/${id}`), api('/screenshots')]);
  currentPage = 'video-editor';
  state.currentVideo = video;

  const el = $('#page-content');
  el.innerHTML = `
    <div class="flex-between mb-16">
      <button class="btn btn-sm" onclick="navigate('videos')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to Videos
      </button>
      <div class="flex gap-8">
        <button class="btn btn-sm btn-purple" onclick="renderVideo('${id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Render Video
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteVideo('${id}')">Delete</button>
        <button class="btn btn-primary btn-sm" onclick="saveVideo('${id}')">Save</button>
      </div>
    </div>

    <div class="form-group"><input type="text" id="video-title" value="${escHtml(video.title)}" placeholder="Video Title" style="font-size:18px;font-weight:600;padding:10px"></div>

    <div style="display:grid;grid-template-columns:1fr 320px;gap:20px">
      <div>
        <h3 class="mb-12">Slides</h3>
        <div class="slide-list" id="slide-list">
          ${(video.slides || []).map((s, i) => slideItemHtml(i, s, screenshots)).join('')}
        </div>
        <button class="btn btn-sm mt-12" onclick="addSlide()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Slide
        </button>
      </div>

      <div>
        <div class="card mb-12">
          <h3 style="margin-bottom:12px">Available Screenshots</h3>
          <div style="max-height:400px;overflow-y:auto">
            ${screenshots.length ? screenshots.map(s => `
              <div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="addSlideWithScreenshot('${s.id}', '${s.annotatedPath || s.path}', '${escHtml(s.url)}')">
                <img src="${s.annotatedPath || s.path}" style="width:60px;height:38px;object-fit:cover;border-radius:4px" onerror="this.style.display='none'">
                <div style="flex:1;min-width:0"><div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(s.url)}</div></div>
              </div>
            `).join('') : '<p style="font-size:12px;color:var(--text-muted)">No screenshots available. Capture some first.</p>'}
          </div>
        </div>

        ${video.status === 'rendered' && video.outputPath ? `
        <div class="card">
          <h3 style="margin-bottom:12px">Output</h3>
          <a href="${video.outputPath}" class="btn btn-green btn-sm" download>Download MP4</a>
        </div>` : ''}
      </div>
    </div>
  `;
}

function slideItemHtml(index, slide, screenshots) {
  return `
    <div class="slide-item" data-index="${index}">
      ${slide.imagePath ? `<img src="${slide.imagePath}" class="slide-thumb" onerror="this.style.background='var(--bg-hover)'">` : '<div class="slide-thumb" style="display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-muted)">No image</div>'}
      <div class="slide-info">
        <div class="slide-num">Slide ${index + 1}</div>
        <textarea class="slide-script-input" rows="2" placeholder="Narration script for this slide..." style="font-size:12px;padding:4px 8px;min-height:40px">${escHtml(slide.script || '')}</textarea>
        <div class="flex gap-8 mt-12">
          <input type="number" class="slide-duration" value="${slide.duration || 5}" min="1" max="30" style="width:60px;font-size:11px;padding:3px 6px" title="Duration (seconds)">
          <span style="font-size:11px;color:var(--text-muted);align-self:center">sec</span>
          <button class="btn btn-sm" onclick="generateSlideTTS(${index})" title="Generate voiceover">TTS</button>
          <button class="btn btn-sm btn-danger" onclick="removeSlide(${index})">&times;</button>
        </div>
        ${slide.audioPath ? `<div style="margin-top:4px"><audio controls src="${slide.audioPath}" style="height:24px;width:100%"></audio></div>` : ''}
      </div>
    </div>
  `;
}

function addSlide() {
  const list = $('#slide-list');
  const index = $$('.slide-item').length;
  list.insertAdjacentHTML('beforeend', slideItemHtml(index, { script: '', duration: 5 }, []));
}

function addSlideWithScreenshot(ssId, imagePath, url) {
  const list = $('#slide-list');
  const index = $$('.slide-item').length;
  list.insertAdjacentHTML('beforeend', slideItemHtml(index, { screenshotId: ssId, imagePath, script: '', duration: 5 }, []));
  toast('Slide added', 'info');
}

function removeSlide(index) {
  const items = $$('.slide-item');
  items[index]?.remove();
}

function collectVideoData() {
  const slides = $$('.slide-item').map((el, i) => {
    const img = el.querySelector('.slide-thumb');
    return {
      screenshotId: el.dataset?.screenshotId || null,
      imagePath: img?.src || null,
      script: el.querySelector('.slide-script-input')?.value || '',
      duration: parseInt(el.querySelector('.slide-duration')?.value) || 5,
      audioPath: el.querySelector('audio')?.src || null
    };
  });
  return { title: $('#video-title').value, slides };
}

async function saveVideo(id) {
  const data = collectVideoData();
  await api(`/videos/${id}`, { method: 'PUT', body: data });
  toast('Video saved', 'success');
}

async function deleteVideo(id) {
  if (!confirm('Delete this video project?')) return;
  await api(`/videos/${id}`, { method: 'DELETE' });
  toast('Video deleted', 'success');
  navigate('videos');
}

async function generateSlideTTS(index) {
  const items = $$('.slide-item');
  const scriptInput = items[index]?.querySelector('.slide-script-input');
  const text = scriptInput?.value;
  if (!text) return toast('Write a narration script first', 'error');
  toast('Generating voiceover...', 'info');
  try {
    const result = await api('/videos/tts', { method: 'POST', body: { text } });
    // Add audio element
    const existing = items[index]?.querySelector('audio');
    if (existing) existing.src = result.path;
    else {
      const info = items[index]?.querySelector('.slide-info');
      info?.insertAdjacentHTML('beforeend', `<div style="margin-top:4px"><audio controls src="${result.path}" style="height:24px;width:100%"></audio></div>`);
    }
    toast('Voiceover generated', 'success');
  } catch (e) {
    toast('TTS failed. Check ElevenLabs API key in Settings.', 'error');
  }
}

async function renderVideo(id) {
  await saveVideo(id);
  toast('Rendering video...', 'info');
  try {
    const result = await api('/videos/render', { method: 'POST', body: { videoId: id } });
    toast(result.message || 'Video rendered', 'success');
    editVideo(id);
  } catch (e) {
    toast('Render failed', 'error');
  }
}

// ============ SUGGESTIONS ============
async function renderSuggestions(el) {
  const suggestions = await api('/suggestions');
  state.suggestions = suggestions;

  el.innerHTML = `
    <h1>Content Suggestions</h1>
    <p class="page-subtitle">AI-powered recommendations based on your knowledge base and articles</p>

    ${suggestions.length ? `
    <div class="suggestion-grid">
      ${suggestions.map(s => `
        <div class="suggestion-card">
          <div class="suggestion-icon" style="background:var(--${s.type === 'setup' ? 'purple' : s.type === 'article-gap' ? 'accent' : s.type === 'article-type' ? 'amber' : s.type === 'video' ? 'purple' : 'green'}-dim)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--${s.type === 'setup' ? 'purple' : s.type === 'article-gap' ? 'accent' : s.type === 'article-type' ? 'amber' : s.type === 'video' ? 'purple' : 'green'})" stroke-width="2">
              ${s.type === 'video' ? '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>' :
                s.type === 'screenshot' ? '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' :
                '<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>'}
            </svg>
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">${escHtml(s.title)}</div>
            <div class="suggestion-desc">${escHtml(s.description)}</div>
          </div>
          <div class="flex gap-8" style="flex-shrink:0;align-items:center">
            <span class="badge badge-${s.type}">${s.type.replace('-', ' ')}</span>
            <span class="badge badge-${s.priority}">${s.priority}</span>
          </div>
        </div>
      `).join('')}
    </div>` : `
    <div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
      <p>No suggestions right now. Upload knowledge base documents and create articles to get content gap analysis.</p>
    </div>`}
  `;
}

// ============ SETTINGS ============
async function renderSettings(el) {
  const settings = await api('/settings');
  state.settings = settings;

  el.innerHTML = `
    <h1>Settings</h1>
    <p class="page-subtitle">Configure integrations and preferences</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">
      <div class="card">
        <h3 style="margin-bottom:16px">ElevenLabs TTS</h3>
        <div class="form-group"><label>API Key</label><input type="password" id="settings-elevenlabs-key" value="${escHtml(settings.elevenLabsApiKey || '')}" placeholder="Enter your ElevenLabs API key"></div>
        <div class="form-group"><label>Voice ID</label><input type="text" id="settings-elevenlabs-voice" value="${escHtml(settings.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM')}" placeholder="Voice ID (default: Rachel)"></div>
        <p style="font-size:11px;color:var(--text-muted)">Used for generating voiceovers in explainer videos. Get your API key from elevenlabs.io</p>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px">Site Configuration</h3>
        <div class="form-group"><label>Site Name</label><input type="text" id="settings-site-name" value="${escHtml(settings.siteName || '')}" placeholder="Your Company"></div>
        <div class="form-group"><label>Site URL</label><input type="url" id="settings-site-url" value="${escHtml(settings.siteUrl || '')}" placeholder="https://docs.example.com"></div>
        <div class="form-group"><label>Default Author</label><input type="text" id="settings-author" value="${escHtml(settings.defaultAuthor || '')}" placeholder="Author name for articles"></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px">Video Rendering</h3>
        <div class="form-group"><label>Remotion Concurrency</label><input type="number" id="settings-remotion-concurrency" value="${settings.remotionConcurrency || 1}" min="1" max="8"></div>
        <p style="font-size:11px;color:var(--text-muted)">Number of parallel Remotion render threads. Higher values use more CPU/RAM.</p>
      </div>
    </div>

    <button class="btn btn-primary mt-24" onclick="saveSettings()">Save Settings</button>
  `;
}

async function saveSettings() {
  const data = {
    elevenLabsApiKey: $('#settings-elevenlabs-key').value,
    elevenLabsVoiceId: $('#settings-elevenlabs-voice').value,
    siteName: $('#settings-site-name').value,
    siteUrl: $('#settings-site-url').value,
    defaultAuthor: $('#settings-author').value,
    remotionConcurrency: parseInt($('#settings-remotion-concurrency').value) || 1
  };
  await api('/settings', { method: 'POST', body: data });
  toast('Settings saved', 'success');
}

// ============ Init ============
render();
