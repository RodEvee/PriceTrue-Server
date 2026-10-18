const axios = require('axios');

const STORE_COLORS = {
  'walmart': '#0071CE',
  'amazon': '#FF9900',
  'target': '#CC0000',
  'costco': '#E31837',
  'best buy': '#003B64',
  'walgreens': '#E31837',
  'cvs': '#CC0000',
  'sam\'s club': '#0071CE',
};

function getStoreColor(storeName) {
  if (!storeName) return '#666';
  const lower = storeName.toLowerCase();
  for (const [key, color] of Object.entries(STORE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#666';
}

function parsePrice(text) {
  if (!text) return null;
  const match = String(text).replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function parsePackSize(title) {
  const t = (title || '').toLowerCase();

  const countMatch = t.match(/(\d+)\s*(?:count|ct|pk|pack|-pack|pods?|loads?|each)/);
  if (countMatch) return { quantity: parseInt(countMatch[1]), unit: 'count' };

  const ozMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz/);
  if (ozMatch) return { quantity: parseFloat(ozMatch[1]), unit: 'oz' };

  const lbMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound)/);
  if (lbMatch) return { quantity: parseFloat(lbMatch[1]) * 16, unit: 'oz' };

  const rollMatch = t.match(/(\d+)\s*(double|triple|mega)?\s*roll/);
  if (rollMatch) {
    const qty = parseInt(rollMatch[1]);
    const mult = rollMatch[2] === 'double' ? 2 : rollMatch[2] === 'triple' ? 3 : rollMatch[2] === 'mega' ? 4 : 1;
    return { quantity: qty * mult, unit: 'roll' };
  }

  return null;
}

async function searchSerpApi(query) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY not set');

  const url = 'https://serpapi.com/search';
  const response = await axios.get(url, {
    params: {
      engine: 'google_shopping',
      q: query,
      api_key: apiKey,
      num: 20,
      gl: 'us',
      hl: 'en',
    },
    timeout: 15000,
  });

  const items = response.data?.shopping_results || [];
  const results = [];

  for (const item of items) {
    try {
      const title = item.title || '';
      const price = parsePrice(item.price);
      const store = item.source || 'Unknown';
      const packInfo = parsePackSize(title);
      const unitPrice = packInfo && price ? +(price / packInfo.quantity).toFixed(4) : null;

      if (!title || !price || price <= 0) continue;

      results.push({
        title,
        store,
        storeColor: getStoreColor(store),
        price,
        packInfo,
        unitPrice,
        url: item.link || item.product_link || null,
        image: item.thumbnail || null,
      });
    } catch (e) {
      // skip bad entries
    }
  }

  return results;
}

module.exports = { searchSerpApi, parsePackSize, parsePrice };
