# UI 组件库

这是一个基于 React 和 Tailwind CSS 的可复用 UI 组件库，提供了常用的前端组件。

## 安装和使用

### 导入组件

```jsx
// 导入单个组件
import Button from './components/ui/Button';
import Input from './components/ui/Input';

// 或者批量导入
import { Button, Input, Card, Modal, Dropdown, Table, Loading } from './components/ui';
```

## 组件列表

### 1. Button 组件

一个功能丰富的按钮组件，支持多种样式和状态。

#### 属性

- `variant`: 按钮样式变体
  - `primary` (默认): 主要按钮
  - `secondary`: 次要按钮
  - `success`: 成功按钮
  - `danger`: 危险按钮
  - `warning`: 警告按钮
  - `outline`: 轮廓按钮
  - `ghost`: 幽灵按钮

- `size`: 按钮大小
  - `small`: 小按钮
  - `medium` (默认): 中按钮
  - `large`: 大按钮

- `disabled`: 是否禁用
- `loading`: 是否显示加载状态
- `fullWidth`: 是否占满宽度
- `onClick`: 点击事件处理函数

#### 使用示例

```jsx
<Button variant="primary" onClick={() => console.log('clicked')}>
  点击我
</Button>

<Button variant="success" loading>
  保存中...
</Button>

<Button variant="outline" disabled>
  禁用按钮
</Button>
```

### 2. Input 组件

一个支持多种输入类型和验证的输入框组件。

#### 属性

- `type`: 输入类型 (text, email, password, number 等)
- `label`: 标签文本
- `placeholder`: 占位符文本
- `value`: 输入值
- `onChange`: 值变化处理函数
- `error`: 错误信息
- `disabled`: 是否禁用
- `required`: 是否必填
- `fullWidth`: 是否占满宽度
- `size`: 输入框大小 (small, medium, large)

#### 使用示例

```jsx
<Input
  label="用户名"
  placeholder="请输入用户名"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  required
/>

<Input
  type="email"
  label="邮箱"
  error="请输入有效的邮箱地址"
  fullWidth
/>
```

### 3. Card 组件

一个灵活的卡片容器组件。

#### 属性

- `title`: 卡片标题
- `subtitle`: 卡片副标题
- `header`: 自定义头部内容
- `footer`: 自定义底部内容
- `padding`: 内边距大小 (none, small, medium, large)
- `shadow`: 阴影大小 (none, small, medium, large, xl)
- `border`: 是否显示边框

#### 使用示例

```jsx
<Card title="用户信息" subtitle="显示用户的基本信息">
  <p>这里是卡片内容</p>
</Card>

<Card
  header={<h3>自定义头部</h3>}
  footer={<Button>操作按钮</Button>}
  shadow="large"
>
  卡片内容
</Card>
```

### 4. Modal 组件

一个功能完整的模态框组件。

#### 属性

- `isOpen`: 是否显示模态框
- `onClose`: 关闭处理函数
- `title`: 模态框标题
- `size`: 模态框大小 (small, medium, large, xl, full)
- `closeOnOverlayClick`: 点击遮罩层是否关闭
- `showCloseButton`: 是否显示关闭按钮
- `footer`: 底部操作区域

#### 使用示例

```jsx
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="确认操作"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        取消
      </Button>
      <Button onClick={handleConfirm}>
        确认
      </Button>
    </>
  }
>
  <p>确定要执行此操作吗？</p>
</Modal>
```

### 5. Dropdown 组件

一个支持搜索功能的下拉选择组件。

#### 属性

- `options`: 选项数组，格式为 `[{value, label}]`
- `value`: 当前选中的值
- `onChange`: 选择变化处理函数
- `placeholder`: 占位符文本
- `searchable`: 是否支持搜索
- `disabled`: 是否禁用
- `error`: 错误信息

#### 使用示例

```jsx
const options = [
  { value: 'option1', label: '选项 1' },
  { value: 'option2', label: '选项 2' },
  { value: 'option3', label: '选项 3' },
];

<Dropdown
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  placeholder="请选择..."
  searchable
/>
```

### 6. Table 组件

一个支持排序和分页的表格组件。

#### 属性

- `data`: 表格数据数组
- `columns`: 列配置数组，格式为 `[{key, label, render?}]`
- `sortable`: 是否支持排序
- `pagination`: 是否支持分页
- `pageSize`: 每页显示条数
- `onRowClick`: 行点击处理函数

#### 使用示例

```jsx
const data = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' },
];

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '姓名' },
  { key: 'email', label: '邮箱' },
  {
    key: 'actions',
    label: '操作',
    render: (_, row) => (
      <Button size="small" onClick={() => handleEdit(row)}>
        编辑
      </Button>
    )
  }
];

<Table
  data={data}
  columns={columns}
  sortable
  pagination
  pageSize={10}
  onRowClick={(row) => console.log('点击行:', row)}
/>
```

### 7. Loading 组件

一个支持多种加载动画的组件。

#### 属性

- `type`: 加载动画类型
  - `spinner` (默认): 旋转动画
  - `dots`: 点状动画
  - `pulse`: 脉冲动画
  - `ring`: 环形动画
- `size`: 加载器大小 (small, medium, large)
- `text`: 加载文本
- `fullScreen`: 是否全屏显示

#### 使用示例

```jsx
<Loading type="spinner" text="加载中..." />

<Loading type="dots" size="large" />

{/* 全屏加载 */}
{isLoading && <Loading fullScreen text="正在处理请求..." />}
```

## 样式定制

所有组件都使用 Tailwind CSS 类名，你可以通过以下方式定制样式：

1. **通过 className 属性添加自定义类名**
```jsx
<Button className="bg-purple-600 hover:bg-purple-700">
  自定义按钮
</Button>
```

2. **修改 Tailwind 配置**
在 `tailwind.config.js` 中自定义颜色、间距等。

3. **使用 CSS 变量**
```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #6b7280;
}
```

## 最佳实践

1. **保持一致性**: 在整个应用中使用相同的组件变体和大小
2. **响应式设计**: 使用 Tailwind 的响应式前缀适配不同屏幕
3. **可访问性**: 确保所有交互元素都有适当的 ARIA 属性
4. **性能优化**: 对于大量数据的表格，考虑使用虚拟滚动
5. **错误处理**: 为所有用户输入提供适当的错误反馈

## 示例

查看 `Example.jsx` 文件获取完整的使用示例。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个组件库。