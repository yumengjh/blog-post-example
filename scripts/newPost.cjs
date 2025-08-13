#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// 语言配置
const LANGUAGE_CONFIG = {
  'en': {
    folder: 'en',
    defaultTitle: 'New Post',
    defaultDescription: 'This is a new post',
    defaultTags: 'post,new'
  },
  'ja': {
    folder: 'ja',
    defaultTitle: '新しい投稿',
    defaultDescription: 'これは新しい投稿です',
    defaultTags: '投稿,新規'
  },
  'zh': {
    folder: 'zh', 
    defaultTitle: '新文章',
    defaultDescription: '这是一篇新文章',
    defaultTags: '文章,新的'
  }
}

// 生成一个随机字符串，大小写混合
function getRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成唯一的文件名，确保不与目录中其他文件重复
function generateUniqueFileName(targetDir, extension = '.md') {
  let fileName;
  let filePath;
  let attempts = 0;
  const maxAttempts = 100; // 防止无限循环
  
  do {
    // 生成 8 位随机字符串
    const randomStr = getRandomString(8);
    fileName = `${randomStr}`;
    filePath = path.join(targetDir, `${fileName}${extension}`);
    attempts++;
    
    if (attempts > maxAttempts) {
      // 如果尝试次数过多，使用时间戳作为备选方案
      fileName = `post-${Date.now().toString().slice(-8)}`;
      filePath = path.join(targetDir, `${fileName}${extension}`);
      break;
    }
  } while (fs.existsSync(filePath));
  
  return fileName;
}

// 获取命令行参数
const args = process.argv.slice(2)
const [language = 'zh', fileName = '', title = '', description = '', tags = ''] = args

// 获取当前时间戳（亚洲上海标准时间）
function getCurrentTimestamp() {
  const now = new Date();
  // 转换为亚洲上海时区时间
  const shanghaiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
  
  const year = shanghaiTime.getFullYear();
  const month = String(shanghaiTime.getMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getDate()).padStart(2, '0');
  const hours = String(shanghaiTime.getHours()).padStart(2, '0');
  const minutes = String(shanghaiTime.getMinutes()).padStart(2, '0');
  const seconds = String(shanghaiTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hours}:${minutes}:${seconds}`;
}

// 获取当前日期和时间戳
const timestamp = getCurrentTimestamp()

// 获取语言配置
const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['zh']

// 随机字符串

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomId(len = 5) {
  let res = "";
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

// 生成frontmatter
const frontmatter = `---
id: ${randomId(5)}
title: ${title || langConfig.defaultTitle}
date: ${timestamp}
update: ${timestamp}
category: Note
tags: 
    - ${(tags || langConfig.defaultTags).split(',').join('\n    - ')}
description: ${description || langConfig.defaultDescription}
outline: [2,3]
draft: false
sticky: false
cbf: false
zoomable: true
publish: true
AutoAnchor: false
aside: false
noSearch: false 
comments: false
author: 鱼梦江湖
---

# ${title || langConfig.defaultTitle}

::: details 目录
[[toc]]
:::

`

try {
    // 确定目标目录
    let targetDir = process.cwd()
    
    if (langConfig.folder !== '.') {
        targetDir = path.join(process.cwd(), langConfig.folder)
        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
            console.log(`📁 创建目录: ${targetDir}`)
        }
    }

    // 创建文件
    const filePaths = path.join(targetDir, `${fileName}.md`)

    // 检查同名文件是否已存在
    if (fs.existsSync(filePaths)) {
        console.error(`❌ 创建失败：文件已存在 -> ${filePaths}`)
        process.exit(1)
    }

       // 生成唯一的文件名
       const finalFileName = fileName || generateUniqueFileName(targetDir);
       const filePath = path.join(targetDir, `${finalFileName}.md`)

    fs.writeFileSync(filePath, frontmatter)

    console.log(`\n✨ 文章创建成功！`)
    console.log(`🌍 语言: ${language.toUpperCase()}`)
    console.log(`📁 目录: ${targetDir}`)
    console.log(`📝 文件名: ${finalFileName}.md`)
    console.log(`📄 文件路径: ${filePath}`)
    console.log(`\n使用方法：`)
    console.log(`pnpm new [语言] [文件名] [标题] [描述] [标签(逗号分隔)]`)
    console.log(`\n支持的语言：`)
    Object.keys(LANGUAGE_CONFIG).forEach(lang => {
        const config = LANGUAGE_CONFIG[lang]
        const folderName = config.folder === '.' ? '根目录' : config.folder
        console.log(`  ${lang}: ${folderName}`)
    })
    console.log(`\n示例：`)
    console.log(`  pnpm new en my-post "My Post" "This is my post" "tag1,tag2"`)
    console.log(`  pnpm new ja my-post "私の投稿" "これは私の投稿です" "タグ1,タグ2"`)
    console.log(`  pnpm new zh my-post "我的文章" "这是我的文章" "标签1,标签2"`)

} catch (error) {
    console.error('❌ 创建文章失败:', error)
}