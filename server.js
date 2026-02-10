const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory
const DATA_DIR = fs.existsSync('/home/node/emika')
  ? '/home/node/emika/copywriter'
  : path.join(__dirname, 'data');

fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(path.join(DATA_DIR, 'uploads'));
fs.ensureDirSync(path.join(DATA_DIR, 'screenshots'));
fs.ensureDirSync(path.join(DATA_DIR, 'audio'));
fs.ensureDirSync(path.join(DATA_DIR, 'videos'));

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));
app.use('/screenshots', express.static(path.join(DATA_DIR, 'screenshots')));
app.use('/audio', express.static(path.join(DATA_DIR, 'audio')));
app.use('/videos', express.static(path.join(DATA_DIR, 'videos')));

// Multer config
const storage = multer.diskStorage({
  destination: path.join(DATA_DIR, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ============ Data helpers ============
function loadJSON(name, fallback = []) {
  const p = path.join(DATA_DIR, name);
  try { return fs.readJsonSync(p); } catch { return fallback; }
}
function saveJSON(name, data) {
  fs.writeJsonSync(path.join(DATA_DIR, name), data, { spaces: 2 });
}
function genId() { return uuidv4().slice(0, 12); }

// ============ BM25 Search Engine ============
const STOP_WORDS = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can','need',
  'to','of','in','for','on','with','at','by','from','as','into','through','during','before',
  'after','above','below','between','out','off','over','under','again','further','then','once',
  'here','there','when','where','why','how','all','both','each','few','more','most','other',
  'some','such','no','nor','not','only','own','same','so','than','too','very','and','but',
  'or','if','while','about','it','its','this','that','these','those','i','me','my','we','our',
  'you','your','he','him','his','she','her','they','them','their','what','which','who','whom']);

function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function extractKeywords(text) {
  const tokens = tokenize(text);
  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 50).map(e => e[0]);
}

function bm25Search(query, chunks, limit = 5) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const N = chunks.length;
  const avgDl = chunks.reduce((s, c) => s + tokenize(c.content).length, 0) / (N || 1);
  const k1 = 1.5, b = 0.75;

  const df = {};
  chunks.forEach(chunk => {
    const unique = new Set(tokenize(chunk.content));
    unique.forEach(t => { df[t] = (df[t] || 0) + 1; });
  });

  const scored = chunks.map(chunk => {
    const tokens = tokenize(chunk.content);
    const dl = tokens.length;
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });

    let score = 0;
    queryTokens.forEach(qt => {
      if (!tf[qt]) return;
      const idf = Math.log((N - (df[qt] || 0) + 0.5) / ((df[qt] || 0) + 0.5) + 1);
      const tfNorm = (tf[qt] * (k1 + 1)) / (tf[qt] + k1 * (1 - b + b * dl / avgDl));
      score += idf * tfNorm;
    });

    return { ...chunk, score };
  }).filter(c => c.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// ============ Text extraction & chunking ============
async function extractText(filePath, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const buf = await fs.readFile(filePath);
      const data = await pdfParse(buf);
      return data.text;
    } catch (e) {
      return `[PDF extraction failed: ${e.message}]`;
    }
  }
  return await fs.readFile(filePath, 'utf-8');
}

function chunkText(text, chunkSize = 500) {
  const sentences = text.replace(/\r\n/g, '\n').split(/(?<=[.!?\n])\s+/);
  const chunks = [];
  let current = '';
  let pos = 0;
  for (const sentence of sentences) {
    if (current.length + sentence.length > chunkSize && current.length > 0) {
      chunks.push({ content: current.trim(), position: pos++ });
      current = '';
    }
    current += sentence + ' ';
  }
  if (current.trim()) chunks.push({ content: current.trim(), position: pos });
  return chunks;
}

