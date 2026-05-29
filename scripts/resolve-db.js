const dns = require('dns');

const hostnames = [
  'db.dnymnrceocbsgirwzphj.supabase.co',
  'aws-0-ap-south-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-us-east-2.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com'
];

console.log('Resolving hostnames...');
hostnames.forEach(host => {
  dns.lookup(host, (err, address, family) => {
    if (err) {
      console.log(`❌ ${host}: Failed (${err.code})`);
    } else {
      console.log(`✅ ${host}: ${address} (family: IPv${family})`);
    }
  });
});
