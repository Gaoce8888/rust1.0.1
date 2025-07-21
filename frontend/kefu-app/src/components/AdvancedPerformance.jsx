import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { performanceMonitor } from '@utils/performance';

// 1. React.memo 优化组件
const ExpensiveComponent = React.memo(({ data, onUpdate }) => {
  console.log('ExpensiveComponent rendered');
  
  // 复杂计算
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      score: item.value * Math.random(),
      processed: true
    }));
  }, [data]);

  return (
    <div className="p-4 border rounded">
      <h3>复杂组件</h3>
      <div className="space-y-2">
        {processedData.map(item => (
          <div key={item.id} className="flex justify-between">
            <span>{item.name}</span>
            <span>{item.score.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <button 
        onClick={() => onUpdate(processedData)}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        更新
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.version === nextProps.data.version
  );
});

// 2. useMemo 缓存计算结果
function DataProcessor({ items, filters }) {
  const processedData = useMemo(() => {
    console.log('Processing data...');
    return items
      .filter(item => filters.includes(item.category))
      .map(item => ({
        ...item,
        displayName: `${item.name} (${item.category})`,
        score: calculateScore(item)
      }))
      .sort((a, b) => b.score - a.score);
  }, [items, filters]); // 只在依赖变化时重新计算

  return (
    <div>
      <h3>数据处理结果</h3>
      <ul>
        {processedData.map(item => (
          <li key={item.id}>{item.displayName}: {item.score}</li>
        ))}
      </ul>
    </div>
  );
}

function calculateScore(item) {
  return item.value * item.weight + Math.random() * 10;
}

// 3. useCallback 避免子组件重渲染
function ParentComponent({ userId }) {
  const [data, setData] = useState(null);
  
  // ❌ 每次渲染都创建新函数
  // const handleUpdate = (newData) => {
  //   setData(newData);
  // };
  
  // ✅ 缓存函数引用
  const handleUpdate = useCallback((newData) => {
    setData(newData);
    // 可以安全地访问userId
    console.log(`User ${userId} updated data`);
  }, [userId]);

  return <ExpensiveComponent data={data} onUpdate={handleUpdate} />;
}

// 4. Context 优化
const UserContext = React.createContext(null);
const ThemeContext = React.createContext('light');

// ❌ 单一大Context导致所有消费者重渲染
// const AppContext = React.createContext({
//   user: null,
//   theme: 'light',
//   settings: {},
//   // ... 很多状态
// });

// ✅ 拆分Context减少不必要的重渲染
function OptimizedProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  // 分离不常变化的值
  const userValue = useMemo(() => ({ user, setUser }), [user]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  
  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        {children}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// 5. 路由级别的代码分割
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => 
  import(/* webpackChunkName: "dashboard" */ './pages/Dashboard')
);
const Settings = lazy(() => 
  import(/* webpackPrefetch: true */ './pages/Settings')
);

// 加载状态组件
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <p>加载中...</p>
    </div>
  );
}

function AppWithLazyRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// 6. 虚拟列表优化
function VirtualizedList({ items }) {
  const Row = useCallback(({ index, style }) => (
    <div style={style} className="p-2 border-b">
      <div className="flex items-center space-x-3">
        <img 
          src={items[index].avatar} 
          alt={items[index].name}
          className="w-8 h-8 rounded-full"
        />
        <div>
          <div className="font-medium">{items[index].name}</div>
          <div className="text-sm text-gray-500">{items[index].email}</div>
        </div>
      </div>
    </div>
  ), [items]);

  return (
    <div style={{ height: '400px' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={60}
            overscanCount={5}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

// 7. 分页数据Hook
function usePaginatedData(endpoint, pageSize = 20) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(`${endpoint}?page=${page}&size=${pageSize}`);
      const newData = await response.json();
      
      setData(prev => [...prev, ...newData.items]);
      setHasMore(newData.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, loading, hasMore]);

  return { data, loading, hasMore, loadMore };
}

// 8. 优化的列表项组件
const ListItem = React.memo(({ item, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  return (
    <div 
      onClick={handleClick}
      className="p-3 border rounded cursor-pointer hover:bg-gray-50"
    >
      <div className="font-medium">{item.name}</div>
      <div className="text-sm text-gray-500">{item.description}</div>
    </div>
  );
});

// 9. 图片优化
function OptimizedImage({ src, alt, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div className="relative">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded">
          <span className="text-gray-400">加载失败</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
}

// 10. 性能监控Hook
function usePerformanceMonitor(componentName) {
  useEffect(() => {
    performanceMonitor.startTimer(`${componentName}-mount`);
    return () => {
      performanceMonitor.endTimer(`${componentName}-mount`);
    };
  }, [componentName]);

  const measureOperation = useCallback((operationName, operation) => {
    performanceMonitor.startTimer(`${componentName}-${operationName}`);
    const result = operation();
    performanceMonitor.endTimer(`${componentName}-${operationName}`);
    return result;
  }, [componentName]);

  return { measureOperation };
}

// 11. 自定义性能标记
function usePerformanceMark(markName) {
  const markRef = useRef(null);

  const startMark = useCallback(() => {
    markRef.current = performance.mark(`${markName}-start`);
  }, [markName]);

  const endMark = useCallback(() => {
    if (markRef.current) {
      performance.mark(`${markName}-end`);
      performance.measure(markName, `${markName}-start`, `${markName}-end`);
    }
  }, [markName]);

  return { startMark, endMark };
}

// 12. 渐进式图片加载
function ProgressiveImage({ src, placeholder, alt }) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState();

  useEffect(() => {
    let observer;
    
    if (imageRef && imageSrc === placeholder) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = new Image();
              img.src = src;
              img.onload = () => setImageSrc(src);
              observer.unobserve(imageRef);
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(imageRef);
    }
    
    return () => {
      if (observer) observer.disconnect();
    };
  }, [imageRef, imageSrc, placeholder, src]);

  return (
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      className={imageSrc === placeholder ? 'loading' : 'loaded'}
    />
  );
}

// 13. 预加载优化
function preloadComponent(componentPath) {
  return () => import(componentPath);
}

// 鼠标悬停时预加载
function NavigationLink({ to, componentPath, children }) {
  const handleMouseEnter = () => {
    preloadComponent(componentPath)();
  };
  
  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}

// 14. 组件级别的懒加载
const HeavyComponent = lazy(() => import('./components/HeavyComponent'));

function MyPage() {
  const [showHeavy, setShowHeavy] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowHeavy(true)}>
        加载重组件
      </button>
      
      {showHeavy && (
        <Suspense fallback={<div>加载组件中...</div>}>
          <HeavyComponent />
        </Suspense>
      )}
    </div>
  );
}

