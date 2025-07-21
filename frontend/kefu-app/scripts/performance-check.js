#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * React性能优化检查工具
 * 分析项目中的性能问题和优化机会
 */
class PerformanceChecker {
  constructor() {
    this.issues = [];
    this.stats = {
      totalFiles: 0,
      totalLines: 0,
      issuesFound: 0,
      optimizationOpportunities: 0,
    };
  }

  /**
   * 检查单个文件
   * @param {string} filePath 文件路径
   */
  checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      this.stats.totalFiles++;
      this.stats.totalLines += lines.length;

      // 检查React.memo使用
      this.checkReactMemo(filePath, content, lines);
      
      // 检查useCallback使用
      this.checkUseCallback(filePath, content, lines);
      
      // 检查useMemo使用
      this.checkUseMemo(filePath, content, lines);
      
      // 检查key属性
      this.checkKeyProps(filePath, content, lines);
      
      // 检查状态更新
      this.checkStateUpdates(filePath, content, lines);
      
      // 检查副作用处理
      this.checkSideEffects(filePath, content, lines);
      
      // 检查组件复杂度
      this.checkComponentComplexity(filePath, content, lines);
      
      // 检查导入优化
      this.checkImports(filePath, content, lines);
      
    } catch (error) {
      console.error(`Error checking file ${filePath}:`, error.message);
    }
  }

  /**
   * 检查React.memo使用
   */
  checkReactMemo(filePath, content, lines) {
    const componentRegex = /export\s+(?:const|function)\s+(\w+)\s*=/g;
    const memoRegex = /React\.memo\(/g;
    
    let match;
    const components = [];
    while ((match = componentRegex.exec(content)) !== null) {
      components.push(match[1]);
    }
    
    const hasMemo = memoRegex.test(content);
    
    if (components.length > 0 && !hasMemo) {
      this.addIssue({
        type: 'optimization',
        severity: 'medium',
        file: filePath,
        line: 0,
        message: `组件 ${components.join(', ')} 应该使用 React.memo 包装以提高性能`,
        suggestion: '使用 React.memo 包装纯组件以避免不必要的重渲染',
      });
    }
  }

  /**
   * 检查useCallback使用
   */
  checkUseCallback(filePath, content, lines) {
    const functionRegex = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{/g;
    const callbackRegex = /useCallback\(/g;
    
    let match;
    const functions = [];
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
    
    const hasCallback = callbackRegex.test(content);
    
    if (functions.length > 3 && !hasCallback) {
      this.addIssue({
        type: 'optimization',
        severity: 'medium',
        file: filePath,
        line: 0,
        message: `文件包含多个函数定义，考虑使用 useCallback 优化`,
        suggestion: '对传递给子组件的函数使用 useCallback 以避免不必要的重渲染',
      });
    }
  }

  /**
   * 检查useMemo使用
   */
  checkUseMemo(filePath, content, lines) {
    const expensiveOperations = [
      /\.filter\(/g,
      /\.map\(/g,
      /\.reduce\(/g,
      /\.sort\(/g,
      /JSON\.parse\(/g,
      /JSON\.stringify\(/g,
    ];
    
    let hasExpensiveOps = false;
    expensiveOperations.forEach(regex => {
      if (regex.test(content)) {
        hasExpensiveOps = true;
      }
    });
    
    const hasMemo = /useMemo\(/g.test(content);
    
    if (hasExpensiveOps && !hasMemo) {
      this.addIssue({
        type: 'optimization',
        severity: 'high',
        file: filePath,
        line: 0,
        message: '文件包含昂贵的计算操作，考虑使用 useMemo 优化',
        suggestion: '对昂贵的计算使用 useMemo 以避免每次渲染都重新计算',
      });
    }
  }

  /**
   * 检查key属性
   */
  checkKeyProps(filePath, content, lines) {
    const mapRegex = /\.map\([^)]*\)/g;
    const keyRegex = /key=\{/g;
    
    let match;
    let mapCount = 0;
    let keyCount = 0;
    
    while ((match = mapRegex.exec(content)) !== null) {
      mapCount++;
    }
    
    while ((match = keyRegex.exec(content)) !== null) {
      keyCount++;
    }
    
    if (mapCount > keyCount) {
      this.addIssue({
        type: 'warning',
        severity: 'high',
        file: filePath,
        line: 0,
        message: `检测到 ${mapCount} 个 map 操作，但只有 ${keyCount} 个 key 属性`,
        suggestion: '为所有列表项添加唯一的 key 属性以提高渲染性能',
      });
    }
  }

  /**
   * 检查状态更新
   */
  checkStateUpdates(filePath, content, lines) {
    const directMutationRegex = /\.push\(/g;
    const directAssignmentRegex = /\[\d+\]\s*=/g;
    
    if (directMutationRegex.test(content) || directAssignmentRegex.test(content)) {
      this.addIssue({
        type: 'error',
        severity: 'high',
        file: filePath,
        line: 0,
        message: '检测到直接状态修改，这可能导致渲染问题',
        suggestion: '使用不可变更新模式，如展开运算符或数组方法',
      });
    }
  }

  /**
   * 检查副作用处理
   */
  checkSideEffects(filePath, content, lines) {
    const eventListeners = [
      /addEventListener\(/g,
      /setInterval\(/g,
      /setTimeout\(/g,
    ];
    
    const hasEventListeners = eventListeners.some(regex => regex.test(content));
    const hasCleanup = /removeEventListener\(/g.test(content) || /clearInterval\(/g.test(content) || /clearTimeout\(/g.test(content);
    
    if (hasEventListeners && !hasCleanup) {
      this.addIssue({
        type: 'warning',
        severity: 'medium',
        file: filePath,
        line: 0,
        message: '检测到事件监听器但缺少清理逻辑',
        suggestion: '在 useEffect 的清理函数中移除事件监听器以避免内存泄漏',
      });
    }
  }

  /**
   * 检查组件复杂度
   */
  checkComponentComplexity(filePath, content, lines) {
    const componentRegex = /export\s+(?:const|function)\s+(\w+)\s*=/g;
    let match;
    
    while ((match = componentRegex.exec(content)) !== null) {
      const componentName = match[1];
      const componentStart = match.index;
      
      // 找到组件结束位置
      let braceCount = 0;
      let componentEnd = componentStart;
      let inString = false;
      let stringChar = '';
      
      for (let i = componentStart; i < content.length; i++) {
        const char = content[i];
        
        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
        } else if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              componentEnd = i;
              break;
            }
          }
        }
      }
      
      const componentContent = content.substring(componentStart, componentEnd);
      const lineCount = componentContent.split('\n').length;
      
      if (lineCount > 100) {
        this.addIssue({
          type: 'refactor',
          severity: 'medium',
          file: filePath,
          line: 0,
          message: `组件 ${componentName} 过于复杂 (${lineCount} 行)`,
          suggestion: '考虑将组件拆分为更小的子组件以提高可维护性',
        });
      }
    }
  }

  /**
   * 检查导入优化
   */
  checkImports(filePath, content, lines) {
    const wildcardImportRegex = /import\s+\*\s+as\s+\w+\s+from/g;
    const unusedImportRegex = /import\s+\{[^}]*\}\s+from/g;
    
    if (wildcardImportRegex.test(content)) {
      this.addIssue({
        type: 'optimization',
        severity: 'low',
        file: filePath,
        line: 0,
        message: '检测到通配符导入，可能影响 Tree Shaking',
        suggestion: '使用具名导入以支持更好的 Tree Shaking',
      });
    }
  }

  /**
   * 添加问题
   */
  addIssue(issue) {
    this.issues.push(issue);
    this.stats.issuesFound++;
    
    if (issue.type === 'optimization') {
      this.stats.optimizationOpportunities++;
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    const report = {
      summary: {
        totalFiles: this.stats.totalFiles,
        totalLines: this.stats.totalLines,
        issuesFound: this.stats.issuesFound,
        optimizationOpportunities: this.stats.optimizationOpportunities,
      },
      issues: this.issues,
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    const issueTypes = this.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});
    
    if (issueTypes.optimization > 0) {
      recommendations.push({
        priority: 'high',
        category: '性能优化',
        actions: [
          '使用 React.memo 包装纯组件',
          '对昂贵的计算使用 useMemo',
          '对传递给子组件的函数使用 useCallback',
          '实现虚拟滚动处理长列表',
          '使用图片懒加载',
        ],
      });
    }
    
    if (issueTypes.warning > 0) {
      recommendations.push({
        priority: 'medium',
        category: '代码质量',
        actions: [
          '为所有列表项添加唯一的 key 属性',
          '在 useEffect 中正确清理副作用',
          '避免直接修改状态',
        ],
      });
    }
    
    if (issueTypes.refactor > 0) {
      recommendations.push({
        priority: 'medium',
        category: '代码重构',
        actions: [
          '将大型组件拆分为更小的子组件',
          '提取可复用的逻辑到自定义 Hook',
          '优化组件层次结构',
        ],
      });
    }
    
    return recommendations;
  }

  /**
   * 打印报告
   */
  printReport(report) {
    console.log('\n🚀 React 性能优化检查报告');
    console.log('=' .repeat(50));
    
    console.log('\n📊 统计信息:');
    console.log(`  总文件数: ${report.summary.totalFiles}`);
    console.log(`  总代码行数: ${report.summary.totalLines}`);
    console.log(`  发现问题: ${report.summary.issuesFound}`);
    console.log(`  优化机会: ${report.summary.optimizationOpportunities}`);
    
    if (report.issues.length > 0) {
      console.log('\n⚠️ 发现的问题:');
      report.issues.forEach((issue, index) => {
        const severityIcon = {
          high: '🔴',
          medium: '🟡',
          low: '🟢',
        }[issue.severity];
        
        console.log(`\n${index + 1}. ${severityIcon} ${issue.severity.toUpperCase()}: ${issue.message}`);
        console.log(`   文件: ${issue.file}`);
        console.log(`   建议: ${issue.suggestion}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 优化建议:');
      report.recommendations.forEach((rec, index) => {
        const priorityIcon = {
          high: '🔴',
          medium: '🟡',
          low: '🟢',
        }[rec.priority];
        
        console.log(`\n${index + 1}. ${priorityIcon} ${rec.category} (${rec.priority}):`);
        rec.actions.forEach(action => {
          console.log(`   • ${action}`);
        });
      });
    }
    
    console.log('\n' + '=' .repeat(50));
  }

  /**
   * 扫描目录
   */
  scanDirectory(dirPath, extensions = ['.jsx', '.js', '.tsx', '.ts']) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        this.scanDirectory(fullPath, extensions);
      } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
        this.checkFile(fullPath);
      }
    });
  }
}

// 主函数
function main() {
  const checker = new PerformanceChecker();
  const srcPath = path.join(__dirname, '..', 'src');
  
  console.log('🔍 开始扫描 React 项目...');
  
  if (fs.existsSync(srcPath)) {
    checker.scanDirectory(srcPath);
  } else {
    console.error('❌ 未找到 src 目录');
    process.exit(1);
  }
  
  const report = checker.generateReport();
  checker.printReport(report);
  
  // 保存报告到文件
  const reportPath = path.join(__dirname, '..', 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  
  // 根据问题数量设置退出码
  if (report.summary.issuesFound > 0) {
    process.exit(1);
  }
}

// 运行检查
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}