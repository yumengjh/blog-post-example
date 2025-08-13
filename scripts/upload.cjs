const { execSync } = require('child_process');
const { main: updateTime, getCurrentTimestamp } = require('./updateTime.cjs');
const { main: convertFiles } = require('./convertFiles.cjs');

// 获取命令行参数
const args = process.argv.slice(2);
const mode = args[0] || 'time';

// 显示帮助信息
if (mode === 'help' || mode === '-h' || mode === '--help') {
  console.log(`
📚 文档更新工具

使用方法：
  pnpm time     - 只更新修改文件的时间戳
  pnpm convert  - 只转换文件名
  pnpm commit   - 更新时间戳并提交到 Git
  pnpm push     - 更新时间戳并推送到远程仓库

说明：
  - 只处理有 Git 变更的 markdown 文件
  - 自动在 frontmatter 中添加/更新 update 字段
  - 提交消息格式：文档更新：YYYY-MM-DD HH:mm:ss
`);
  process.exit(0);
}

// 验证模式参数
if (!['time', 'convert', 'commit', 'push'].includes(mode)) {
  console.error(`❌ 未知的模式：${mode}`);
  console.log('使用 "pnpm time help" 查看帮助信息');
  process.exit(1);
}

console.log(`🚀 启动模式：${mode}`);
console.log('');

// 根据模式执行不同的操作
(async () => {
  switch (mode) {
    case 'time':
      // 只更新时间戳
      await executeTimeUpdate();
      break;
      
    case 'convert':
      // 只转换文件名
      await executeFileConvert();
      break;
      
    case 'commit':
      // 更新时间戳并提交到 Git
      await executeTimeUpdate();
      await executeGitCommit();
      break;
      
    case 'push':
      // 更新时间戳，转换文件名，并推送到远程仓库
      await executeTimeUpdate();
      await executeFileConvert();
      await executeGitPush();
      break;
  }
  
  console.log('');
  console.log('🎉 所有操作完成！');
})();

console.log('');
console.log('🎉 所有操作完成！');

// 执行时间戳更新
async function executeTimeUpdate() {
  console.log('🔄 开始更新时间戳...');
  try {
    const hasUpdates = updateTime();
    if (hasUpdates) {
      console.log('✅ 时间戳更新完成！');
    } else {
      console.log('ℹ️  没有文件需要更新时间戳');
    }
    return hasUpdates;
  } catch (error) {
    console.error('❌ 更新时间戳时出错：', error.message);
    process.exit(1);
  }
}

// 执行文件转换
async function executeFileConvert() {
  console.log('🔄 开始执行文件转换...');
  try {
    const convertResult = convertFiles();
    if (convertResult) {
      console.log('✅ 文件转换完成！');
    } else {
      console.log('ℹ️  没有文件需要转换');
    }
  } catch (error) {
    console.error('❌ 文件转换时出错：', error.message);
    process.exit(1);
  }
}

// 执行 Git 提交
async function executeGitCommit() {
  console.log('📦 添加文件到暂存区...');
  try {
    execSync('git add .', { stdio: 'inherit' });
    console.log('✅ 文件已添加到暂存区');

    const timestamp = getCurrentTimestamp().replace('-', ' ').replace(/:/g, ':');
    const commitMessage = `文档更新：${timestamp}`;
    
    console.log('💾 提交更改...');
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log('✅ 更改已提交');
  } catch (error) {
    console.error('❌ Git 提交失败：', error.message);
    process.exit(1);
  }
}

// 执行 Git 推送
async function executeGitPush() {
  console.log('📦 添加文件到暂存区...');
  try {
    execSync('git add .', { stdio: 'inherit' });
    console.log('✅ 文件已添加到暂存区');

    const timestamp = getCurrentTimestamp().replace('-', ' ').replace(/:/g, ':');
    const commitMessage = `文档更新：${timestamp}`;
    
    console.log('💾 提交更改...');
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log('✅ 更改已提交');

    console.log('🚀 推送到远程仓库...');
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ 已推送到远程仓库');
  } catch (error) {
    console.error('❌ Git 操作失败：', error.message);
    console.log('');
    console.log('💡 可能的解决方案：');
    console.log('   1. 检查是否有未解决的合并冲突');
    console.log('   2. 确保有权限推送到远程仓库');
    console.log('   3. 检查网络连接');
    process.exit(1);
  }
}