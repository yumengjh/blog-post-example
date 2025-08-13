/*
    在指定目录下所有 .md 文件的 frontmatter 中添加 id 字段，id 字段为 5 位随机字符串
    如果文件中已经存在 id 字段，则不添加
    如果文件中没有 frontmatter，则添加一个
*/
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "../zh"); // zh 文件夹绝对路径
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomId(len = 5) {
  let res = "";
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

// 递归遍历目录，找到所有 .md 文件
function walkDir(dirPath) {
  let files = [];
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      files = files.concat(walkDir(fullPath));
    } else if (item.isFile() && fullPath.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function insertIdToFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (lines[0].trim() === "---") {
    // 有 frontmatter
    if (!lines.some(line => line.startsWith("id:"))) {
      lines.splice(1, 0, `id: ${randomId(5)}`);
      console.log(`✅ Added id to: ${filePath}`);
    } else {
      console.log(`⏩ Skipped (id exists): ${filePath}`);
    }
  } else {
    // 没有 frontmatter，就添加一个
    lines.unshift("---", `id: ${randomId(5)}`, "---");
    console.log(`🆕 Created frontmatter for: ${filePath}`);
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
}

function main() {
  const mdFiles = walkDir(dir);
  for (const file of mdFiles) {
    insertIdToFile(file);
  }
  console.log("🎯 All done.");
}

main();
