const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 默认配置
const DEFAULT_CONFIG = {
  global: {
    verbose: true,
    debug: true,
    exclude: {
      files: ['README.md'],
      patterns: [
        '^temp-.*\\.md$',
        '^draft-.*\\.md$'
      ]
    }
  },
  tasks: [
    {
      name: '默认任务',
      path: '.',
      exclude: {
        files: [],
        patterns: []
      }
    }
  ]
};

/**
 * 从配置文件加载配置
 */
function loadConfig() {
  const configPath = path.join(process.cwd(), 'update-time.config.js');
  let config = { ...DEFAULT_CONFIG };
  
  try {
    if (fs.existsSync(configPath)) {
      const userConfig = require(configPath);
      config = {
        global: { ...config.global, ...userConfig.global },
        tasks: userConfig.tasks || config.tasks
      };
    }
  } catch (error) {
    console.error('❌ 加载配置文件失败:', error.message);
  }
  
  return config;
}

/**
 * 合并排除规则
 */
function mergeExcludeRules(globalExclude, taskExclude) {
  return {
    files: [...new Set([...globalExclude.files, ...(taskExclude?.files || [])])],
    patterns: [...new Set([...globalExclude.patterns, ...(taskExclude?.patterns || [])])]
  };
}

/**
 * 检查文件是否应该被排除
 */
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

/**
 * 获取当前时间戳（亚洲上海标准时间）
 */
