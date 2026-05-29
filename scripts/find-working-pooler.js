const { Client } = require('pg');

const projectRef = 'dnymnrceocbsgirwzphj';
const password = 'Password123!';

const regions = [
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'ca-central-1', 'sa-east-1'
];

async function tryConnection(region, prefix) {
  const host = `${prefix}-${region}.pooler.supabase.com`;
  const port = 6543;
  const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:${port}/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS: Connected to ${host}:${port}!`);
    const res = await client.query('SELECT version();');
    console.log('Version:', res.rows[0].version);
    await client.end();
    return host;
  } catch (err) {
    if (err.message.includes('tenant/user') || err.message.includes('Tenant or user not found')) {
      // The pooler reached, but tenant not recognized
      // Let's log it only if it doesn't say tenant not found
    } else {
      console.log(`Host: ${host} - Error: ${err.message}`);
    }
    try {
      await client.end();
    } catch (e) {}
    return null;
  }
}

async function main() {
  console.log('Scanning pooler hosts...');
  for (const prefix of ['aws-0', 'aws-1']) {
    for (const region of regions) {
      const host = await tryConnection(region, prefix);
      if (host) {
        console.log(`\n🎉 WORKING POOLER FOUND: ${host}`);
        process.exit(0);
      }
    }
  }
  console.log('\nScan completed. No working pooler found.');
  process.exit(1);
}

main();
