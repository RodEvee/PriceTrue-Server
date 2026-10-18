const axios = require('axios');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function debug() {
  const query = 'duracell aa batteries 48 pack';
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop&num=10`;

  const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
  const html = response.data;

  console.log('STATUS:', response.status);
  console.log('LENGTH:', html.length);
  console.log('\n--- FIRST 3000 CHARS ---\n');
  console.log(html.substring(0, 3000));
}

debug().catch(console.error);
