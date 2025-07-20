#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 验证AI集成状态...\n');

// 检查的文件列表
const filesToCheck = [
  // 前端AI组件
  'static/react-kefu/src/components/EnterpriseAI.jsx',
  'static/react-kefu/src/components/EnterpriseAIExample.jsx',
  'static/react-kefu/src/components/EnterpriseAI.css',
  'static/react-kefu/src/AIIntegrationTest.jsx',
  
  // 通知系统
  'static/react-kefu/src/components/EnterpriseNotifications.jsx',
  'static/react-kefu/src/components/EnterpriseNotifications.css',
  
  // WebSocket集成
  'static/react-kefu/src/components/EnterpriseWebSocket.jsx',
  
  // 仪表板集成
  'static/react-kefu/src/components/EnterpriseDashboard.jsx',
  
  // 主导出文件
  'static/react-kefu/src/components/index.js',
  
  // 后端AI模块
  'src/ai/mod.rs',
  'src/ai/config.rs',
  'src/ai/queue.rs',
  'src/ai/intent_recognition.rs',
  'src/ai/translation.rs',
  'src/ai/speech_recognition.rs',
  
  // 文档
  'AI_INTEGRATION_SUMMARY.md'
];

// 检查文件是否存在
let allFilesExist = true;
const results = [];

filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  const message = exists ? '存在' : '缺失';
  
  results.push({ file, exists, status, message });
  allFilesExist = allFilesExist && exists;
  
  console.log(`${status} ${file} - ${message}`);
});

console.log('\n📊 检查结果:');
console.log(`总文件数: ${filesToCheck.length}`);
console.log(`存在文件: ${results.filter(r => r.exists).length}`);
console.log(`缺失文件: ${results.filter(r => !r.exists).length}`);

// 检查关键集成点
console.log('\n🔧 检查关键集成点...');

const integrationChecks = [
  {
    name: 'AI组件导出',
    file: 'static/react-kefu/src/components/index.js',
    patterns: ['EnterpriseAI', 'AIIntegrationTest', 'EnterpriseAI.css']
  },
  {
    name: 'WebSocket AI消息处理',
    file: 'static/react-kefu/src/components/EnterpriseWebSocket.jsx',
    patterns: ['AITaskSubmitted', 'AITaskCompleted', 'AITaskFailed']
  },
  {
    name: '通知系统AI处理',
    file: 'static/react-kefu/src/components/EnterpriseNotifications.jsx',
    patterns: ['handleAITaskSubmittedMessage', 'handleAITaskCompletedMessage']
  },
  {
    name: '仪表板AI集成',
    file: 'static/react-kefu/src/components/EnterpriseDashboard.jsx',
    patterns: ['EnterpriseAIExample', 'AI功能']
  }
];

integrationChecks.forEach(check => {
  if (fs.existsSync(check.file)) {
    const content = fs.readFileSync(check.file, 'utf8');
    const foundPatterns = check.patterns.filter(pattern => 
      content.includes(pattern)
    );
    
    const status = foundPatterns.length === check.patterns.length ? '✅' : '⚠️';
    const message = foundPatterns.length === check.patterns.length 
      ? '完整' 
      : `部分 (${foundPatterns.length}/${check.patterns.length})`;
    
    console.log(`${status} ${check.name} - ${message}`);
    
    if (foundPatterns.length < check.patterns.length) {
      const missing = check.patterns.filter(p => !content.includes(p));
      console.log(`   缺失: ${missing.join(', ')}`);
    }
  } else {
    console.log(`❌ ${check.name} - 文件不存在`);
  }
});

// 最终状态
console.log('\n🎯 集成状态总结:');
if (allFilesExist) {
  console.log('✅ AI集成已完成！所有组件都已就位。');
  console.log('\n🚀 下一步:');
  console.log('1. 配置AI服务API密钥');
  console.log('2. 启动后端服务器: cargo run');
  console.log('3. 启动前端开发服务器: npm run dev');
  console.log('4. 访问AI功能演示页面');
  console.log('5. 运行集成测试验证功能');
} else {
  console.log('❌ AI集成未完成，请检查缺失的文件。');
  console.log('\n缺失的文件:');
  results.filter(r => !r.exists).forEach(r => {
    console.log(`  - ${r.file}`);
  });
}

console.log('\n📖 详细文档请查看: AI_INTEGRATION_SUMMARY.md');