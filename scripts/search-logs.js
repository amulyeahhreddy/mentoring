const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\Amulyaa\\.gemini\\antigravity\\brain\\24ffab8f-4200-41f8-a3f8-27ef95ed9f86\\.system_generated\\logs\\transcript.jsonl';

async function main() {
  if (!fs.existsSync(logFile)) {
    console.log('Log file does not exist at:', logFile);
    return;
  }

  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching for credentials/connection strings in logs...');
  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    // Look for connection strings, passwords, or database setup info
    if (line.includes('postgres://') || line.includes('postgresql://') || line.includes('Password') || line.includes('db_') || line.includes('DB_')) {
      // Find matches. Let's extract the actual matched string/surrounding text
      console.log(`\n--- Line ${lineNum} ---`);
      
      // Let's find connection strings or anything looking like a password
      const connRegex = /(postgres(?:ql)?:\/\/[^\s"'`]+)/g;
      const matches = line.match(connRegex);
      if (matches) {
        console.log('Found URIs:', matches);
      } else {
        // Otherwise print the line or part of it
        const index = line.indexOf('password');
        if (index !== -1) {
          console.log('Password context:', line.substring(Math.max(0, index - 50), Math.min(line.length, index + 100)));
        } else {
          console.log('Snippet:', line.substring(0, 500));
        }
      }
    }
  }
}

main();
