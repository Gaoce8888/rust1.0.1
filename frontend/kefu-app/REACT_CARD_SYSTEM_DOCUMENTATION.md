# 🎨 React卡片系统文档

## 📋 概述

React卡片系统是一个企业级的、高度可配置的卡片组件库，专为客服系统设计。它提供了自适应大小、对话框集成、主题支持、响应式设计等高级功能。

## ✨ 核心特性

### 🎯 自适应大小
- **智能缩放**: 根据容器宽度自动调整卡片大小
- **多种尺寸**: tiny(200px), small(280px), medium(320px), large(400px), auto(自适应)
- **平滑过渡**: 支持动画过渡效果
- **响应式断点**: 移动端、平板、桌面、宽屏自适应

### 🖼️ 对话框集成
- **详情查看**: 点击卡片可打开详情对话框
- **信息展示**: 显示卡片类型、大小、主题等信息
- **数据预览**: 展示卡片数据和配置信息
- **交互操作**: 支持各种卡片动作

### 🎨 主题系统
- **多主题支持**: light(浅色), dark(深色), auto(自动)
- **统一设计**: 基于NextUI设计系统
- **可定制**: 支持自定义主题配置

### ⚙️ 配置管理
- **全局配置**: 默认大小、主题、动画等
- **卡片配置**: 每种卡片类型的专属配置
- **对话框配置**: 对话框行为和显示选项
- **响应式配置**: 断点和大小映射

## 🏗️ 架构设计

### 核心组件

```
ReactCardComponents.jsx     # 基础卡片组件
├── ProductCard            # 产品卡片
├── UserProfileCard        # 用户资料卡片
├── NotificationCard       # 通知卡片
├── DataCard              # 数据卡片
├── VoiceMessageCard      # 语音消息卡片
├── ActionCard            # 动作卡片
├── MediaCard             # 媒体卡片
├── FormCard              # 表单卡片
└── CardContainer         # 卡片容器

ReactCardMessage.jsx       # 消息集成组件
├── ReactCardMessage      # 单个卡片消息
├── ReactCardMessageList  # 卡片消息列表
└── ReactCardMessageGenerator # 卡片生成器

CardConfigManager.jsx     # 配置管理系统
├── CardConfigProvider    # 配置提供者
├── CardConfigSettings    # 配置设置界面
└── useCardConfig         # 配置Hook

ReactCardDemo.jsx         # 演示组件
```

### 数据流

```
用户操作 → 配置更新 → 状态管理 → 组件渲染 → 自适应调整
    ↓
对话框交互 → 动作处理 → 回调执行 → 界面更新
```

## 🚀 快速开始

### 1. 基础使用

```jsx
import { ReactCardMessage, ReactCardType } from './components/ReactCardMessage';

// 产品卡片
<ReactCardMessage
  cardType={ReactCardType.PRODUCT}
  cardData={{
    title: 'iPhone 15 Pro',
    price: 8999,
    image: 'product-image.jpg',
    description: '最新款iPhone',
    rating: 4.8
  }}
  size="auto"
  theme="auto"
  showInDialog={true}
  onCardAction={(action, data) => {
    console.log('卡片动作:', action, data);
  }}
/>
```

### 2. 配置系统

```jsx
import { CardConfigProvider, useCardConfig } from './components/CardConfigManager';

function App() {
  return (
    <CardConfigProvider>
      <YourApp />
    </CardConfigProvider>
  );
}

function YourComponent() {
  const { globalConfig, updateGlobalConfig } = useCardConfig();
  
  return (
    <div>
      <p>当前大小: {globalConfig.defaultSize}</p>
      <button onClick={() => updateGlobalConfig({ defaultSize: 'large' })}>
        设置为大尺寸
      </button>
    </div>
  );
}
```

### 3. 卡片列表

