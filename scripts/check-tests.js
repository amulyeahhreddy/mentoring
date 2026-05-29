const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');

const env = {};
envLocalContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^=#\s]+)\s*=\s*(.*)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Checking "tests" table:');
  const { data, error } = await supabase.from('tests').select('*').limit(1);
  if (error) {
    console.error('Error querying "tests":', error);
  } else {
    console.log('Query succeeded! Tests table exists. Sample data:', data);
  }

  console.log('Checking "tasks" table:');
  const { data: taskData, error: taskError } = await supabase.from('tasks').select('*').limit(1);
  if (taskError) {
    console.error('Error querying "tasks":', taskError);
  } else {
    console.log('Query succeeded! Tasks table exists. Sample data:', taskData);
  }
}

run();
