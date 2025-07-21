#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceChecker {
  constructor() {
    this.issues = [];
    this.stats = {
      totalFiles: 0,
      totalLines: 0,
      issuesFound: 0
    };
  }

  // 检查单个文件
  checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      this.stats.totalFiles++;
      this.stats.totalLines += lines.length;

      // 检查各种性能问题
      this.checkReactMemo(filePath, content, lines);
      this.checkUseCallback(filePath, content, lines);
      this.checkUseMemo(filePath, content, lines);
      this.checkKeyProps(filePath, content, lines);
      this.checkStateUpdates(filePath, content, lines);
      this.checkSideEffects(filePath, content, lines);
      this.checkComponentComplexity(filePath, content, lines);
      this.checkImports(filePath, content, lines);
      this.checkEventHandlers(filePath, content, lines);
      this.checkRenderingOptimization(filePath, content, lines);
      this.checkMemoryLeaks(filePath, content, lines);
      this.checkBundleSize(filePath, content, lines);

    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
    }
  }

  // 检查React.memo使用
  checkReactMemo(filePath, content, lines) {
    const componentRegex = /function\s+(\w+)\s*\(/g;
    const memoRegex = /React\.memo\s*\(/g;
    let match;

    while ((match = componentRegex.exec(content)) !== null) {
      const componentName = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // 检查是否使用了React.memo
      if (!memoRegex.test(content)) {
        this.addIssue({
          type: 'performance',
          severity: 'medium',
          file: filePath,
          line: lineNumber,
          message: `组件 ${componentName} 应该使用 React.memo 进行优化`,
          suggestion: `使用 React.memo(${componentName}) 包装组件`
        });
      }
    }
  }

  // 检查useCallback使用
  checkUseCallback(filePath, content, lines) {
    const functionDefRegex = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g;
    const useCallbackRegex = /useCallback\s*\(/g;
    let match;

    while ((match = functionDefRegex.exec(content)) !== null) {
      const functionName = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // 检查是否是事件处理函数
      if (functionName.startsWith('handle') || functionName.startsWith('on')) {
        const functionContent = this.getFunctionContent(content, match.index);
        
        if (!useCallbackRegex.test(functionContent)) {
          this.addIssue({
            type: 'performance',
            severity: 'medium',
            file: filePath,
            line: lineNumber,
            message: `事件处理函数 ${functionName} 应该使用 useCallback 优化`,
            suggestion: `使用 useCallback 包装 ${functionName} 函数`
          });
        }
      }
    }
  }

  // 检查useMemo使用
  checkUseMemo(filePath, content, lines) {
    const expensiveOperations = [
      /\.map\s*\(/g,
      /\.filter\s*\(/g,
      /\.reduce\s*\(/g,
      /\.sort\s*\(/g,
      /JSON\.parse\s*\(/g,
      /JSON\.stringify\s*\(/g
    ];

    expensiveOperations.forEach((regex, index) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const lineContent = lines[lineNumber - 1];
        
        // 检查是否在组件内部且没有使用useMemo
        if (this.isInComponentScope(content, match.index) && !lineContent.includes('useMemo')) {
          this.addIssue({
            type: 'performance',
            severity: 'high',
            file: filePath,
            line: lineNumber,
            message: `检测到昂贵的操作，应该使用 useMemo 优化`,
            suggestion: `使用 useMemo 缓存计算结果`
          });
        }
      }
    });
  }

  // 检查key属性
  checkKeyProps(filePath, content, lines) {
    const mapRegex = /\.map\s*\([^)]*=>\s*<[^>]*>/g;
    const keyRegex = /key\s*=\s*\{/g;
    let match;

    while ((match = mapRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const mapContent = match[0];
      
      if (!keyRegex.test(mapContent)) {
        this.addIssue({
          type: 'performance',
          severity: 'high',
          file: filePath,
          line: lineNumber,
          message: 'map 渲染的组件缺少 key 属性',
          suggestion: '为每个渲染的组件添加唯一的 key 属性'
        });
      }
    }

    // 检查是否使用了index作为key
    const indexKeyRegex = /key\s*=\s*\{[^}]*index[^}]*\}/g;
    while ((match = indexKeyRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      this.addIssue({
        type: 'performance',
        severity: 'medium',
        file: filePath,
        line: lineNumber,
        message: '不应该使用数组索引作为 key',
        suggestion: '使用稳定的唯一标识符作为 key'
      });
    }
  }

  // 检查状态更新
  checkStateUpdates(filePath, content, lines) {
    const stateUpdateRegex = /setState\s*\([^)]*\)/g;
    const functionalUpdateRegex = /setState\s*\([^)]*=>/g;
    let match;

    while ((match = stateUpdateRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const updateContent = match[0];
      
      if (!functionalUpdateRegex.test(updateContent)) {
        this.addIssue({
          type: 'performance',
          severity: 'low',
          file: filePath,
          line: lineNumber,
          message: '状态更新应该使用函数式更新',
          suggestion: '使用 setState(prevState => newState) 的形式'
        });
      }
    }
  }

  // 检查副作用
  checkSideEffects(filePath, content, lines) {
    const useEffectRegex = /useEffect\s*\([^)]*\)/g;
    let match;

    while ((match = useEffectRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const effectContent = match[0];
      
      // 检查是否有依赖数组
      if (!effectContent.includes('[') || effectContent.includes('[]')) {
        this.addIssue({
          type: 'performance',
          severity: 'medium',
          file: filePath,
          line: lineNumber,
          message: 'useEffect 缺少依赖数组或依赖数组为空',
          suggestion: '添加正确的依赖数组或使用 useCallback/useMemo 优化依赖'
        });
      }
    }
  }

  // 检查组件复杂度
  checkComponentComplexity(filePath, content, lines) {
    const componentRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let match;

    while ((match = componentRegex.exec(content)) !== null) {
      const componentName = match[1];
      const startIndex = match.index;
      const endIndex = this.findClosingBrace(content, startIndex);
      const componentContent = content.substring(startIndex, endIndex);
      const componentLines = componentContent.split('\n').length;

      if (componentLines > 100) {
        const lineNumber = content.substring(0, startIndex).split('\n').length;
        
        this.addIssue({
          type: 'maintainability',
          severity: 'medium',
          file: filePath,
          line: lineNumber,
          message: `组件 ${componentName} 过于复杂 (${componentLines} 行)`,
          suggestion: '考虑将组件拆分为更小的子组件'
        });
      }
    }
  }

  // 检查导入优化
  checkImports(filePath, content, lines) {
    const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // 检查是否导入了整个库
      if (importPath.includes('lodash') && !importPath.includes('/')) {
        this.addIssue({
          type: 'bundle-size',
          severity: 'medium',
          file: filePath,
          line: lineNumber,
          message: '导入了整个 lodash 库',
          suggestion: '使用具体路径导入，如 import debounce from "lodash/debounce"'
        });
      }

      // 检查是否使用了动态导入
      if (importPath.startsWith('.') && !content.includes('lazy(')) {
        this.addIssue({
          type: 'performance',
          severity: 'low',
          file: filePath,
          line: lineNumber,
          message: '考虑使用动态导入优化加载',
          suggestion: '使用 React.lazy() 进行代码分割'
        });
      }
    }
  }

  // 检查事件处理器
  checkEventHandlers(filePath, content, lines) {
    const eventHandlerRegex = /onClick\s*=\s*\{[^}]*\}/g;
    let match;

    while ((match = eventHandlerRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const handlerContent = match[0];
      
      // 检查是否内联创建了函数
      if (handlerContent.includes('() =>') || handlerContent.includes('function(')) {
        this.addIssue({
          type: 'performance',
          severity: 'medium',
          file: filePath,
          line: lineNumber,
          message: '事件处理器内联创建函数',
          suggestion: '将事件处理器提取为组件方法或使用 useCallback'
        });
      }
    }
  }

  // 检查渲染优化
  checkRenderingOptimization(filePath, content, lines) {
    // 检查条件渲染
    const conditionalRenderRegex = /\{[^}]*\?\s*<[^>]*>\s*:\s*<[^>]*>\s*\}/g;
    let match;

    while ((match = conditionalRenderRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      this.addIssue({
        type: 'performance',
        severity: 'low',
        file: filePath,
        line: lineNumber,
        message: '复杂的条件渲染可能影响性能',
        suggestion: '考虑提取为单独的组件或使用 useMemo 优化'
      });
    }

    // 检查列表渲染
    const listRenderRegex = /\{[^}]*\.map\s*\([^)]*\)[^}]*\}/g;
    while ((match = listRenderRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      this.addIssue({
        type: 'performance',
        severity: 'medium',
        file: filePath,
        line: lineNumber,
        message: '大型列表应该使用虚拟滚动',
        suggestion: '考虑使用 react-window 或 react-virtualized 进行虚拟化'
      });
    }
  }

  // 检查内存泄漏
  checkMemoryLeaks(filePath, content, lines) {
    const useEffectRegex = /useEffect\s*\([^)]*\)/g;
    let match;

    while ((match = useEffectRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const effectContent = match[0];
      
      // 检查是否有定时器但没有清理
      if (effectContent.includes('setInterval') || effectContent.includes('setTimeout')) {
        const fullEffect = this.getEffectContent(content, match.index);
        
        if (!fullEffect.includes('clearInterval') && !fullEffect.includes('clearTimeout')) {
          this.addIssue({
            type: 'memory-leak',
            severity: 'high',
            file: filePath,
            line: lineNumber,
            message: 'useEffect 中设置了定时器但没有清理',
            suggestion: '在 useEffect 的清理函数中清除定时器'
          });
        }
      }

      // 检查是否有事件监听器但没有清理
      if (effectContent.includes('addEventListener')) {
        const fullEffect = this.getEffectContent(content, match.index);
        
        if (!fullEffect.includes('removeEventListener')) {
          this.addIssue({
            type: 'memory-leak',
            severity: 'high',
            file: filePath,
            line: lineNumber,
            message: 'useEffect 中添加了事件监听器但没有清理',
            suggestion: '在 useEffect 的清理函数中移除事件监听器'
          });
        }
      }
    }
  }

  // 检查包大小
  checkBundleSize(filePath, content, lines) {
    const largeImportRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = largeImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // 检查大型库的导入
      const largeLibraries = [
        'moment',
        'lodash',
        'underscore',
        'jquery',
        'bootstrap'
      ];

      largeLibraries.forEach(lib => {
        if (importPath.includes(lib)) {
          this.addIssue({
            type: 'bundle-size',
            severity: 'medium',
            file: filePath,
            line: lineNumber,
            message: `导入了大型库 ${lib}`,
            suggestion: `考虑使用更轻量的替代方案或按需导入`
          });
        }
      });
    }
  }

  // 辅助方法
  addIssue(issue) {
    this.issues.push(issue);
    this.stats.issuesFound++;
  }

  getFunctionContent(content, startIndex) {
    const openBrace = content.indexOf('{', startIndex);
    if (openBrace === -1) return '';
    
    const endIndex = this.findClosingBrace(content, openBrace);
    return content.substring(openBrace, endIndex);
  }

  getEffectContent(content, startIndex) {
    const openParen = content.indexOf('(', startIndex);
    if (openParen === -1) return '';
    
    const endIndex = this.findClosingParen(content, openParen);
    return content.substring(openParen, endIndex);
  }

  findClosingBrace(content, startIndex) {
    let braceCount = 0;
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) return i + 1;
      }
    }
    return content.length;
  }

  findClosingParen(content, startIndex) {
    let parenCount = 0;
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '(') parenCount++;
      if (content[i] === ')') {
        parenCount--;
        if (parenCount === 0) return i + 1;
      }
    }
    return content.length;
  }

  isInComponentScope(content, index) {
    const beforeContent = content.substring(0, index);
    const componentMatch = beforeContent.match(/function\s+\w+\s*\([^)]*\)\s*\{/g);
    return componentMatch && componentMatch.length > 0;
  }

  // 生成报告
  generateReport() {
    const report = {
      summary: {
        totalFiles: this.stats.totalFiles,
        totalLines: this.stats.totalLines,
        issuesFound: this.stats.issuesFound,
        scanTime: new Date().toISOString()
      },
      issues: this.issues,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  // 生成建议
  generateRecommendations() {
    const recommendations = {
      high: [],
      medium: [],
      low: []
    };

    const issueTypes = {};
    this.issues.forEach(issue => {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
    });

    // 根据问题类型生成建议
    if (issueTypes['performance'] > 5) {
      recommendations.high.push('大量性能问题，建议优先使用 React.memo、useCallback、useMemo 进行优化');
    }

    if (issueTypes['memory-leak'] > 0) {
      recommendations.high.push('发现内存泄漏风险，请检查 useEffect 的清理函数');
    }

    if (issueTypes['bundle-size'] > 3) {
      recommendations.medium.push('包大小问题较多，建议进行代码分割和按需导入优化');
    }

    if (this.stats.totalLines > 10000) {
      recommendations.medium.push('代码量较大，建议进行组件拆分和模块化');
    }

    return recommendations;
  }

  // 打印报告
  printReport(report) {
    console.log('\n🚀 React 性能检查报告');
    console.log('='.repeat(50));
    
    console.log(`\n📊 统计信息:`);
    console.log(`   - 检查文件数: ${report.summary.totalFiles}`);
    console.log(`   - 总代码行数: ${report.summary.totalLines}`);
    console.log(`   - 发现问题数: ${report.summary.issuesFound}`);
    
    if (report.issues.length > 0) {
      console.log(`\n⚠️  发现的问题:`);
      
      const groupedIssues = this.groupIssuesBySeverity(report.issues);
      
      ['high', 'medium', 'low'].forEach(severity => {
        const issues = groupedIssues[severity];
        if (issues.length > 0) {
          console.log(`\n${this.getSeverityIcon(severity)} ${severity.toUpperCase()} 优先级 (${issues.length} 个):`);
          issues.forEach(issue => {
            console.log(`   📁 ${issue.file}:${issue.line}`);
            console.log(`      ${issue.message}`);
            console.log(`      💡 建议: ${issue.suggestion}`);
          });
        }
      });
    }

    console.log(`\n💡 优化建议:`);
    Object.entries(report.recommendations).forEach(([priority, suggestions]) => {
      if (suggestions.length > 0) {
        console.log(`\n${this.getSeverityIcon(priority)} ${priority.toUpperCase()} 优先级:`);
        suggestions.forEach(suggestion => {
          console.log(`   - ${suggestion}`);
        });
      }
    });

    console.log('\n' + '='.repeat(50));
  }

  groupIssuesBySeverity(issues) {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.severity]) acc[issue.severity] = [];
      acc[issue.severity].push(issue);
      return acc;
    }, {});
  }

  getSeverityIcon(severity) {
    const icons = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity] || '⚪';
  }

  // 扫描目录
  scanDirectory(dirPath, extensions = ['.jsx', '.js', '.tsx', '.ts']) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // 跳过 node_modules 和 .git 目录
        if (file !== 'node_modules' && file !== '.git') {
          this.scanDirectory(filePath, extensions);
        }
      } else if (extensions.includes(path.extname(file))) {
        this.checkFile(filePath);
      }
    });
  }
}

// 主函数
async function main() {
  const checker = new PerformanceChecker();
  const projectRoot = path.resolve(__dirname, '..');
  const srcPath = path.join(projectRoot, 'src');
  
  console.log('🔍 开始扫描 React 项目性能问题...');
  console.log(`📁 扫描目录: ${srcPath}`);
  
  if (fs.existsSync(srcPath)) {
    checker.scanDirectory(srcPath);
  } else {
    console.error('❌ src 目录不存在');
    process.exit(1);
  }
  
  const report = checker.generateReport();
  checker.printReport(report);
  
  // 保存报告到文件
  const reportPath = path.join(projectRoot, 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  
  // 根据问题数量设置退出码
  if (report.summary.issuesFound > 10) {
    console.log('\n⚠️  发现较多问题，建议优先处理高优先级问题');
    process.exit(1);
  } else if (report.summary.issuesFound > 0) {
    console.log('\n✅ 发现少量问题，建议逐步优化');
    process.exit(0);
  } else {
    console.log('\n🎉 未发现明显的性能问题！');
    process.exit(0);
  }
}

// 运行检查
main().catch(error => {
  console.error('❌ 检查过程中发生错误:', error);
  process.exit(1);
});