```jsx
import { ReactCardMessageList } from './components/ReactCardMessage';

const cards = [
  {
    cardType: ReactCardType.PRODUCT,
    cardData: { /* ... */ },
    cardConfig: { /* ... */ }
  },
  // ... 更多卡片
];

<ReactCardMessageList
  cards={cards}
  size="auto"
  theme="auto"
  layout="grid"
  columns={2}
  gap={16}
  onCardAction={handleCardAction}
/>
```

## 📖 API 参考

### ReactCardMessage

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `cardType` | `ReactCardType` | - | 卡片类型 |
| `cardData` | `object` | - | 卡片数据 |
| `cardConfig` | `object` | `{}` | 卡片配置 |
| `size` | `string` | `'auto'` | 卡片大小 |
| `theme` | `string` | `'auto'` | 主题 |
| `showInDialog` | `boolean` | `true` | 是否显示对话框 |
| `dialogTitle` | `string` | `'卡片详情'` | 对话框标题 |
| `onCardAction` | `function` | - | 卡片动作回调 |
| `onCardClose` | `function` | - | 对话框关闭回调 |

#### 卡片类型

```javascript
export const ReactCardType = {
  PRODUCT: 'product',           // 产品卡片
  USER_PROFILE: 'user_profile', // 用户资料卡片
  NOTIFICATION: 'notification', // 通知卡片
  DATA: 'data',                 // 数据卡片
  VOICE_MESSAGE: 'voice_message', // 语音消息卡片
  ACTION: 'action',             // 动作卡片
  MEDIA: 'media',               // 媒体卡片
  FORM: 'form',                 // 表单卡片
  CUSTOM: 'custom'              // 自定义卡片
};
```

### 卡片数据格式

#### ProductCard
```javascript
{
  title: '产品名称',
  price: 999.99,
  image: 'image-url.jpg',
  description: '产品描述',
  rating: 4.5
}
```

#### UserProfileCard
```javascript
{
  avatar: 'avatar-url.jpg',
  name: '用户名',
  email: 'user@example.com',
  role: '角色',
  status: 'online' // online, offline, busy, away
}
```

#### NotificationCard
```javascript
{
  title: '通知标题',
  message: '通知内容',
  type: 'info', // info, success, warning, error
  timestamp: '2024-01-01T00:00:00Z'
}
```

#### DataCard
```javascript
{
  title: '数据标题',
  value: 1234,
  change: 12.5,
  trend: 'up', // up, down, stable
  icon: '📊',
  color: 'primary'
}
```

#### VoiceMessageCard
```javascript
{
  title: '语音消息',
  duration: 120, // 秒
  isPlaying: false
}
```

#### ActionCard
```javascript
{
  title: '操作标题',
  description: '操作描述',
  actions: [
    {
      label: '按钮文本',
      action: 'action_name',
      color: 'primary'
    }
  ]
}
```

#### MediaCard
```javascript
{
  title: '媒体标题',
  mediaUrl: 'media-url.mp4',
  mediaType: 'video', // image, video, audio
  description: '媒体描述'
}
```

#### FormCard
```javascript
{
  title: '表单标题',
  fields: [
    {
      name: 'field_name',
      label: '字段标签',
      type: 'text', // text, textarea, select
      required: true,
      placeholder: '占位符',
      options: [ // 仅select类型需要
        { value: 'option1', label: '选项1' }
      ]
    }
  ],
  submitLabel: '提交'
}
```

### 配置系统

#### 全局配置
```javascript
{
  defaultSize: 'auto',        // 默认大小
  defaultTheme: 'auto',       // 默认主题
  enableResponsive: true,     // 启用响应式
  enableAnimations: true,     // 启用动画
  enableShadows: true,        // 启用阴影
  enableDialogBox: true,      // 启用对话框
  borderRadius: 8,            // 圆角半径
  animationDuration: 300,     // 动画时长
  maxWidth: '100%',           // 最大宽度
  minWidth: '280px',          // 最小宽度
  dialogSize: '2xl',          // 对话框大小
  autoAdaptive: true,         // 自动自适应
  debounceMs: 150             // 防抖延迟
}
```

