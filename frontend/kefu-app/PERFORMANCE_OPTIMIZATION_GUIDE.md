# React 性能优化指南

本指南详细介绍了项目中实现的各种性能优化措施，包括组件优化、状态管理、渲染优化、资源优化、网络优化和构建优化。

## 📋 目录

- [组件优化](#组件优化)
- [状态管理优化](#状态管理优化)
- [渲染优化](#渲染优化)
- [资源优化](#资源优化)
- [网络优化](#网络优化)
- [构建优化](#构建优化)
- [性能监控](#性能监控)
- [最佳实践](#最佳实践)

## 🧩 组件优化

### 1. React.memo 优化

使用 `React.memo` 包装纯组件，避免不必要的重渲染。

```jsx
// ❌ 未优化
function ExpensiveComponent({ data, onUpdate }) {
  return <div>{/* 复杂渲染逻辑 */}</div>;
}

// ✅ 优化后
const ExpensiveComponent = React.memo(({ data, onUpdate }) => {
  return <div>{/* 复杂渲染逻辑 */}</div>;
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return prevProps.data.id === nextProps.data.id;
});
```

### 2. useMemo 缓存计算结果

对昂贵的计算使用 `useMemo` 进行缓存。

```jsx
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

  return <DataList data={processedData} />;
}
```

### 3. useCallback 优化函数引用

缓存函数引用，避免子组件不必要的重渲染。

```jsx
function ParentComponent({ userId }) {
  const [data, setData] = useState(null);
  
  // ✅ 缓存函数引用
  const handleUpdate = useCallback((newData) => {
    setData(newData);
    console.log(`User ${userId} updated data`);
  }, [userId]);

  return <ChildComponent onUpdate={handleUpdate} />;
}
```

### 4. Context 优化

拆分 Context 减少不必要的重渲染。

```jsx
// ❌ 单一大Context
const AppContext = React.createContext({
  user: null,
  theme: 'light',
  settings: {},
  // ... 很多状态
});

// ✅ 拆分Context
const UserContext = React.createContext(null);
const ThemeContext = React.createContext('light');

function OptimizedProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
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
```

## 🔄 状态管理优化

### 1. 优化的状态管理 Hooks

使用自定义 Hooks 进行状态管理优化。

```jsx
// 优化的列表状态管理
const {
  items: customers,
  addItem: addCustomer,
  removeItem: removeCustomer,
  updateItem: updateCustomer,
  setFilters,
  setSortBy,
  setSortDirection
} = useOptimizedList([]);

// 优化的表单状态管理
const {
  values: settings,
  setFieldValue: setSetting,
  handleSubmit: saveSettings
} = useOptimizedForm({
  soundNotifications: true,
  autoReply: false,
  showTypingIndicator: true
});
```

### 2. 防抖和节流状态

```jsx
// 防抖状态
const [value, setValue, debouncedValue] = useDebouncedState('', 300);

// 节流状态
const [scrollValue, setScrollValue, throttledScrollValue] = useThrottledState(0, 100);
```

## 🎨 渲染优化

### 1. 虚拟滚动

使用虚拟滚动处理大型列表。

```jsx
import { VirtualList } from './components/VirtualList';

function CustomerList({ customers }) {
  const renderCustomerItem = useCallback((customer, index) => (
    <div className="customer-item">
      <img src={customer.avatar} alt={customer.name} />
      <span>{customer.name}</span>
    </div>
  ), []);

  return (
    <VirtualList
      items={customers}
      itemHeight={80}
      itemRenderer={renderCustomerItem}
      className="customer-list"
    />
  );
}
```

### 2. 懒加载组件

```jsx
// 路由级别的代码分割
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => 
  import(/* webpackChunkName: "dashboard" */ './pages/Dashboard')
);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

### 3. 条件渲染优化

```jsx
// ❌ 复杂的内联条件渲染
{isLoading ? <Spinner /> : data ? <DataList data={data} /> : <EmptyState />}

// ✅ 提取为组件
const ConditionalContent = React.memo(({ isLoading, data }) => {
  if (isLoading) return <Spinner />;
  if (!data) return <EmptyState />;
  return <DataList data={data} />;
});
```

## 🖼️ 资源优化

### 1. 图片懒加载

```jsx
import { LazyImage } from './components/LazyImage';

function UserAvatar({ src, alt, ...props }) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      className="w-10 h-10 rounded-full"
      placeholder="/placeholder-avatar.png"
      fallback="/default-avatar.png"
    />
  );
}
```

### 2. 响应式图片

```jsx
import { ResponsiveImage } from './components/LazyImage';

function ProductImage({ product }) {
  return (
    <ResponsiveImage
      src={product.image}
      srcSet={{
        small: product.imageSmall,
        medium: product.imageMedium,
        large: product.imageLarge
      }}
      sizes="(max-width: 768px) 100vw, 50vw"
      alt={product.name}
    />
  );
}
```

### 3. 图片预加载

```jsx
import { useImagePreload } from './components/LazyImage';

function ImageGallery({ images }) {
  const { preloadAll, isLoaded } = useImagePreload(images.map(img => img.src));

  useEffect(() => {
    preloadAll();
  }, [preloadAll]);

  return (
    <div>
      {images.map(image => (
        <LazyImage key={image.id} src={image.src} alt={image.alt} />
      ))}
    </div>
  );
}
```

## 🌐 网络优化

### 1. 优化的 API 服务

```jsx
import { apiService, useOptimizedApi } from './services/optimizedApi';

// 使用优化的 API Hook
const { data, loading, error, refetch } = useOptimizedApi(
  async () => {
    const response = await fetch('/api/customers');
    return response.json();
  },
  [],
  {
    cache: true,
    cacheTime: 300000, // 5分钟缓存
    retryCount: 3
  }
);

// 直接使用 API 服务
const customers = await apiService.get('/api/customers', null, {
  cache: true,
  ttl: 60000,
  priority: 'normal'
});
```

### 2. 批量请求

```jsx
import { useBatchApi } from './services/optimizedApi';

function BatchDataLoader() {
  const requests = [
    { method: 'GET', url: '/api/users' },
    { method: 'GET', url: '/api/products' },
    { method: 'GET', url: '/api/orders' }
  ];

  const { results, loading, errors, execute } = useBatchApi(requests, {
    concurrency: 3
  });

  return (
    <div>
      {loading ? <Spinner /> : (
        <div>
          <UserList users={results[0]} />
          <ProductList products={results[1]} />
          <OrderList orders={results[2]} />
        </div>
      )}
    </div>
  );
}
```

## 📦 构建优化

### 1. 代码分割

```jsx
// 路由级别的代码分割
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => 
  import(/* webpackChunkName: "dashboard" */ './pages/Dashboard')
);

// 组件级别的代码分割
const HeavyComponent = lazy(() => import('./components/HeavyComponent'));
```

### 2. Tree Shaking

```jsx
// ✅ 支持 Tree Shaking 的导入
import { debounce } from 'lodash/debounce';
import { throttle } from 'lodash/throttle';

// ❌ 不支持 Tree Shaking 的导入
import _ from 'lodash';
```

### 3. 动态导入

```jsx
// 预加载组件
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
```

## 📊 性能监控

### 1. 性能监控工具

```jsx
import { performanceMonitor } from './utils/performance';

function MyComponent() {
  useEffect(() => {
    performanceMonitor.startTimer('MyComponent-mount');
    return () => {
      performanceMonitor.endTimer('MyComponent-mount');
    };
  }, []);

  const handleClick = useCallback(() => {
    performanceMonitor.startTimer('MyComponent-click');
    // 处理点击事件
    performanceMonitor.endTimer('MyComponent-click');
  }, []);

  return <button onClick={handleClick}>点击</button>;
}
```

### 2. 自定义性能标记

```jsx
import { usePerformanceMark } from './components/AdvancedPerformance';

function DataProcessor({ data }) {
  const { startMark, endMark } = usePerformanceMark('data-processing');

  const processData = useCallback(() => {
    startMark();
    // 处理数据
    const result = expensiveDataProcessing(data);
    endMark();
    return result;
  }, [data, startMark, endMark]);

  return <div>{/* 渲染结果 */}</div>;
}
```

### 3. React DevTools Profiler

```jsx
import { Profiler } from 'react';

function ProfiledApp() {
  const handleRender = useCallback((id, phase, actualDuration) => {
    console.log(`${id} ${phase} took ${actualDuration}ms`);
  }, []);

  return (
    <Profiler id="App" onRender={handleRender}>
      <App />
    </Profiler>
  );
}
```

## 🛠️ 最佳实践

### 1. 避免常见性能陷阱

```jsx
// ❌ 避免在渲染中创建新对象
function BadComponent({ items }) {
  return (
    <div>
      {items.map(item => (
        <ChildComponent 
          key={item.id}
          config={{ theme: 'dark', size: 'large' }} // 每次都创建新对象
        />
      ))}
    </div>
  );
}

// ✅ 使用 useMemo 缓存对象
function GoodComponent({ items }) {
  const config = useMemo(() => ({ theme: 'dark', size: 'large' }), []);
  
  return (
    <div>
      {items.map(item => (
        <ChildComponent key={item.id} config={config} />
      ))}
    </div>
  );
}
```

### 2. 正确的 key 使用

```jsx
// ❌ 使用索引作为 key
{items.map((item, index) => (
  <ListItem key={index} item={item} />
))}

// ✅ 使用稳定的唯一标识符
{items.map(item => (
  <ListItem key={item.id} item={item} />
))}
```

### 3. 内存泄漏防护

```jsx
function SafeComponent() {
  useEffect(() => {
    const timer = setInterval(() => {
      // 定时器逻辑
    }, 1000);

    const handleResize = () => {
      // 窗口大小变化处理
    };
    window.addEventListener('resize', handleResize);

    // ✅ 清理函数
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div>组件内容</div>;
}
```

### 4. 批量更新优化

```jsx
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
```

## 📈 性能检查工具

### 1. 运行性能检查

```bash
# 运行性能检查脚本
npm run performance-check

# 分析包大小
npm run bundle-analyze

# 运行 Lighthouse 测试
npm run lighthouse
```

### 2. 性能检查报告

性能检查脚本会生成详细的报告，包括：

- 发现的问题数量和类型
- 具体的文件位置和行号
- 优化建议和最佳实践
- 优先级排序

### 3. 持续监控

建议在开发过程中定期运行性能检查，确保代码质量：

```bash
# 在 CI/CD 中集成
npm run performance-check

# 在提交前检查
npm run pre-commit
```

## 🎯 总结

通过实施这些优化措施，可以显著提升 React 应用的性能：

1. **组件优化**: 减少不必要的重渲染
2. **状态管理**: 优化状态更新和缓存
3. **渲染优化**: 使用虚拟滚动和懒加载
4. **资源优化**: 图片懒加载和预加载
5. **网络优化**: API 缓存和批量请求
6. **构建优化**: 代码分割和 Tree Shaking
7. **性能监控**: 实时监控和优化

记住，性能优化是一个持续的过程，需要根据实际使用情况不断调整和优化。