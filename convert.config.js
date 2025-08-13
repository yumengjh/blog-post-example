module.exports = {
  // 全局配置
  global: {
    // 随机字符串配置
    stringLength: 5,
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    
    // 是否显示详细日志
    verbose: true,
    
    // 是否保留原文件
    keepOriginal: true,
    
    // 全局排除规则
    exclude: {
      files: ['README.md'],
      patterns: [
        '^temp-.*\\.md$',
        '^draft-.*\\.md$'
      ]
    }
  },

  // 转换任务配置
  tasks: [
    {
      name: '中文文档',
      sourceDir: 'zh',
      targetDir: 'post-zh',
      // 可以覆盖全局配置
      stringLength: 5,
      // 任务特定的排除规则（会与全局规则合并）
      exclude: {
        files: ['index.md'],
        patterns: ['^private-.*\\.md$']
      }
    },
    {
      name: '英文文档',
      sourceDir: 'en',
      targetDir: 'post-en',
      stringLength: 5,
      exclude: {
        files: ['index.md'],
        patterns: []
      }
    },
    {
      name: '日文文档',
      sourceDir: 'ja',
      targetDir: 'post-ja',
      stringLength: 5,
      exclude: {
        files: ['index.md'],
        patterns: []
      }
    }
  ]
};