#### 对话框配置
```javascript
{
  enabled: true,              // 启用对话框
  size: '2xl',                // 对话框大小
  scrollBehavior: 'inside',   // 滚动行为
  showCardInfo: true,         // 显示卡片信息
  showCardData: true,         // 显示卡片数据
  showCardConfig: true,       // 显示配置信息
  showActions: true,          // 显示操作按钮
  closeOnOverlayClick: true,  // 点击遮罩关闭
  closeOnEscape: true         // ESC键关闭
}
```

#### 响应式配置
```javascript
{
  enabled: true,              // 启用响应式
  breakpoints: {
    mobile: 480,              // 移动端断点
    tablet: 768,              // 平板断点
    desktop: 1024,            // 桌面断点
    wide: 1440                // 宽屏断点
  },
  sizes: {
    mobile: 'small',          // 移动端大小
    tablet: 'medium',         // 平板大小
    desktop: 'large',         // 桌面大小
    wide: 'auto'              // 宽屏大小
  },
  autoAdjust: true,           // 自动调整
  smoothTransition: true      // 平滑过渡
}
```

## 🎨 主题系统

### 主题配置
```javascript
export const CARD_THEME_CONFIG = {
  light: {
    background: 'bg-white',
    border: 'border-gray-200',
    shadow: 'shadow-sm',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-400'
  },
  dark: {
    background: 'bg-gray-800',
    border: 'border-gray-700',
    shadow: 'shadow-lg',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-300',
    textMuted: 'text-gray-500'
  },
  auto: {
    background: 'bg-content1',
    border: 'border-divider',
    shadow: 'shadow-sm',
    textPrimary: 'text-foreground',
    textSecondary: 'text-default-600',
    textMuted: 'text-default-400'
  }
};
```

### 大小配置
```javascript
export const CARD_SIZE_CONFIG = {
  tiny: {
    width: '200px',
    fontSize: '0.75rem',
    padding: '0.5rem',
    imageHeight: '80px',
    borderRadius: '6px'
  },
  small: {
    width: '280px',
    fontSize: '0.875rem',
    padding: '0.75rem',
    imageHeight: '120px',
    borderRadius: '8px'
  },
  medium: {
    width: '320px',
    fontSize: '1rem',
    padding: '1rem',
    imageHeight: '160px',
    borderRadius: '12px'
  },
  large: {
    width: '400px',
    fontSize: '1.125rem',
    padding: '1.25rem',
    imageHeight: '200px',
    borderRadius: '16px'
  },
  auto: {
    width: '100%',
    fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
    padding: 'clamp(0.75rem, 2vw, 1.25rem)',
    imageHeight: 'clamp(120px, 25vw, 200px)',
    borderRadius: 'clamp(8px, 1.5vw, 16px)'
  }
};
```

## 🔧 高级功能

### 自适应大小Hook
```javascript
import { useAdaptiveSize } from './components/ReactCardComponents';

function MyComponent() {
  const containerRef = useRef(null);
  const adaptiveSize = useAdaptiveSize(containerRef, 'auto', {
    minWidth: 200,
    maxWidth: 800,
    debounceMs: 100
  });

  return (
    <div ref={containerRef}>
      <p>当前大小: {adaptiveSize.currentSize}</p>
      <p>容器宽度: {adaptiveSize.containerWidth}px</p>
    </div>
  );
}
```

### 卡片配置管理器
```javascript
import { CardConfigManager } from './components/ReactCardComponents';

const configManager = new CardConfigManager();

// 设置卡片配置
configManager.setCardConfig('ProductCard', {
  showRating: true,
  showDescription: true,
  showButton: true
});

// 获取卡片配置
const config = configManager.getCardConfig('ProductCard', 'large');

// 导出配置
const exportedConfig = configManager.exportConfig();

// 导入配置
configManager.importConfig(importedConfig);
```