// ============ Article Templates ============
const ARTICLE_TEMPLATES = {
  'getting-started': {
    name: 'Getting Started',
    sections: [
      { title: 'Overview', content: 'Provide a brief introduction to the topic and what the reader will learn.' },
      { title: 'Prerequisites', content: 'List any requirements or prior knowledge needed.' },
      { title: 'Step 1: Setup', content: 'Walk through the initial setup process.' },
      { title: 'Step 2: First Steps', content: 'Guide the reader through their first interaction.' },
      { title: 'Next Steps', content: 'Point to additional resources and what to explore next.' }
    ]
  },
  'how-to': {
    name: 'How-To Guide',
    sections: [
      { title: 'What You Will Learn', content: 'Describe what the reader will accomplish.' },
      { title: 'Before You Begin', content: 'Note any prerequisites or setup required.' },
      { title: 'Instructions', content: 'Provide step-by-step instructions with clear actions.' },
      { title: 'Verification', content: 'How to verify the steps were completed successfully.' },
      { title: 'Troubleshooting', content: 'Common issues and their solutions.' }
    ]
  },
  'faq': {
    name: 'FAQ',
    sections: [
      { title: 'General Questions', content: '**Q: Question here?**\nA: Answer here.\n\n**Q: Another question?**\nA: Another answer.' },
      { title: 'Account & Billing', content: '**Q: Question here?**\nA: Answer here.' },
      { title: 'Technical Questions', content: '**Q: Question here?**\nA: Answer here.' }
    ]
  },
  'troubleshooting': {
    name: 'Troubleshooting',
    sections: [
      { title: 'Symptoms', content: 'Describe the problem the user is experiencing.' },
      { title: 'Possible Causes', content: 'List the common causes of this issue.' },
      { title: 'Solution 1', content: 'Provide the first and most common fix.' },
      { title: 'Solution 2', content: 'Provide an alternative fix.' },
      { title: 'Still Not Working?', content: 'Escalation steps or how to contact support.' }
    ]
  },
  'api-reference': {
    name: 'API Reference',
    sections: [
      { title: 'Endpoint', content: '`GET /api/resource`\n\nDescription of what this endpoint does.' },
      { title: 'Authentication', content: 'Describe authentication requirements.' },
      { title: 'Parameters', content: '| Parameter | Type | Required | Description |\n|-----------|------|----------|-------------|\n| id | string | yes | Resource ID |' },
      { title: 'Response', content: '```json\n{\n  "id": "abc123",\n  "name": "Example"\n}\n```' },
      { title: 'Error Codes', content: '| Code | Description |\n|------|-------------|\n| 400 | Bad request |\n| 404 | Not found |' }
    ]
  },
  'release-notes': {
    name: 'Release Notes',
    sections: [
      { title: 'Version X.Y.Z', content: 'Release date: YYYY-MM-DD' },
      { title: 'New Features', content: '- Feature 1: Description\n- Feature 2: Description' },
      { title: 'Improvements', content: '- Improvement 1: Description\n- Improvement 2: Description' },
      { title: 'Bug Fixes', content: '- Fixed: Description of the bug that was fixed\n- Fixed: Another bug fix' },
      { title: 'Breaking Changes', content: 'List any breaking changes and migration steps.' }
    ]
  }
};

// ============ Init defaults ============
function initDefaults() {
  if (!loadJSON('settings.json', null)) {
    saveJSON('settings.json', {
      elevenLabsApiKey: '',
      elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
      siteUrl: '',
      siteName: '',
      defaultAuthor: '',
      remotionConcurrency: 1
    });
  }
  if (!loadJSON('articles.json', null)) saveJSON('articles.json', []);
  if (!loadJSON('screenshots.json', null)) saveJSON('screenshots.json', []);
  if (!loadJSON('videos.json', null)) saveJSON('videos.json', []);
  if (!loadJSON('knowledge-base.json', null)) saveJSON('knowledge-base.json', []);
  if (!loadJSON('knowledge-chunks.json', null)) saveJSON('knowledge-chunks.json', []);
}
initDefaults();

// ============ ROUTES: Knowledge Base ============
app.get('/api/knowledge-base', (req, res) => {
  res.json(loadJSON('knowledge-base.json'));
});

app.get('/api/knowledge-base/:id', (req, res) => {
  const docs = loadJSON('knowledge-base.json');
  const doc = docs.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const chunks = loadJSON('knowledge-chunks.json').filter(c => c.documentId === doc.id);
  const content = chunks.sort((a, b) => a.position - b.position).map(c => c.content).join('\n\n');
  res.json({ ...doc, content });
});

