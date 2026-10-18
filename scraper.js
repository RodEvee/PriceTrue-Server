const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
};

function parsePrice(text) {
  if (!text && text !== 0) return null;
  if (typeof text === 'number') return text;
  const match = String(text).replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// Extract count/weight/unit from product name or unit size string
function parsePackSize(title, unitStr) {
  const src = (unitStr || title || '').toLowerCase();

  // count-based
  const countMatch = src.match(/(\d+)\s*(?:count|ct|pk|pack|-pack|each)/);
  if (countMatch) return { quantity: parseInt(countMatch[1]), unit: 'count' };

  // oz / fl oz
  const ozMatch = src.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz/);
  if (ozMatch) return { quantity: parseFloat(ozMatch[1]), unit: 'oz' };

  // lb
  const lbMatch = src.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound)/);
  if (lbMatch) return { quantity: parseFloat(lbMatch[1]) * 16, unit: 'oz' };

  // rolls
  const rollMatch = src.match(/(\d+)\s*(double|triple|mega)?\s*roll/);
  if (rollMatch) {
    const qty = parseInt(rollMatch[1]);
    const mult = rollMatch[2] === 'double' ? 2 : rollMatch[2] === 'triple' ? 3 : rollMatch[2] === 'mega' ? 4 : 1;
    return { quantity: qty * mult, unit: 'roll' };
  }

  // loads / pods
  const loadMatch = src.match(/(\d+)\s*(?:load|pod|pod)/);
  if (loadMatch) return { quantity: parseInt(loadMatch[1]), unit: 'count' };

  return null;
}

async function scrapeWalmart(query) {
  const url = `https://www.walmart.com/search?q=${encodeURIComponent(query)}&affinityOverride=default`;

  const response = await axios.get(url, {
    headers: HEADERS,
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);

  // Walmart embeds product data in a __NEXT_DATA__ JSON script tag
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (!nextDataScript) throw new Error('Could not find __NEXT_DATA__ in Walmart page');

  const nextData = JSON.parse(nextDataScript);

  // Navigate to search results
  const searchContent =
    nextData?.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items ||
    nextData?.props?.pageProps?.initialData?.searchResult?.items ||
    [];

  const results = [];

  for (const item of searchContent) {
    try {
      const name = item?.name || item?.title;
      const priceInfo = item?.priceInfo?.currentPrice || item?.price;
      const price = parsePrice(priceInfo?.price ?? priceInfo);
      const unitPrice = item?.priceInfo?.unitPrice;
      const unitStr = item?.priceInfo?.pricePerUnit || item?.salesUnit || '';

      if (!name || !price || price <= 0) continue;

      const packInfo = parsePackSize(name, unitStr);
      const computedUnitPrice = packInfo
        ? +(price / packInfo.quantity).toFixed(4)
        : parsePrice(unitPrice?.price);

      results.push({
        title: name,
        store: 'Walmart',
        storeColor: '#0071CE',
        price,
        packInfo,
        unitPrice: computedUnitPrice,
        unitPriceStr: unitPrice?.priceString || null,
        url: item?.canonicalUrl ? `https://www.walmart.com${item.canonicalUrl}` : null,
        image: item?.imageInfo?.thumbnailUrl || null,
      });
    } catch (e) {
      // skip bad entries
    }
  }

  return results.slice(0, 15); // top 15 results
}

module.exports = { scrapeWalmart, parsePackSize, parsePrice };
