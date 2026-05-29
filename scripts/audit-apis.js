import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const apiDir = path.join(rootDir, 'app', 'api');

function getApiFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getApiFiles(fullPath, files);
    } else if (item === 'route.ts' || item === 'route.js') {
      files.push(fullPath);
    }
  }
  return files;
}

const apiRouteFiles = getApiFiles(apiDir);
const auditResults = {};

for (const file of apiRouteFiles) {
  const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PUT')) methods.push('PUT');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  if (content.includes('export async function PATCH')) methods.push('PATCH');

  const hasAuthCheck = content.includes('auth.getUser()') || content.includes('createServerClient') || content.includes('createClient()') || content.includes('verifyMentorAssignment');
  
  const tableMatches = [...content.matchAll(/\.from\(['"]([^'"]+)['"]\)/g)];
  const tablesReferenced = Array.from(new Set(tableMatches.map(m => m[1])));

  const mockOrStub = content.includes('mock') || content.includes('placeholder') || content.includes('TODO');

  auditResults[relPath] = {
    methods,
    hasAuthCheck,
    tablesReferenced,
    mockOrStub,
    lines: content.split('\n').length,
    size: content.length
  };
}

fs.writeFileSync('audit_api_routes.json', JSON.stringify(auditResults, null, 2));
console.log(`API routes audited: ${Object.keys(auditResults).length}`);