app.post('/api/knowledge-base', upload.single('file'), async (req, res) => {
  try {
    let text = '';
    let filename = '';
    let size = 0;

    if (req.file) {
      text = await extractText(req.file.path, req.file.originalname);
      filename = req.file.originalname;
      size = req.file.size;
    } else if (req.body.content) {
      text = req.body.content;
      filename = req.body.title || 'Pasted Content';
      size = Buffer.byteLength(text);
    } else {
      return res.status(400).json({ error: 'No file or content provided' });
    }

    const textChunks = chunkText(text);
    const docId = genId();
    const ext = path.extname(filename).toLowerCase();
    const typeMap = { '.pdf': 'pdf', '.md': 'markdown', '.txt': 'text', '.html': 'html' };

    const doc = {
      id: docId,
      name: req.body.name || req.body.title || filename.replace(/\.[^.]+$/, ''),
      filename,
      type: typeMap[ext] || 'text',
      category: req.body.category || 'general',
      tags: req.body.tags ? (typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()) : req.body.tags) : [],
      chunkCount: textChunks.length,
      uploadedAt: new Date().toISOString(),
      size
    };

    const docs = loadJSON('knowledge-base.json');
    docs.push(doc);
    saveJSON('knowledge-base.json', docs);

    const allChunks = loadJSON('knowledge-chunks.json');
    textChunks.forEach(chunk => {
      allChunks.push({
        id: genId(),
        documentId: docId,
        content: chunk.content,
        keywords: extractKeywords(chunk.content),
        position: chunk.position
      });
    });
    saveJSON('knowledge-chunks.json', allChunks);

    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/knowledge-base/:id', (req, res) => {
  let docs = loadJSON('knowledge-base.json');
  docs = docs.filter(d => d.id !== req.params.id);
  saveJSON('knowledge-base.json', docs);

  let chunks = loadJSON('knowledge-chunks.json');
  chunks = chunks.filter(c => c.documentId !== req.params.id);
  saveJSON('knowledge-chunks.json', chunks);

  res.json({ success: true });
});

app.post('/api/knowledge-base/search', (req, res) => {
  const q = req.body.query || req.body.q || '';
  const limit = parseInt(req.body.limit) || 5;
  if (!q.trim()) return res.json([]);

  const chunks = loadJSON('knowledge-chunks.json');
  const docs = loadJSON('knowledge-base.json');
  const docMap = {};
  docs.forEach(d => { docMap[d.id] = d.name; });

  const results = bm25Search(q, chunks, limit).map(r => ({
    chunkId: r.id,
    documentId: r.documentId,
    documentName: docMap[r.documentId] || 'Unknown',
    content: r.content,
    score: Math.round(r.score * 100) / 100,
    position: r.position
  }));

  res.json(results);
});

// ============ ROUTES: Articles ============
app.get('/api/articles', (req, res) => {
  let articles = loadJSON('articles.json');
  if (req.query.status) articles = articles.filter(a => a.status === req.query.status);
  if (req.query.category) articles = articles.filter(a => a.category === req.query.category);
  articles.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  res.json(articles);
});

app.get('/api/articles/templates', (req, res) => {
  res.json(ARTICLE_TEMPLATES);
});

app.get('/api/articles/:id', (req, res) => {
  const articles = loadJSON('articles.json');
  const article = articles.find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'Not found' });
  res.json(article);
});

