import fs from 'fs';
import path from 'path';

const IGNORE_DIRS = ['.git', '.next', 'node_modules', '__pycache__', 'dist', 'build', '.gemini'];

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        walkDir(filePath, fileList);
      }
    } else {
      fileList.push({
        path: filePath,
        size: stat.size,
      });
    }
  }
  return fileList;
}

const rootDir = process.cwd();
const allFiles = walkDir(rootDir);

const result = allFiles.map(f => {
  const relPath = path.relative(rootDir, f.path).replace(/\\/g, '/');
  let lineCount = 0;
  let isStub = false;
  let isPlaceholder = false;
  let contentSample = '';

  try {
    const content = fs.readFileSync(f.path, 'utf8');
    lineCount = content.split('\n').length;
    isStub = content.includes('TODO') || content.includes('stub') || content.length < 50;
    isPlaceholder = content.includes('placeholder') || content.includes('lorem ipsum');
    contentSample = content.substring(0, 200).replace(/\r?\n/g, ' ');
  } catch (e) {
    // Binary or unreadable
    lineCount = -1;
  }

  return {
    path: relPath,
    size: f.size,
    lines: lineCount,
    isStub,
    isPlaceholder,
    sample: contentSample
  };
});

fs.writeFileSync('audit_file_inventory.json', JSON.stringify(result, null, 2));
console.log(`Inventory written. Total files found: ${result.length}`);
