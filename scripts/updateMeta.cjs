const fs = require('fs');
const path = require('path');

function updateFileMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // 检查文件是否包含 frontmatter
  if (!content.startsWith('---\n')) {
    return;
  }

  const now = new Date();
  const updateTime = now.toISOString()
    .replace(/T/, '-')
    .replace(/\..+/, '')
    .replace(/:/g, ':')
    .split('-')
    .slice(0, 4)
    .join('-');

  let newContent = [];
  let inFrontmatter = false;
  let dateFound = false;
  let updateFound = false;
  let frontmatterEnd = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line === '---') {
      inFrontmatter = !inFrontmatter;
      if (!inFrontmatter) frontmatterEnd = true;
      newContent.push(line);
      continue;
    }

    if (inFrontmatter) {
      if (line.startsWith('date:')) {
        dateFound = true;
        newContent.push(line);
        if (!updateFound) {
          newContent.push(`update: ${updateTime}`);
          updateFound = true;
        }
        continue;
      }

      if (line.startsWith('update:')) {
        updateFound = true;
        newContent.push(`update: ${updateTime}`);
        continue;
      }

      newContent.push(line);
    } else {
      newContent.push(line);
    }
  }

  fs.writeFileSync(filePath, newContent.join('\n'));
}

// 获取Git暂存区中的.md文件
const { execSync } = require('child_process');
const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM').toString().split('\n');
const mdFiles = stagedFiles.filter(file => file.endsWith('.md') && file.trim() !== '');

mdFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    updateFileMetadata(fullPath);
    // 将更新后的文件重新添加到暂存区
    execSync(`git add ${file}`);
  }
});