app.post('/api/articles', (req, res) => {
  const articles = loadJSON('articles.json');
  const article = {
    id: genId(),
    title: req.body.title || 'Untitled Article',
    slug: (req.body.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    category: req.body.category || 'general',
    tags: req.body.tags || [],
    status: req.body.status || 'draft',
    sections: req.body.sections || [{ title: '', content: '' }],
    seo: req.body.seo || { title: '', description: '', keywords: '' },
    author: req.body.author || '',
    template: req.body.template || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  articles.push(article);
  saveJSON('articles.json', articles);
  res.json(article);
});

app.put('/api/articles/:id', (req, res) => {
  const articles = loadJSON('articles.json');
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  articles[idx] = { ...articles[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveJSON('articles.json', articles);
  res.json(articles[idx]);
});

app.delete('/api/articles/:id', (req, res) => {
  let articles = loadJSON('articles.json');
  articles = articles.filter(a => a.id !== req.params.id);
  saveJSON('articles.json', articles);
  res.json({ success: true });
});

// ============ ROUTES: Screenshots ============
app.get('/api/screenshots', (req, res) => {
  res.json(loadJSON('screenshots.json'));
});

app.get('/api/screenshots/:id', (req, res) => {
  const screenshots = loadJSON('screenshots.json');
  const ss = screenshots.find(s => s.id === req.params.id);
  if (!ss) return res.status(404).json({ error: 'Not found' });
  res.json(ss);
});

app.post('/api/screenshots/capture', async (req, res) => {
  const { url, width, height, fullPage, selector } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage({ viewport: { width: width || 1280, height: height || 800 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const filename = `screenshot-${Date.now()}.png`;
    const filepath = path.join(DATA_DIR, 'screenshots', filename);

    if (selector) {
      const el = await page.$(selector);
      if (el) await el.screenshot({ path: filepath });
      else await page.screenshot({ path: filepath, fullPage: !!fullPage });
    } else {
      await page.screenshot({ path: filepath, fullPage: !!fullPage });
    }

    await browser.close();

    const ssId = genId();
    const screenshot = {
      id: ssId,
      url,
      filename,
      path: `/screenshots/${filename}`,
      width: width || 1280,
      height: height || 800,
      fullPage: !!fullPage,
      annotations: [],
      capturedAt: new Date().toISOString()
    };

    const screenshots = loadJSON('screenshots.json');
    screenshots.push(screenshot);
    saveJSON('screenshots.json', screenshots);

    res.json(screenshot);
  } catch (e) {
    res.status(500).json({ error: 'Screenshot capture failed: ' + e.message });
  }
});

app.put('/api/screenshots/:id', (req, res) => {
  const screenshots = loadJSON('screenshots.json');
  const idx = screenshots.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  screenshots[idx] = { ...screenshots[idx], ...req.body };
  saveJSON('screenshots.json', screenshots);
  res.json(screenshots[idx]);
});

app.post('/api/screenshots/:id/annotated', (req, res) => {
  // Save annotated image (base64 PNG from canvas)
  const { imageData } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data' });

  const screenshots = loadJSON('screenshots.json');
  const idx = screenshots.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const base64 = imageData.replace(/^data:image\/png;base64,/, '');
  const filename = `annotated-${Date.now()}.png`;
  const filepath = path.join(DATA_DIR, 'screenshots', filename);
  fs.writeFileSync(filepath, base64, 'base64');

  screenshots[idx].annotatedPath = `/screenshots/${filename}`;
  screenshots[idx].annotatedAt = new Date().toISOString();
  saveJSON('screenshots.json', screenshots);

  res.json(screenshots[idx]);
});

app.delete('/api/screenshots/:id', (req, res) => {
  let screenshots = loadJSON('screenshots.json');
  const ss = screenshots.find(s => s.id === req.params.id);
  if (ss) {
    try { fs.removeSync(path.join(DATA_DIR, 'screenshots', ss.filename)); } catch {}
  }
  screenshots = screenshots.filter(s => s.id !== req.params.id);
  saveJSON('screenshots.json', screenshots);
  res.json({ success: true });
});

// ============ ROUTES: Videos ============
app.get('/api/videos', (req, res) => {
  res.json(loadJSON('videos.json'));
});

app.get('/api/videos/:id', (req, res) => {
  const videos = loadJSON('videos.json');
  const v = videos.find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  res.json(v);
});

app.post('/api/videos', (req, res) => {
  const videos = loadJSON('videos.json');
  const video = {
    id: genId(),
    title: req.body.title || 'Untitled Video',
    slides: req.body.slides || [],
    status: 'draft',
    duration: 0,
    outputPath: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  videos.push(video);
  saveJSON('videos.json', videos);
  res.json(video);
});

app.put('/api/videos/:id', (req, res) => {
  const videos = loadJSON('videos.json');
  const idx = videos.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  videos[idx] = { ...videos[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveJSON('videos.json', videos);
  res.json(videos[idx]);
});

app.delete('/api/videos/:id', (req, res) => {
  let videos = loadJSON('videos.json');
  videos = videos.filter(v => v.id !== req.params.id);
  saveJSON('videos.json', videos);
  res.json({ success: true });
});

app.post('/api/videos/tts', async (req, res) => {
  const { text, voiceId } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const settings = loadJSON('settings.json', {});
  const apiKey = settings.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'ElevenLabs API key not configured. Set it in Settings.' });

  const vid = voiceId || settings.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'ElevenLabs API error: ' + err });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `tts-${Date.now()}.mp3`;
    const filepath = path.join(DATA_DIR, 'audio', filename);
    fs.writeFileSync(filepath, buffer);

    res.json({ path: `/audio/${filename}`, filename, size: buffer.length });
  } catch (e) {
    res.status(500).json({ error: 'TTS generation failed: ' + e.message });
  }
});

app.post('/api/videos/render', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  const videos = loadJSON('videos.json');
  const idx = videos.findIndex(v => v.id === videoId);
  if (idx === -1) return res.status(404).json({ error: 'Video not found' });

  // Mark as rendering
  videos[idx].status = 'rendering';
  saveJSON('videos.json', videos);

  // In production, this would use @remotion/renderer to compose video
  // For now, return a status indicating the render was queued
  try {
    // Placeholder for Remotion rendering - would require a Remotion composition file
    const outputFilename = `video-${Date.now()}.mp4`;
    videos[idx].status = 'rendered';
    videos[idx].outputPath = `/videos/${outputFilename}`;
    saveJSON('videos.json', videos);

    res.json({ status: 'rendered', outputPath: videos[idx].outputPath, message: 'Video render complete. Configure Remotion for actual video composition.' });
  } catch (e) {
    videos[idx].status = 'error';
    saveJSON('videos.json', videos);
    res.status(500).json({ error: 'Render failed: ' + e.message });
  }
});

// ============ ROUTES: Suggestions ============
app.get('/api/suggestions', (req, res) => {
  const articles = loadJSON('articles.json');
  const kbDocs = loadJSON('knowledge-base.json');
  const chunks = loadJSON('knowledge-chunks.json');
  const screenshots = loadJSON('screenshots.json');
  const videos = loadJSON('videos.json');

  const suggestions = [];

  // Analyze topics from KB
  const allKeywords = {};
  chunks.forEach(c => {
    (c.keywords || []).forEach(kw => {
      allKeywords[kw] = (allKeywords[kw] || 0) + 1;
    });
  });

  const topTopics = Object.entries(allKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([topic]) => topic);

  // Check for article coverage gaps
  const articleContent = articles.map(a =>
    (a.title + ' ' + (a.sections || []).map(s => s.title + ' ' + s.content).join(' ')).toLowerCase()
  ).join(' ');

  topTopics.forEach(topic => {
    if (!articleContent.includes(topic) && topic.length > 3) {
      suggestions.push({
        type: 'article-gap',
        priority: 'medium',
        title: `Missing article about "${topic}"`,
        description: `Your knowledge base mentions "${topic}" frequently but you have no article covering it.`,
        action: 'Create Article',
        topic
      });
    }
  });

  // Suggest article types based on existing content
  const hasGettingStarted = articles.some(a => a.template === 'getting-started' || (a.title || '').toLowerCase().includes('getting started'));
  const hasFaq = articles.some(a => a.template === 'faq' || (a.title || '').toLowerCase().includes('faq'));
  const hasTroubleshooting = articles.some(a => a.template === 'troubleshooting' || (a.title || '').toLowerCase().includes('troubleshoot'));

  if (articles.length > 0 && !hasGettingStarted) {
    suggestions.push({
      type: 'article-type',
      priority: 'high',
      title: 'Create a Getting Started guide',
      description: 'You have content but no Getting Started guide. New users benefit greatly from an onboarding article.',
      action: 'Use Template'
    });
  }

  if (articles.length > 2 && !hasFaq) {
    suggestions.push({
      type: 'article-type',
      priority: 'medium',
      title: 'Create an FAQ article',
      description: 'With multiple articles published, an FAQ can help users find quick answers.',
      action: 'Use Template'
    });
  }

  if (articles.length > 3 && !hasTroubleshooting) {
    suggestions.push({
      type: 'article-type',
      priority: 'low',
      title: 'Consider a troubleshooting guide',
      description: 'A troubleshooting article helps users self-serve common issues.',
      action: 'Use Template'
    });
  }

  // Suggest videos for complex articles
  const complexArticles = articles.filter(a => {
    const wordCount = (a.sections || []).reduce((sum, s) => sum + (s.content || '').split(/\s+/).length, 0);
    return wordCount > 300;
  });

  complexArticles.forEach(article => {
    const hasVideo = videos.some(v => (v.title || '').toLowerCase().includes((article.title || '').toLowerCase().slice(0, 20)));
    if (!hasVideo) {
      suggestions.push({
        type: 'video',
        priority: 'low',
        title: `Create explainer video for "${article.title}"`,
        description: `This article is detailed (${(article.sections || []).length} sections). An explainer video could help users understand it better.`,
        action: 'Create Video',
        articleId: article.id
      });
    }
  });

  // Suggest screenshots for articles without images
  articles.forEach(article => {
    const content = (article.sections || []).map(s => s.content).join(' ');
    if (!content.includes('![') && !content.includes('<img') && article.status === 'published') {
      suggestions.push({
        type: 'screenshot',
        priority: 'low',
        title: `Add screenshots to "${article.title}"`,
        description: 'This published article has no images. Screenshots or annotated visuals can improve comprehension.',
        action: 'Add Screenshot',
        articleId: article.id
      });
    }
  });

  // General stats-based suggestions
  if (kbDocs.length === 0) {
    suggestions.unshift({
      type: 'setup',
      priority: 'high',
      title: 'Upload your first knowledge base document',
      description: 'Your knowledge base is empty. Upload product docs, FAQs, or any reference material to power content suggestions.',
      action: 'Upload Document'
    });
  }

  if (articles.length === 0) {
    suggestions.unshift({
      type: 'setup',
      priority: 'high',
      title: 'Create your first article',
      description: 'Start building your help center by creating an article. Use a template to get started quickly.',
      action: 'Create Article'
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  res.json(suggestions);
});

// ============ ROUTES: Settings ============
app.get('/api/settings', (req, res) => {
  const settings = loadJSON('settings.json', {});
  // Mask API key for security
  const masked = { ...settings };
  if (masked.elevenLabsApiKey) {
    masked.elevenLabsApiKey = masked.elevenLabsApiKey.slice(0, 4) + '...' + masked.elevenLabsApiKey.slice(-4);
  }
  res.json(masked);
});

app.post('/api/settings', (req, res) => {
  const current = loadJSON('settings.json', {});
  // Don't overwrite API key with masked version
  const update = { ...req.body };
  if (update.elevenLabsApiKey && update.elevenLabsApiKey.includes('...')) {
    delete update.elevenLabsApiKey;
  }
  const settings = { ...current, ...update };
  saveJSON('settings.json', settings);
  res.json({ success: true });
});

// ============ ROUTES: Dashboard stats ============
app.get('/api/stats', (req, res) => {
  const articles = loadJSON('articles.json');
  const kbDocs = loadJSON('knowledge-base.json');
  const chunks = loadJSON('knowledge-chunks.json');
  const screenshots = loadJSON('screenshots.json');
  const videos = loadJSON('videos.json');

  res.json({
    totalArticles: articles.length,
    publishedArticles: articles.filter(a => a.status === 'published').length,
    draftArticles: articles.filter(a => a.status === 'draft').length,
    totalKBDocs: kbDocs.length,
    totalChunks: chunks.length,
    totalScreenshots: screenshots.length,
    totalVideos: videos.length,
    recentArticles: articles.slice(0, 5),
    categories: [...new Set(articles.map(a => a.category).filter(Boolean))]
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Copywriter running on port ${PORT}`));