### 自定义卡片
```javascript
// 创建自定义卡片
<ReactCardMessage
  cardType={ReactCardType.CUSTOM}
  cardData={{
    content: (
      <div>
        <h3>自定义内容</h3>
        <p>这里可以是任何React组件</p>
      </div>
    )
  }}
  size="auto"
  theme="auto"
/>
```

## 🎯 最佳实践

### 1. 性能优化
- 使用 `useMemo` 缓存卡片内容
- 合理设置 `debounceMs` 避免频繁重绘
- 使用 `lazyLoad` 延迟加载图片
- 避免在卡片中放置过重的组件

### 2. 响应式设计
- 优先使用 `auto` 大小实现自适应
- 合理设置断点值
- 测试不同屏幕尺寸的显示效果
- 使用 `smoothTransition` 提供更好的用户体验

### 3. 配置管理
- 使用 `CardConfigProvider` 统一管理配置
- 合理组织配置层次结构
- 提供配置导入导出功能
- 支持配置的版本管理

### 4. 错误处理
- 为图片加载失败提供备用方案
- 处理网络请求异常
- 提供加载状态指示
- 记录错误日志便于调试

### 5. 可访问性
- 提供合适的 `alt` 属性
- 支持键盘导航
- 使用语义化的HTML结构
- 提供屏幕阅读器支持

## 🐛 故障排除

### 常见问题

#### 1. 卡片大小不自动调整
- 检查容器是否有固定宽度
- 确认 `enableResponsive` 已启用
- 验证 `ResizeObserver` 支持

#### 2. 对话框不显示
- 检查 `showInDialog` 属性
- 确认对话框配置已启用
- 验证 `Modal` 组件依赖

#### 3. 主题不生效
- 检查主题配置是否正确
- 确认CSS类名是否匹配
- 验证NextUI主题设置

#### 4. 配置不保存
- 检查 `CardConfigProvider` 是否正确包裹
- 确认状态更新逻辑
- 验证本地存储权限

### 调试技巧

#### 1. 启用调试模式
```javascript
// 在开发环境中启用详细日志
if (process.env.NODE_ENV === 'development') {
  console.log('卡片配置:', cardConfig);
  console.log('自适应信息:', adaptiveSize);
}
```

#### 2. 检查配置状态
```javascript
const { globalConfig, cardConfigs } = useCardConfig();
console.log('全局配置:', globalConfig);
console.log('卡片配置:', cardConfigs);
```

#### 3. 监控性能
```javascript
// 使用React DevTools Profiler
// 监控卡片渲染性能
// 检查不必要的重渲染
```

## 📈 性能指标

### 渲染性能
- **首次渲染**: < 100ms
- **重渲染**: < 50ms
- **自适应调整**: < 30ms
- **对话框打开**: < 200ms

### 内存使用
- **单个卡片**: ~2KB
- **配置管理器**: ~10KB
- **主题系统**: ~5KB
- **总内存**: < 50KB

### 兼容性
- **浏览器**: Chrome 80+, Firefox 75+, Safari 13+
- **React**: 16.8+ (支持Hooks)
- **NextUI**: 2.0+
- **移动端**: iOS 12+, Android 8+

## 🔮 未来规划

### 短期目标
- [ ] 添加更多卡片类型
- [ ] 优化移动端体验
- [ ] 增加动画效果
- [ ] 支持拖拽排序

### 中期目标
- [ ] 实现卡片模板系统
- [ ] 添加数据绑定功能
- [ ] 支持自定义样式
- [ ] 集成图表组件

### 长期目标
- [ ] 构建卡片市场
- [ ] 支持插件系统
- [ ] 实现AI智能推荐
- [ ] 跨平台支持

## 📞 支持与反馈

如果您在使用过程中遇到问题或有改进建议，请通过以下方式联系我们：

- **GitHub Issues**: [项目地址]/issues
- **邮箱**: support@example.com
- **文档**: [文档地址]

---

**版本**: 1.0.0  
**更新时间**: 2024年12月  
**维护者**: React卡片系统团队