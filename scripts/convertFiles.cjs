#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 默认配置
const DEFAULT_CONFIG = {
  global: {
    stringLength: 10,
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    exclude: {
      files: [],
      patterns: [],
    },
    keepOriginal: true,
    verbose: true
  },
  tasks: []
};

// 从配置文件加载配置（如果存在）
function loadConfig() {
  const configPath = path.join(process.cwd(), 'convert.config.js');
  let config = { ...DEFAULT_CONFIG };
  
  try {
    if (fs.existsSync(configPath)) {
      const userConfig = require(configPath);
      config = { ...config, ...userConfig };
    }
  } catch (error) {
    console.error('❌ 加载配置文件失败:', error.message);
  }
  
  return config;
}

// 生成随机字符串
function generateRandomString(length, chars) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 合并排除规则
function mergeExcludeRules(globalExclude, taskExclude) {
  return {
    files: [...new Set([...globalExclude.files, ...(taskExclude?.files || [])])],
    patterns: [...new Set([...globalExclude.patterns, ...(taskExclude?.patterns || [])])]
  };
}

// 检查文件是否应该被排除
function shouldExclude(filePath, excludeRules) {
  const fileName = path.basename(filePath);
  
  // 检查文件名排除
  if (excludeRules.files.includes(fileName)) {
    return true;
  }
  
  // 检查模式排除
  return excludeRules.patterns.some(pattern => {
    const regex = new RegExp(pattern);
    return regex.test(fileName);
  });
}

// 从文件内容中提取ID
function extractId(content) {
  const match = content.match(/^id:\s*([a-zA-Z0-9]+)/m);
  return match ? match[1] : null;
}

// 生成唯一的文件名
function generateUniqueFileName(existingIds, config) {
  let id;
  do {
    id = generateRandomString(config.stringLength, config.chars);
  } while (existingIds.has(id));
  return id;
}

// 转换单个文件
function convertFile(filePath, existingIds, config) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let id = extractId(content);
    let needsIdUpdate = false;
    
    // 如果没有ID，生成新ID
    if (!id) {
      id = generateUniqueFileName(existingIds, config);
      needsIdUpdate = true;
    }
    
    existingIds.add(id);
    
    // 构建新的文件内容
    let newContent = content;
    if (needsIdUpdate) {
      // 在frontmatter中添加id字段
      const lines = content.split('\n');
      const newLines = [];
      let inFrontmatter = false;
      let idAdded = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim() === '---') {
          newLines.push(line);
          if (!inFrontmatter) {
            inFrontmatter = true;
            // 在第一个 --- 后面添加 id
            newLines.push(`id: ${id}`);
            idAdded = true;
          } else {
            inFrontmatter = false;
          }
          continue;
        }

        newLines.push(line);
      }

      // 如果没有 frontmatter，创建一个
      if (!idAdded) {
        newContent = `---\nid: ${id}\n---\n${content}`;
      } else {
        newContent = newLines.join('\n');
      }
    }
    
    // 创建目标文件路径
    const relativePath = path.relative(path.join(process.cwd(), config.sourceDir), filePath);
    const targetPath = path.join(process.cwd(), config.targetDir, `${id}.md`);
    
    // 确保目标目录存在
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    
    // 写入新文件
    fs.writeFileSync(targetPath, newContent);
    
    if (config.verbose) {
      console.log(`✓ 已转换: ${relativePath} -> ${path.basename(targetPath)}`);
    }
    
    // 如果不保留原文件，则删除
    if (!config.keepOriginal) {
      fs.unlinkSync(filePath);
      if (config.verbose) {
        console.log(`  已删除原文件: ${relativePath}`);
      }
    }
    
    return id;
  } catch (error) {
    console.error(`❌ 转换文件失败 ${filePath}:, ${error.message}`);
    return null;
  }
}

// 处理单个任务
async function processTask(task, globalConfig, existingIds) {
  const taskConfig = {
    ...globalConfig,
    ...task,
    exclude: mergeExcludeRules(globalConfig.exclude, task.exclude)
  };

  console.log(`\n🔄 开始处理任务: ${task.name}`);
  
  const sourceDir = path.join(process.cwd(), task.sourceDir);
  const targetDir = path.join(process.cwd(), task.targetDir);
  
  // 确保目录存在
  if (!fs.existsSync(sourceDir)) {
    console.log(`⚠️  源目录不存在，跳过任务: ${sourceDir}`);
    return { success: 0, skip: 0, fail: 0, total: 0 };
  }
  
  fs.mkdirSync(targetDir, { recursive: true });
  
  // 获取所有.md文件
  const files = fs.readdirSync(sourceDir)
    .filter(file => file.endsWith('.md'))
    .filter(file => !shouldExclude(file, taskConfig.exclude))
    .map(file => path.join(sourceDir, file));
  
  console.log(`📝 找到 ${files.length} 个 Markdown 文件`);
  
  // 转换所有文件
  let successCount = 0;
  let skipCount = 0;
  
  for (const file of files) {
    if (shouldExclude(file, taskConfig.exclude)) {
      skipCount++;
      if (taskConfig.verbose) {
        console.log(`⏭️  跳过: ${file}`);
      }
      continue;
    }
    
    const id = convertFile(file, existingIds, taskConfig);
    if (id) {
      successCount++;
    }
  }

  const stats = {
    total: files.length,
    success: successCount,
    skip: skipCount,
    fail: files.length - successCount - skipCount
  };

  console.log(`\n📊 任务统计：`);
  console.log(`   - 总文件数: ${stats.total}`);
  console.log(`   - 成功转换: ${stats.success}`);
  console.log(`   - 跳过文件: ${stats.skip}`);
  console.log(`   - 失败文件: ${stats.fail}`);

  return stats;
}

// 主函数
async function main() {
  const config = loadConfig();
  console.log('🔧 加载配置完成');
  
  // 收集所有已存在的ID（跨任务共享）
  const existingIds = new Set();
  
  // 处理所有任务
  const results = [];
  for (const task of config.tasks) {
    const stats = await processTask(task, config.global, existingIds);
    results.push({ name: task.name, ...stats });
  }
  
  // 显示总体统计
  console.log('\n✨ 所有任务完成！');
  console.log('📊 总体统计：');
  const totals = results.reduce((acc, curr) => ({
    total: acc.total + curr.total,
    success: acc.success + curr.success,
    skip: acc.skip + curr.skip,
    fail: acc.fail + curr.fail
  }), { total: 0, success: 0, skip: 0, fail: 0 });
  
  console.log(`   - 总任务数: ${results.length}`);
  console.log(`   - 总文件数: ${totals.total}`);
  console.log(`   - 成功转换: ${totals.success}`);
  console.log(`   - 跳过文件: ${totals.skip}`);
  console.log(`   - 失败文件: ${totals.fail}`);
  
  // 显示每个任务的结果
  console.log('\n📋 任务详情：');
  results.forEach(result => {
    console.log(`   ${result.name}:`);
    console.log(`      总文件: ${result.total}`);
    console.log(`      成功: ${result.success}`);
    console.log(`      跳过: ${result.skip}`);
    console.log(`      失败: ${result.fail}`);
  });
}

// 导出主函数
module.exports = { main };

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });
}
