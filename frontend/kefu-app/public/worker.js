// Web Worker for heavy computations
self.addEventListener('message', (event) => {
  const { data, type } = event.data;
  
  switch (type) {
    case 'PROCESS_DATA':
      const processedData = expensiveDataProcessing(data);
      self.postMessage(processedData);
      break;
      
    case 'CALCULATE_STATS':
      const stats = calculateStatistics(data);
      self.postMessage(stats);
      break;
      
    case 'FILTER_DATA':
      const filteredData = filterData(data.items, data.filters);
      self.postMessage(filteredData);
      break;
      
    case 'SORT_DATA':
      const sortedData = sortData(data.items, data.sortBy, data.sortDirection);
      self.postMessage(sortedData);
      break;
      
    case 'SEARCH_DATA':
      const searchResults = searchData(data.items, data.query);
      self.postMessage(searchResults);
      break;
      
    case 'ANALYZE_PERFORMANCE':
      const performanceData = analyzePerformanceData(data);
      self.postMessage(performanceData);
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

// 复杂数据处理函数
function expensiveDataProcessing(data) {
  const startTime = performance.now();
  
  // 模拟复杂计算
  const processed = data.map(item => {
    // 计算复杂分数
    const score = calculateComplexScore(item);
    
    // 计算派生指标
    const derivedMetrics = calculateDerivedMetrics(item);
    
    return {
      ...item,
      score,
      derivedMetrics,
      processedAt: new Date().toISOString()
    };
  });
  
  const endTime = performance.now();
  
  return {
    processed,
    processingTime: endTime - startTime,
    totalItems: processed.length
  };
}

// 计算复杂分数
function calculateComplexScore(item) {
  let score = 0;
  
  // 基础分数
  if (item.value) score += item.value * 0.3;
  if (item.weight) score += item.weight * 0.2;
  
  // 时间衰减
  if (item.timestamp) {
    const age = Date.now() - new Date(item.timestamp).getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    score *= Math.exp(-daysOld / 30); // 30天半衰期
  }
  
  // 随机因子
  score += Math.random() * 0.1;
  
  return Math.max(0, Math.min(100, score));
}

// 计算派生指标
function calculateDerivedMetrics(item) {
  const metrics = {};
  
  // 计算趋势
  if (item.history && item.history.length > 1) {
    const recent = item.history.slice(-5);
    const older = item.history.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    metrics.trend = recentAvg - olderAvg;
    metrics.volatility = Math.sqrt(
      recent.reduce((sum, val) => sum + Math.pow(val - recentAvg, 2), 0) / recent.length
    );
  }
  
  // 计算相关性
  if (item.relatedItems) {
    metrics.correlation = item.relatedItems.reduce((sum, related) => {
      return sum + (related.similarity || 0);
    }, 0) / item.relatedItems.length;
  }
  
  return metrics;
}

// 计算统计信息
function calculateStatistics(data) {
  const values = data.map(item => item.value || 0).filter(val => !isNaN(val));
  
  if (values.length === 0) {
    return { error: 'No valid data' };
  }
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  const sorted = values.slice().sort((a, b) => a - b);
  const median = calculateMedian(sorted);
  const stdDev = calculateStandardDeviation(values, mean);
  
  return {
    count: values.length,
    sum,
    mean: mean.toFixed(2),
    median: median.toFixed(2),
    min: Math.min(...values),
    max: Math.max(...values),
    standardDeviation: stdDev.toFixed(2),
    variance: Math.pow(stdDev, 2).toFixed(2),
    quartiles: {
      q1: calculatePercentile(sorted, 25),
      q2: median,
      q3: calculatePercentile(sorted, 75)
    }
  };
}

// 计算中位数
function calculateMedian(sortedValues) {
  const len = sortedValues.length;
  if (len % 2 === 0) {
    return (sortedValues[len / 2 - 1] + sortedValues[len / 2]) / 2;
  } else {
    return sortedValues[Math.floor(len / 2)];
  }
}

// 计算标准差
function calculateStandardDeviation(values, mean) {
  const variance = values.reduce((sum, val) => {
    return sum + Math.pow(val - mean, 2);
  }, 0) / values.length;
  
  return Math.sqrt(variance);
}

// 计算百分位数
function calculatePercentile(sortedValues, percentile) {
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper === lower) {
    return sortedValues[lower];
  }
  
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

// 数据过滤
function filterData(items, filters) {
  return items.filter(item => {
    return Object.entries(filters).every(([key, filterValue]) => {
      if (!filterValue) return true;
      
      const itemValue = item[key];
      
      if (typeof filterValue === 'string') {
        return itemValue && itemValue.toString().toLowerCase().includes(filterValue.toLowerCase());
      }
      
      if (typeof filterValue === 'object') {
        if (filterValue.min !== undefined && itemValue < filterValue.min) return false;
        if (filterValue.max !== undefined && itemValue > filterValue.max) return false;
        if (filterValue.values && !filterValue.values.includes(itemValue)) return false;
      }
      
      return itemValue === filterValue;
    });
  });
}

// 数据排序
function sortData(items, sortBy, sortDirection = 'asc') {
  const sorted = items.slice().sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    // 处理日期
    if (aVal instanceof Date) aVal = aVal.getTime();
    if (bVal instanceof Date) bVal = bVal.getTime();
    
    // 处理字符串
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    
    // 处理数字
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    // 处理字符串
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

// 数据搜索
function searchData(items, query) {
  if (!query || query.trim() === '') {
    return items;
  }
  
  const searchTerm = query.toLowerCase();
  const searchFields = ['name', 'description', 'tags', 'content'];
  
  return items.filter(item => {
    return searchFields.some(field => {
      const value = item[field];
      if (!value) return false;
      
      if (Array.isArray(value)) {
        return value.some(v => v.toString().toLowerCase().includes(searchTerm));
      }
      
      return value.toString().toLowerCase().includes(searchTerm);
    });
  });
}

// 性能数据分析
function analyzePerformanceData(data) {
  const analysis = {
    totalRequests: data.length,
    averageResponseTime: 0,
    slowestRequests: [],
    fastestRequests: [],
    errorRate: 0,
    statusCodes: {},
    timeDistribution: {
      fast: 0,    // < 100ms
      medium: 0,  // 100-500ms
      slow: 0,    // 500-1000ms
      verySlow: 0 // > 1000ms
    }
  };
  
  let totalTime = 0;
  let errorCount = 0;
  const responseTimes = [];
  
  data.forEach(request => {
    const responseTime = request.responseTime || 0;
    totalTime += responseTime;
    responseTimes.push(responseTime);
    
    // 统计状态码
    const status = request.status || 200;
    analysis.statusCodes[status] = (analysis.statusCodes[status] || 0) + 1;
    
    // 统计错误率
    if (status >= 400) {
      errorCount++;
    }
    
    // 时间分布
    if (responseTime < 100) analysis.timeDistribution.fast++;
    else if (responseTime < 500) analysis.timeDistribution.medium++;
    else if (responseTime < 1000) analysis.timeDistribution.slow++;
    else analysis.timeDistribution.verySlow++;
  });
  
  // 计算平均值
  analysis.averageResponseTime = totalTime / data.length;
  
  // 计算错误率
  analysis.errorRate = (errorCount / data.length) * 100;
  
  // 找出最快和最慢的请求
  const sorted = responseTimes.slice().sort((a, b) => a - b);
  analysis.fastestRequests = sorted.slice(0, 5);
  analysis.slowestRequests = sorted.slice(-5).reverse();
  
  return analysis;
}

// 错误处理
self.addEventListener('error', (event) => {
  console.error('Worker error:', event.error);
  self.postMessage({
    type: 'ERROR',
    error: event.error.message,
    filename: event.filename,
    lineno: event.lineno
  });
});

// 未处理的Promise拒绝
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  self.postMessage({
    type: 'ERROR',
    error: 'Unhandled promise rejection',
    reason: event.reason
  });
});