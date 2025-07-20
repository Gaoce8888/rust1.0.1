# 前端组件库

这是一个为客服系统专门设计的 React 组件库，基于 HeroUI、TailwindCSS 和 Framer Motion 构建。

## 📁 目录结构

```
src/components/
├── UI/                    # 基础UI组件
│   ├── Button.jsx        # 按钮组件
│   ├── Input.jsx         # 输入框组件
│   ├── Modal.jsx         # 模态框组件
│   ├── Card.jsx          # 卡片组件
│   ├── Toast.jsx         # 通知组件
│   ├── Loading.jsx       # 加载组件
│   ├── Avatar.jsx        # 头像组件
│   ├── Badge.jsx         # 徽章组件
│   └── index.js          # 统一导出
├── ChatMessage.jsx       # 聊天消息组件
├── CustomerCard.jsx      # 客户卡片组件
├── ChatInput.jsx         # 聊天输入组件
├── ComponentDemo.jsx     # 组件演示
└── README.md            # 本文档
```

## 🎯 核心特性

- **🎨 现代设计**: 基于 TailwindCSS 的美观界面
- **🧩 模块化**: 可独立使用的组件，支持按需导入
- **⚡ 高性能**: 优化的组件实现，支持懒加载
- **📱 响应式**: 适配不同屏幕尺寸
- **🎭 动画**: 基于 Framer Motion 的流畅动画
- **♿ 可访问性**: 遵循 WCAG 标准
- **🔧 可定制**: 丰富的配置选项和主题支持

## 🚀 快速开始

### 安装依赖

```bash
npm install @heroui/react clsx framer-motion tailwind-merge
```

### 基本使用

```jsx
import { Button, Card, Avatar } from './components/UI';

function App() {
  return (
    <Card title="欢迎">
      <div className="flex items-center gap-3">
        <Avatar name="用户" status="online" />
        <Button variant="primary">开始聊天</Button>
      </div>
    </Card>
  );
}
```

## 📚 组件介绍

### 基础UI组件

#### Button 按钮组件
支持多种样式变体和状态的按钮组件。

```jsx
<Button variant="primary" size="medium" isLoading>
  提交
</Button>
```

**主要属性:**
- `variant`: 样式变体 (primary, secondary, success, danger, warning, outline, ghost)
- `size`: 尺寸 (small, medium, large)
- `isLoading`: 加载状态
- `isDisabled`: 禁用状态
- `leftIcon/rightIcon`: 左右图标

#### Input 输入框组件
功能完整的输入框组件，支持验证和多种状态。

```jsx
<Input
  label="邮箱"
  type="email"
  error={errors.email}
  leftIcon={<MailIcon />}
/>
```

#### Modal 模态框组件
灵活的模态框组件，支持自定义内容和操作。

```jsx
<Modal
  isOpen={isOpen}
  title="确认删除"
  onConfirm={handleDelete}
  onCancel={handleCancel}
>
  确定要删除这条记录吗？
</Modal>
```

#### Card 卡片组件
通用卡片容器，支持头部、内容和底部区域。

```jsx
<Card
  title="用户信息"
  subtitle="个人资料"
  hoverable
  footer={<Button>编辑</Button>}
>
  卡片内容
</Card>
```

#### Toast 通知组件
消息通知组件，支持多种类型和位置。

```jsx
<Toast
  message="操作成功！"
  type="success"
  position="top-right"
  onClose={handleClose}
/>
```

#### Loading 加载组件
多样式的加载指示器。

```jsx
<Loading size="large" text="加载中..." type="spinner" />
```

#### Avatar 头像组件
头像显示组件，支持图片、姓名缩写和状态指示。

```jsx
<Avatar
  src="/avatar.jpg"
  name="用户名"
  status="online"
  size="medium"
/>
```

#### Badge 徽章组件
数字和状态徽章组件。

```jsx
<Badge content={5} color="danger">
  <Button>消息</Button>
</Badge>
```

### 业务组件

#### ChatMessage 聊天消息组件
专为聊天场景设计的消息显示组件。

```jsx
<ChatMessage
  message={messageData}
  isOwn={false}
  onQuote={handleQuote}
  onResend={handleResend}
/>
```

**支持的消息类型:**
- 文本消息
- 图片消息
- 文件消息
- 引用消息
- 系统消息

#### CustomerCard 客户卡片组件
客户信息展示卡片。

```jsx
<CustomerCard
  customer={customerData}
  isSelected={selectedId === customer.id}
  onMessage={handleMessage}
  onCall={handleCall}
/>
```

#### ChatInput 聊天输入组件
功能丰富的聊天输入框。

```jsx
<ChatInput
  value={message}
  onChange={setMessage}
  onSend={handleSend}
  onFileUpload={handleFileUpload}
  showEmoji
  showFile
/>
```

**特性:**
- 自动高度调整
- 表情选择器
- 文件上传
- 字数统计
- 快捷键支持 (Enter发送，Shift+Enter换行)

## 🎨 主题定制

组件基于 TailwindCSS 构建，支持通过 CSS 变量进行主题定制：

```css
:root {
  --color-primary: #3b82f6;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
}
```

## 📱 响应式设计

所有组件都采用响应式设计，适配不同屏幕尺寸：

- 移动端: < 768px
- 平板端: 768px - 1024px  
- 桌面端: > 1024px

## 🔧 开发工具

### 组件演示
运行 `ComponentDemo.jsx` 查看所有组件的使用示例：

```jsx
import ComponentDemo from './components/ComponentDemo';

function App() {
  return <ComponentDemo />;
}
```

### TypeScript 支持
虽然当前使用 JSX，但组件设计考虑了 TypeScript 兼容性，可以轻松迁移。

## 📈 性能优化

- **按需加载**: 支持 tree-shaking
- **memorization**: 关键组件使用 React.memo
- **虚拟滚动**: 长列表组件支持虚拟滚动
- **图片懒加载**: Avatar 组件支持图片懒加载

## 🐛 故障排除

### 常见问题

1. **样式不生效**
   - 确保正确导入了 TailwindCSS
   - 检查 tailwind.config.js 配置

2. **动画不流畅**
   - 确保安装了 framer-motion
   - 检查 GPU 加速设置

3. **组件导入失败**
   - 检查导入路径是否正确
   - 确保所有依赖都已安装

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 支持

如有问题，请提交 Issue 或联系开发团队。