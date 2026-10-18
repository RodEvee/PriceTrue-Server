const axios = require('axios');

async function debug() {
  const url = 'https://www.walmart.com/search?q=duracell+aa+batteries';
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 15000,
  });
  console.log('STATUS:', response.status);
  console.log('LENGTH:', response.data.length);
  console.log('HAS __NEXT_DATA__:', response.data.includes('__NEXT_DATA__'));
  console.log('HAS robot/captcha:', response.data.toLowerCase().includes('captcha') || response.data.toLowerCase().includes('robot'));
  console.log('\n--- FIRST 500 chars ---');
  console.log(response.data.substring(0, 500));
}

debug().catch(console.error);
