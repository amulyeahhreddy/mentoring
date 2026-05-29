const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load env from .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');

const env = {};
envLocalContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^=#\s]+)\s*=\s*(.*)$/);
  if (match) {
    let value = match[2].trim();
    // remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table "${tableName}" does not exist (Error code 42P01).`);
      } else {
        console.log(`⚠️ Table "${tableName}" returned error: ${error.message} (${error.code})`);
      }
    } else {
      console.log(`✅ Table "${tableName}" exists!`);
    }
  } catch (err) {
    console.error(`Error querying "${tableName}":`, err.message);
  }
}

async function main() {
  console.log('Checking if Phase 2 tables already exist...');
  await checkTable('session_course_ratings');
  await checkTable('session_facility_feedback');
  await checkTable('audit_events');
}

main();
