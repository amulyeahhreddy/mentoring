const { Client } = require('pg');

const projectRef = 'dnymnrceocbsgirwzphj';
const password = 'Password123!';
const regions = ['ap-south-1', 'us-east-1', 'us-east-2', 'eu-central-1'];
const ports = [6543, 5432];

async function tryConnection(region, port) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:${port}/postgres`;
  
  console.log(`Connecting to ${host}:${port}...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS: Connected to ${host}:${port}!`);
    const res = await client.query('SELECT version();');
    console.log('Version:', res.rows[0].version);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ FAILED: ${host}:${port} - ${err.message}`);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function main() {
  for (const region of regions) {
    for (const port of ports) {
      const ok = await tryConnection(region, port);
      if (ok) {
        console.log(`\nFound working connection! Host: aws-0-${region}.pooler.supabase.com, Port: ${port}`);
        process.exit(0);
      }
    }
  }
  console.log('\nCould not connect to any combination.');
  process.exit(1);
}

main();