// 15. 动态样式导入
function ThemeProvider({ theme, children }) {
  useEffect(() => {
    // 动态导入主题样式
    import(`./themes/${theme}.css`);
  }, [theme]);

  return <div className={`theme-${theme}`}>{children}</div>;
}

// 16. Web Worker 使用
function DataProcessor({ rawData }) {
  const [processedData, setProcessedData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker('/worker.js');
    
    workerRef.current.onmessage = (event) => {
      setProcessedData(event.data);
      setProcessing(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const processData = useCallback(() => {
    setProcessing(true);
    workerRef.current?.postMessage({ type: 'PROCESS_DATA', data: rawData });
  }, [rawData]);

  return (
    <div>
      <button onClick={processData} disabled={processing}>
        {processing ? '处理中...' : '处理数据'}
      </button>
      {processedData && (
        <div>
          <h3>处理结果</h3>
          <pre>{JSON.stringify(processedData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// 17. React DevTools Profiler 集成
function ProfiledApp() {
  const [renderCount, setRenderCount] = useState(0);

  const handleRender = useCallback(() => {
    setRenderCount(prev => prev + 1);
  }, []);

  return (
    <Profiler id="App" onRender={(id, phase, actualDuration) => {
      console.log(`${id} ${phase} took ${actualDuration}ms`);
    }}>
      <div>
        <h1>性能分析应用</h1>
        <p>渲染次数: {renderCount}</p>
        <button onClick={handleRender}>触发渲染</button>
        <ExpensiveComponent 
          data={{ id: 1, version: renderCount }}
          onUpdate={() => {}}
        />
      </div>
    </Profiler>
  );
}

// 18. 批量更新优化
function BatchUpdateExample() {
  const [items, setItems] = useState([]);

  // ❌ 每次更新都触发重渲染
  const addItemsBad = () => {
    for (let i = 0; i < 1000; i++) {
      setItems(prev => [...prev, { id: i, value: Math.random() }]);
    }
  };

  // ✅ 批量更新
  const addItemsGood = () => {
    const newItems = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: Math.random()
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  return (
    <div>
      <button onClick={addItemsBad}>错误方式添加</button>
      <button onClick={addItemsGood}>正确方式添加</button>
      <p>项目数量: {items.length}</p>
    </div>
  );
}

// 19. 防抖和节流优化
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce(async (searchTerm) => {
      if (!searchTerm) {
        setResults([]);
        return;
      }
      
      const response = await fetch(`/api/search?q=${searchTerm}`);
      const data = await response.json();
      setResults(data);
    }, 300),
    []
  );

  // 节流滚动处理
  const throttledScroll = useCallback(
    throttle((event) => {
      console.log('Scroll position:', event.target.scrollTop);
    }, 100),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索..."
        className="p-2 border rounded"
      />
      <div onScroll={throttledScroll} className="h-64 overflow-auto">
        {results.map(item => (
          <div key={item.id} className="p-2 border-b">
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// 20. 内存泄漏防护
function MemoryLeakPrevention() {
  const [data, setData] = useState([]);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController();

    const fetchData = async () => {
      try {
        const response = await fetch('/api/data', {
          signal: abortControllerRef.current.signal
        });
        const result = await response.json();
        setData(result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Fetch error:', error);
        }
      }
    };

    fetchData();

    // 清理函数
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div>
      <h3>数据列表</h3>
      <ul>
        {data.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

// 导出所有组件供参考
export {
  ExpensiveComponent,
  DataProcessor,
  ParentComponent,
  OptimizedProvider,
  AppWithLazyRoutes,
  VirtualizedList,
  usePaginatedData,
  ListItem,
  OptimizedImage,
  usePerformanceMonitor,
  usePerformanceMark,
  ProgressiveImage,
  NavigationLink,
  MyPage,
  ThemeProvider,
  DataProcessor as WorkerDataProcessor,
  ProfiledApp,
  BatchUpdateExample,
  SearchComponent,
  MemoryLeakPrevention
};

// 导入必要的依赖
import { debounce, throttle } from 'lodash.debounce';
import { Link, Routes, Route } from 'react-router-dom';
import { Profiler } from 'react';