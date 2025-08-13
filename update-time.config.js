module.exports = {
  // 全局配置
  global: {
    // 是否显示详细日志
    verbose: true,
    
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
      path: './zh',  // 修正路径，确保以 ./ 开头
      // 任务特定的排除规则（会与全局规则合并）
      exclude: {
        files: ['index.md'],
        patterns: ['^private-.*\\.md$']
      }
    },
    {
      name: '英文文档',
      path: './en',  // 修正路径，确保以 ./ 开头
      exclude: {
        files: ['index.md'],
        patterns: []
      }
    },
    {
      name: '日文文档',
      path: './ja',  // 修正路径，确保以 ./ 开头
      exclude: {
        files: ['index.md'],
        patterns: []
      }
    }
  ]
};