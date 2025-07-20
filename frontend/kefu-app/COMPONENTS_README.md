# 企业级React组件库

一个功能完整、生产就绪的React组件库，基于现代化技术栈构建，适用于企业级应用开发。

## 🚀 技术栈

- **React 18** - 最新版本的React，支持并发特性
- **Tailwind CSS** - 实用优先的CSS框架
- **Vite** - 现代化构建工具
- **Clsx** - 条件类名工具
- **Framer Motion** - 动画库

## 📦 组件目录

### 基础组件 (UI Components)

#### Button 按钮组件
- **路径**: `src/components/ui/Button.jsx`
- **特性**:
  - 8种变体：primary, secondary, success, warning, danger, outline, ghost, link
  - 5种尺寸：xs, sm, md, lg, xl
  - 3种圆角：sm, md, lg, full
  - 支持加载状态、禁用状态
  - 支持图标和全宽模式
  - 完整的无障碍支持

```jsx
import { Button } from './components/ui';

<Button variant="primary" size="lg" loading>
  提交
</Button>
```

#### Input 输入框组件
- **路径**: `src/components/ui/Input.jsx`
- **特性**:
  - 多种输入类型支持
  - 实时验证和状态提示
  - 密码显示切换
  - 可清除输入
  - 左右图标支持
  - 错误、成功、警告状态

```jsx
import { Input } from './components/ui';

<Input
  label="邮箱地址"
  type="email"
  placeholder="请输入邮箱"
  status="error"
  errorMessage="邮箱格式不正确"
  clearable
/>
```

#### Modal 模态框组件
- **路径**: `src/components/ui/Modal.jsx`
- **特性**:
  - 5种尺寸：sm, md, lg, xl, full
  - 键盘导航支持（ESC关闭、Tab焦点陷阱）
  - 遮罩点击关闭
  - 动画效果
  - 确认对话框变体
  - 完整的无障碍支持

```jsx
import { Modal, ConfirmModal } from './components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="标题"
  size="md"
>
  内容
</Modal>
```

#### Card 卡片组件
- **路径**: `src/components/ui/Card.jsx`
- **特性**:
  - 基础卡片组件
  - 统计卡片（StatCard）
  - 产品卡片（ProductCard）
  - 悬停效果和点击交互
  - 多种阴影和边框样式

```jsx
import { Card, CardHeader, CardBody, StatCard } from './components/ui';

<Card hoverable>
  <CardHeader title="标题" subtitle="副标题" />
  <CardBody>内容</CardBody>
</Card>

<StatCard
  title="总用户数"
  value="1,234"
  trend="+12%"
  trendType="up"
  icon={<UserIcon />}
/>
```

#### Table 表格组件
- **路径**: `src/components/ui/Table.jsx`
- **特性**:
  - 排序功能
  - 行选择
  - 分页器
  - 自定义渲染
  - 加载状态
  - 响应式设计

```jsx
import { Table, Pagination } from './components/ui';

<Table
  columns={columns}
  data={data}
  sortable
  selectable
  pagination={<Pagination current={1} total={100} />}
/>
```

### 布局组件 (Layout Components)

#### Layout 主布局
- **路径**: `src/components/layout/Layout.jsx`
- **特性**:
  - 响应式侧边栏
  - 固定头部
  - 移动端优化
  - 侧边栏折叠
  - 面包屑导航

```jsx
import { Layout, Header, Sidebar, Content } from './components/layout/Layout';

<Layout
  header={<Header title="应用名称" />}
  sidebar={<Sidebar menu={menuItems} />}
>
  <Content title="页面标题">
    页面内容
  </Content>
</Layout>
```

### 反馈组件 (Feedback Components)

#### Toast 通知组件
- **路径**: `src/components/feedback/Toast.jsx`
- **特性**:
  - 4种类型：success, error, warning, info
  - 自动消失
  - 手动关闭
  - 操作按钮
  - 位置配置
  - 进度条

```jsx
import { ToastProvider, useToast } from './components/feedback/Toast';

function App() {
  return (
    <ToastProvider>
      <YourApp />
    </ToastProvider>
  );
}

function YourComponent() {
  const toast = useToast();
  
  const handleClick = () => {
    toast.success('操作成功！');
  };
}
```

### 表单组件 (Form Components)

#### Form 表单系统
- **路径**: `src/components/forms/Form.jsx`
- **特性**:
  - 完整的表单验证
  - 实时验证
  - 内置验证规则
  - 表单状态管理
  - 多种表单控件

```jsx
import { Form, FormItem, FormInput, validators } from './components/forms/Form';

<Form onSubmit={handleSubmit}>
  <FormItem
    name="email"
    label="邮箱"
    rules={[validators.required, validators.email]}
  >
    <FormInput name="email" type="email" />
  </FormItem>
  
  <Button type="submit">提交</Button>
</Form>
```

## 🎨 设计系统

### 颜色主题
- **主色**: Blue (#006FEE)
- **成功**: Green (#059669)
- **警告**: Yellow (#d97706)
- **错误**: Red (#dc2626)
- **灰色**: Gray 系列

### 字体大小
- **2xs**: 0.625rem
- **xs**: 0.75rem
- **sm**: 0.875rem
- **base**: 1rem
- **lg**: 1.125rem
- **xl**: 1.25rem

### 间距系统
- **1**: 0.25rem (4px)
- **2**: 0.5rem (8px)
- **3**: 0.75rem (12px)
- **4**: 1rem (16px)
- **6**: 1.5rem (24px)
- **8**: 2rem (32px)

### 圆角
- **sm**: 0.125rem
- **md**: 0.375rem
- **lg**: 0.5rem
- **xl**: 0.75rem

## 🛠️ 开发指南

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建项目
```bash
npm run build
```

## 📱 响应式设计

所有组件都经过精心设计，确保在不同设备上的良好表现：

- **移动端**: < 768px
- **平板端**: 768px - 1024px
- **桌面端**: > 1024px

## ♿ 无障碍支持

组件库严格遵循WCAG 2.1 AA标准：

- 键盘导航支持
- 屏幕阅读器友好
- 适当的ARIA标签
- 颜色对比度符合标准
- 焦点管理

## 🔧 自定义配置

### Tailwind配置
项目使用自定义的Tailwind配置，包含：
- 自定义颜色
- 动画效果
- 响应式断点
- 组件变体

### 主题定制
支持亮色/暗色主题切换，可通过CSS变量进行主题定制。

## 📚 使用示例

查看 `src/components/examples/ComponentDemo.jsx` 文件，其中包含了所有组件的完整使用示例。

## 🧪 测试

建议为每个组件编写测试，确保：
- 渲染正确
- 事件处理正确
- 无障碍功能正常
- 响应式行为正确

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个组件库。

---

**企业级React组件库** - 让前端开发更高效、更标准化。