function getCurrentTimestamp() {
  const now = new Date();
  const shanghaiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
  
  const year = shanghaiTime.getFullYear();
  const month = String(shanghaiTime.getMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getDate()).padStart(2, '0');
  const hours = String(shanghaiTime.getHours()).padStart(2, '0');
  const minutes = String(shanghaiTime.getMinutes()).padStart(2, '0');
  const seconds = String(shanghaiTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hours}:${minutes}:${seconds}`;
}

/**
 * 递归获取目录下的所有 .md 文件
 */
function getAllMarkdownFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(fullPath));
    } else if (file.endsWith('.md')) {
      results.push(fullPath);
    }
  });
  
  return results;
}

/**
 * 更新单个文件的时间戳
 */
function updateFileTimestamp(filePath, config) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否有 frontmatter
    const lines = content.split(/\r?\n/);
    if (lines.length < 3 || lines[0].trim() !== '---') {
      if (config.verbose) {
        console.log(`⏭️  跳过 ${filePath}：没有 frontmatter`);
      }
      return false;
    }

    const timestamp = getCurrentTimestamp();
    const result = [];
    let inFrontmatter = false;
    let dateLineIndex = -1;
    let hasChanges = false;

    // 处理每一行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim() === '---') {
        inFrontmatter = !inFrontmatter;
        result.push(line);
        continue;
      }

      if (inFrontmatter) {
        if (line.trim().startsWith('date:')) {
          dateLineIndex = result.length;
          result.push(line);
        } else if (line.trim().startsWith('update:')) {
          // 跳过所有旧的 update 行
          hasChanges = true;
          continue;
        } else {
          result.push(line);
        }
      } else {
        result.push(line);
      }
    }

    // 在 date 行后插入新的 update 行
    if (dateLineIndex >= 0) {
      const dateLine = result[dateLineIndex];
      const indent = dateLine.match(/^\s*/)[0];
      result.splice(dateLineIndex + 1, 0, `${indent}update: ${timestamp}`);
      hasChanges = true;
    } else {
      // 如果没有 date 行，在第一个 --- 后添加
      const firstFrontmatterIndex = result.findIndex(line => line.trim() === '---');
      if (firstFrontmatterIndex >= 0) {
        result.splice(firstFrontmatterIndex + 1, 0, `date: ${timestamp}`);
        result.splice(firstFrontmatterIndex + 2, 0, `update: ${timestamp}`);
        hasChanges = true;
      }
    }

    // 只有在内容有变化时才写入文件
    if (hasChanges) {
      fs.writeFileSync(filePath, result.join('\n'));
      if (config.verbose) {
        console.log(`✓ 已更新 ${filePath}`);
      }
      return true;
    }

    if (config.verbose) {
      console.log(`⏭️  跳过 ${filePath}：无需更新`);
    }
    return false;
    
  } catch (error) {
    console.error(`✗ 更新 ${filePath} 失败：${error.message}`);
    return false;
  }
}

/**
 * 获取 Git 中有变更的 markdown 文件
 */
function getChangedMarkdownFiles(taskPath, config) {
  try {
    // 获取所有状态的文件
    const statusOutput = execSync('git status --porcelain').toString();
    const workspaceRoot = process.cwd();
    const taskDir = path.resolve(workspaceRoot, taskPath.replace(/^\.\//, '')); // 移除开头的 ./

    if (config.debug) {
      console.log('\n🔍 调试信息:');
      console.log(`   工作目录: ${workspaceRoot}`);
      console.log(`   任务目录: ${taskDir}`);
      console.log('\n   Git 状态输出:');
      statusOutput.split('\n').forEach(line => {
        if (line.trim()) console.log(`   ${line}`);
      });
    }

    let files = [];
    
    // 处理状态输出
    statusOutput.split('\n').forEach(line => {
      if (!line.trim()) return;
      
      const status = line.substring(0, 2);
      // 修复：从第3个字符开始（跳过状态和空格），不要trim()整个行
      const filePath = line.substring(3).trim();
      
      // 如果是未跟踪的目录
      if (status === '??' && filePath.endsWith('/')) {
        const fullDirPath = path.resolve(workspaceRoot, filePath);
        // 检查是否是我们要处理的目录
        if (fullDirPath === taskDir || fullDirPath.startsWith(taskDir + path.sep)) {
          // 递归获取该目录下的所有 .md 文件
          const mdFiles = getAllMarkdownFiles(fullDirPath);
          files.push(...mdFiles);
        }
      }
      // 如果是已修改或未跟踪的文件
      else if ((status === '??' || status === ' M' || status === 'M ') && filePath.endsWith('.md')) {
        const fullPath = path.resolve(workspaceRoot, filePath);
        // 使用 path.relative 来检查文件是否在任务目录下，这样可以避免路径分隔符的问题
        const relativePath = path.relative(taskDir, fullPath);
        if (config.debug) {
          console.log(`   文件路径分析:`);
          console.log(`   - 文件: ${filePath}`);
          console.log(`   - 文件完整路径: ${fullPath}`);
          console.log(`   - 任务目录: ${taskDir}`);
          console.log(`   - 相对路径: ${relativePath}`);
          console.log(`   - 是否在任务目录下: ${!relativePath.startsWith('..') && !path.isAbsolute(relativePath)}`);
        }
        if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
          files.push(fullPath);
        }
      }
    });

    // 去重
    files = [...new Set(files)];

    if (config.debug) {
      console.log('\n   找到的文件:');
      files.forEach(file => console.log(`   - ${file}`));
    }

    return files;
  } catch (error) {
    console.error('获取 Git 状态失败：', error.message);
    return [];
  }
}

/**
 * 处理单个任务
 */
async function processTask(task, globalConfig) {
  const taskConfig = {
    ...globalConfig,
    ...task,
    exclude: mergeExcludeRules(globalConfig.exclude, task.exclude)
  };

  console.log(`\n🔄 开始处理任务: ${task.name}`);
  
  // 获取该任务目录下的所有文件
  const allFiles = getChangedMarkdownFiles(task.path, taskConfig);
  
  // 分离出被排除和需要处理的文件
  const excludedFiles = allFiles.filter(file => shouldExclude(file, taskConfig.exclude));
  const changedFiles = allFiles.filter(file => !shouldExclude(file, taskConfig.exclude));

  if (allFiles.length === 0) {
    console.log(`📝 没有发现修改过的 markdown 文件`);
    return { total: 0, success: 0, skip: 0, excluded: 0 };
  }

  if (taskConfig.verbose) {
    if (changedFiles.length > 0) {
      console.log(`📝 找到 ${changedFiles.length} 个需要处理的文件：`);
      changedFiles.forEach(file => console.log(`   - ${file}`));
    }
    if (excludedFiles.length > 0) {
      console.log(`\n⏭️  跳过 ${excludedFiles.length} 个被排除的文件：`);
      excludedFiles.forEach(file => console.log(`   - ${file}`));
    }
  }
  
  let successCount = 0;
  let skipCount = 0;

  for (const file of changedFiles) {
    if (updateFileTimestamp(file, taskConfig)) {
      successCount++;
    } else {
      skipCount++;
    }
  }

  return {
    total: allFiles.length,
    success: successCount,
    skip: skipCount,
    excluded: excludedFiles.length
  };
}

/**
 * 主函数
 */
async function main() {
  const config = loadConfig();
  console.log('🔧 加载配置完成');
  
  // 处理所有任务
  const results = [];
  for (const task of config.tasks) {
    const stats = await processTask(task, config.global);
    results.push({ name: task.name, ...stats });
  }
  
  // 显示总体统计
  console.log('\n✨ 所有任务完成！');
  console.log('📊 总体统计：');
  const totals = results.reduce((acc, curr) => ({
    total: acc.total + curr.total,
    success: acc.success + curr.success,
    skip: acc.skip + curr.skip,
    excluded: acc.excluded + curr.excluded
  }), { total: 0, success: 0, skip: 0, excluded: 0 });
  
  console.log(`   - 总任务数: ${results.length}`);
  console.log(`   - 总文件数: ${totals.total}`);
  console.log(`   - 成功更新: ${totals.success}`);
  console.log(`   - 跳过文件: ${totals.skip}`);
  console.log(`   - 被排除文件: ${totals.excluded}`);
  
  // 显示每个任务的详细统计
  console.log('\n📊 任务详细统计：');
  results.forEach(result => {
    console.log(`   ${result.name}:`);
    console.log(`      - 总文件数: ${result.total}`);
    console.log(`      - 成功更新: ${result.success}`);
    console.log(`      - 跳过文件: ${result.skip}`);
    console.log(`      - 被排除文件: ${result.excluded}`);
  });

  return totals.success > 0;
}

module.exports = {
  main,
  updateFileTimestamp,
  getChangedMarkdownFiles,
  getCurrentTimestamp
};

// 直接运行时执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}