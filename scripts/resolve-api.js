const dns = require('dns');
const https = require('https');

const host = 'dnymnrceocbsgirwzphj.supabase.co';

console.log(`Resolving ${host}...`);
dns.lookup(host, (err, address, family) => {
  if (err) {
    console.log(`❌ DNS lookup failed: ${err.message}`);
  } else {
    console.log(`✅ IP address: ${address} (IPv${family})`);
  }
});

console.log(`Fetching headers from https://${host}...`);
https.get(`https://${host}`, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
}).on('error', (e) => {
  console.error(`❌ HTTP request failed: ${e.message}`);
});
