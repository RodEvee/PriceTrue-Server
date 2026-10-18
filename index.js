const express = require('express');
const { scrapeWalmart } = require('./scraper');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Simple in-memory cache (10 min TTL)
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { cache.set(key, { data, ts: Date.now() }); }

// GET /search?q=duracell+aa+batteries
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing ?q= param' });

  const key = query.toLowerCase().trim();
  const cached = getCached(key);
  if (cached) {
    console.log(`[cache] ${query}`);
    return res.json({ source: 'cache', count: cached.length, results: cached });
  }

  console.log(`[live] scraping Walmart for: ${query}`);
  try {
    const results = await scrapeWalmart(query);
    setCache(key, results);
    res.json({ source: 'live', count: results.length, results });
  } catch (err) {
    console.error('[error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`✅ PriceTrue server on http://localhost:${PORT}`);
  console.log(`   Test: curl "http://localhost:${PORT}/search?q=duracell+aa+batteries"`);
});
