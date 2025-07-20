# 企业级React组件库

一个现代化、可扩展、企业生产级别的React组件库，基于TypeScript和Tailwind CSS构建。

## ✨ 特性

- 🎨 **现代化设计** - 基于Tailwind CSS的现代化UI设计
- 📦 **TypeScript支持** - 完整的TypeScript类型定义
- 🚀 **高性能** - 优化的组件性能和包大小
- 🎯 **企业级** - 支持复杂业务场景的组件
- 📱 **响应式** - 完美适配各种屏幕尺寸
- ♿ **无障碍** - 符合WCAG 2.1标准的无障碍支持
- 🧪 **测试覆盖** - 完整的单元测试和集成测试
- 📚 **文档完善** - 详细的API文档和使用示例

## 🚀 快速开始

### 安装

```bash
npm install enterprise-react-components
# 或
yarn add enterprise-react-components
```

### 使用

```tsx
import { Button, Input, Card } from 'enterprise-react-components'
import 'enterprise-react-components/dist/style.css'

function App() {
  return (
    <div>
      <Button variant="primary">点击我</Button>
      <Input placeholder="请输入内容" />
      <Card>
        <CardHeader title="卡片标题" />
        <CardContent>卡片内容</CardContent>
      </Card>
    </div>
  )
}
```

## 📦 组件列表

### 基础组件

- **Button** - 按钮组件，支持多种变体和状态
- **Input** - 输入框组件，支持多种类型和验证
- **Card** - 卡片组件，支持多种布局和交互

### 数据展示

- **Table** - 表格组件，支持排序、分页、选择等功能
- **Form** - 表单组件，支持验证和复杂布局

### 工具函数

- **formatCurrency** - 货币格式化
- **formatDate** - 日期格式化
- **debounce** - 防抖函数
- **throttle** - 节流函数

## 🎨 设计系统

### 颜色系统

```css
/* 主色调 */
--primary-50: #eff6ff;
--primary-500: #3b82f6;
--primary-900: #1e3a8a;

/* 中性色 */
--secondary-50: #f8fafc;
--secondary-500: #64748b;
--secondary-900: #0f172a;

/* 状态色 */
--success-500: #22c55e;
--warning-500: #f59e0b;
--error-500: #ef4444;
```

### 尺寸系统

```css
/* 间距 */
--spacing-xs: 0.5rem;
--spacing-sm: 0.75rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;

/* 圆角 */
--radius-sm: 0.25rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
```

## 🔧 开发

### 环境要求

- Node.js >= 16
- npm >= 8 或 yarn >= 1.22

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 测试

```bash
# 运行测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试UI
npm run test:ui
```

### 代码检查

```bash
# 运行ESLint
npm run lint

# 自动修复ESLint问题
npm run lint:fix

# 类型检查
npm run type-check
```

## 📚 文档

### Button组件

```tsx
import { Button } from 'enterprise-react-components'

// 基础用法
<Button>默认按钮</Button>

// 不同变体
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="outline">轮廓按钮</Button>
<Button variant="ghost">幽灵按钮</Button>

// 不同尺寸
<Button size="xs">小按钮</Button>
<Button size="sm">小按钮</Button>
<Button size="md">中按钮</Button>
<Button size="lg">大按钮</Button>
<Button size="xl">超大按钮</Button>

// 状态
<Button loading>加载中</Button>
<Button disabled>禁用</Button>

// 图标
<Button leftIcon={<SearchIcon />}>搜索</Button>
<Button rightIcon={<ArrowIcon />}>下一步</Button>
```

### Input组件

```tsx
import { Input } from 'enterprise-react-components'

// 基础用法
<Input placeholder="请输入内容" />

// 不同类型
<Input type="email" placeholder="邮箱地址" />
<Input type="password" placeholder="密码" />
<Input type="tel" placeholder="手机号码" />

// 状态
<Input error helperText="输入有误" />
<Input success helperText="输入正确" />

// 图标
<Input leftIcon={<UserIcon />} placeholder="用户名" />
<Input rightIcon={<SearchIcon />} placeholder="搜索" />

// 标签
<Input label="用户名" required />
```

### Table组件

```tsx
import { Table } from 'enterprise-react-components'

const columns = [
  { key: 'name', title: '姓名', sortable: true },
  { key: 'email', title: '邮箱' },
  { key: 'phone', title: '手机号' },
]

const data = [
  { id: '1', name: '张三', email: 'zhangsan@example.com', phone: '13800138001' },
  { id: '2', name: '李四', email: 'lisi@example.com', phone: '13800138002' },
]

<Table
  data={data}
  columns={columns}
  selectable
  sortable
  pagination={{
    current: 1,
    pageSize: 10,
    total: 100,
  }}
/>
```

### Form组件

```tsx
import { Form, FormItem, FormField, Input } from 'enterprise-react-components'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, '姓名至少2个字符'),
  email: z.string().email('请输入有效的邮箱'),
})

<Form schema={schema} onSubmit={handleSubmit}>
  <FormItem name="name" label="姓名" required>
    <FormField name="name">
      <Input placeholder="请输入姓名" />
    </FormField>
  </FormItem>
  
  <FormItem name="email" label="邮箱" required>
    <FormField name="email">
      <Input type="email" placeholder="请输入邮箱" />
    </FormField>
  </FormItem>
</Form>
```

## 🤝 贡献

我们欢迎所有形式的贡献！

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 开发规范

- 遵循 TypeScript 严格模式
- 编写完整的单元测试
- 遵循 ESLint 规则
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [React](https://reactjs.org/) - 用于构建用户界面的JavaScript库
- [TypeScript](https://www.typescriptlang.org/) - JavaScript的超集
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的CSS框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Vitest](https://vitest.dev/) - 单元测试框架
- [React Hook Form](https://react-hook-form.com/) - 表单处理库
- [Zod](https://zod.dev/) - TypeScript优先的模式验证库

## 📞 联系我们

- 邮箱: support@enterprise-components.com
- 问题反馈: [GitHub Issues](https://github.com/your-org/enterprise-react-components/issues)
- 讨论: [GitHub Discussions](https://github.com/your-org/enterprise-react-components/discussions)
