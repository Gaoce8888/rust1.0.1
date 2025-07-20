import React, { useState } from 'react'
import { z } from 'zod'
import { 
  Button, 
  Input, 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  Table,
  Form,
  FormItem,
  FormField,
  FormActions,
  FormSection,
  formatCurrency,
  formatDate
} from '../index'
import { SearchIcon, UserIcon, MailIcon, PhoneIcon } from 'lucide-react'

// 表单验证模式
const userFormSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  company: z.string().min(1, '请输入公司名称'),
  position: z.string().min(1, '请输入职位'),
})

type UserFormData = z.infer<typeof userFormSchema>

// 表格数据
const tableData = [
  {
    id: '1',
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '13800138001',
    company: '科技有限公司',
    position: '前端工程师',
    salary: 15000,
    joinDate: '2023-01-15',
  },
  {
    id: '2',
    name: '李四',
    email: 'lisi@example.com',
    phone: '13800138002',
    company: '互联网公司',
    position: '产品经理',
    salary: 20000,
    joinDate: '2023-03-20',
  },
  {
    id: '3',
    name: '王五',
    email: 'wangwu@example.com',
    phone: '13800138003',
    company: '软件公司',
    position: '后端工程师',
    salary: 18000,
    joinDate: '2023-02-10',
  },
]

const tableColumns = [
  {
    key: 'name',
    title: '姓名',
    dataIndex: 'name' as const,
    sortable: true,
  },
  {
    key: 'email',
    title: '邮箱',
    dataIndex: 'email' as const,
  },
  {
    key: 'phone',
    title: '手机号',
    dataIndex: 'phone' as const,
  },
  {
    key: 'company',
    title: '公司',
    dataIndex: 'company' as const,
    sortable: true,
  },
  {
    key: 'position',
    title: '职位',
    dataIndex: 'position' as const,
  },
  {
    key: 'salary',
    title: '薪资',
    dataIndex: 'salary' as const,
    sortable: true,
    render: (value: number) => formatCurrency(value),
  },
  {
    key: 'joinDate',
    title: '入职日期',
    dataIndex: 'joinDate' as const,
    sortable: true,
    render: (value: string) => formatDate(value),
  },
]

export function App() {
  const [loading, setLoading] = useState(false)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [sortInfo, setSortInfo] = useState<{ key: string; order: 'ascend' | 'descend' | null } | null>(null)

  const handleFormSubmit = async (data: UserFormData) => {
    setLoading(true)
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('表单数据:', data)
    setLoading(false)
  }

  const handleFormError = (errors: any) => {
    console.log('表单错误:', errors)
  }

  const handleTableSort = (sortInfo: { key: string; order: 'ascend' | 'descend' | null }) => {
    setSortInfo(sortInfo)
    console.log('排序信息:', sortInfo)
  }

  const handleRowSelect = (selectedRows: string[]) => {
    setSelectedRows(selectedRows)
    console.log('选中的行:', selectedRows)
  }

  return (
    <div className="min-h-screen bg-secondary-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            企业级React组件库
          </h1>
          <p className="text-lg text-secondary-600">
            现代化、可扩展、企业生产级别的React组件库
          </p>
        </div>

        {/* 按钮组件展示 */}
        <Card>
          <CardHeader title="按钮组件" subtitle="支持多种变体、尺寸和状态" />
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button>默认按钮</Button>
                <Button variant="secondary">次要按钮</Button>
                <Button variant="outline">轮廓按钮</Button>
                <Button variant="ghost">幽灵按钮</Button>
                <Button variant="link">链接按钮</Button>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button size="xs">小按钮</Button>
                <Button size="sm">小按钮</Button>
                <Button size="md">中按钮</Button>
                <Button size="lg">大按钮</Button>
                <Button size="xl">超大按钮</Button>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button variant="success">成功按钮</Button>
                <Button variant="warning">警告按钮</Button>
                <Button variant="error">错误按钮</Button>
                <Button loading>加载按钮</Button>
                <Button disabled>禁用按钮</Button>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button leftIcon={<SearchIcon className="h-4 w-4" />}>
                  带图标按钮
                </Button>
                <Button fullWidth>全宽按钮</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 输入框组件展示 */}
        <Card>
          <CardHeader title="输入框组件" subtitle="支持多种类型、状态和图标" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="用户名"
                placeholder="请输入用户名"
                leftIcon={<UserIcon className="h-4 w-4" />}
                required
              />
              
              <Input
                type="email"
                label="邮箱地址"
                placeholder="请输入邮箱地址"
                leftIcon={<MailIcon className="h-4 w-4" />}
                required
              />
              
              <Input
                type="tel"
                label="手机号码"
                placeholder="请输入手机号码"
                leftIcon={<PhoneIcon className="h-4 w-4" />}
                required
              />
              
              <Input
                type="search"
                label="搜索"
                placeholder="请输入搜索关键词"
                leftIcon={<SearchIcon className="h-4 w-4" />}
              />
              
              <Input
                label="成功状态"
                value="输入成功"
                success
                helperText="输入格式正确"
              />
              
              <Input
                label="错误状态"
                value="输入错误"
                error
                helperText="请输入正确的格式"
              />
            </div>
          </CardContent>
        </Card>

        {/* 表单组件展示 */}
        <Card>
          <CardHeader title="表单组件" subtitle="支持表单验证和复杂布局" />
          <CardContent>
            <Form
              schema={userFormSchema}
              onSubmit={handleFormSubmit}
              onError={handleFormError}
              loading={loading}
              layout="horizontal"
              labelWidth="120px"
            >
              <FormSection
                title="基本信息"
                description="请填写用户的基本信息"
              >
                <FormItem name="name" label="姓名" required>
                  <FormField name="name">
                    <Input placeholder="请输入姓名" />
                  </FormField>
                </FormItem>
                
                <FormItem name="email" label="邮箱" required>
                  <FormField name="email">
                    <Input type="email" placeholder="请输入邮箱地址" />
                  </FormField>
                </FormItem>
                
                <FormItem name="phone" label="手机号" required>
                  <FormField name="phone">
                    <Input type="tel" placeholder="请输入手机号码" />
                  </FormField>
                </FormItem>
              </FormSection>
              
              <FormSection
                title="工作信息"
                description="请填写用户的工作相关信息"
              >
                <FormItem name="company" label="公司" required>
                  <FormField name="company">
                    <Input placeholder="请输入公司名称" />
                  </FormField>
                </FormItem>
                
                <FormItem name="position" label="职位" required>
                  <FormField name="position">
                    <Input placeholder="请输入职位" />
                  </FormField>
                </FormItem>
              </FormSection>
              
              <FormActions
                submitText="提交表单"
                cancelText="取消"
                onCancel={() => console.log('取消')}
              />
            </Form>
          </CardContent>
        </Card>

        {/* 表格组件展示 */}
        <Card>
          <CardHeader 
            title="表格组件" 
            subtitle="支持排序、分页、选择和过滤功能"
            action={
              <div className="text-sm text-secondary-600">
                已选择 {selectedRows.length} 项
              </div>
            }
          />
          <CardContent>
            <Table
              data={tableData}
              columns={tableColumns}
              selectable
              selectedRows={selectedRows}
              onRowSelect={handleRowSelect}
              sortInfo={sortInfo}
              onSort={handleTableSort}
              striped
              hoverable
              pagination={{
                current: 1,
                pageSize: 10,
                total: tableData.length,
              }}
            />
          </CardContent>
        </Card>

        {/* 卡片组件展示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card hoverable>
            <CardHeader title="基础卡片" subtitle="这是一个基础卡片组件" />
            <CardContent>
              <p className="text-secondary-600">
                卡片组件支持多种变体和交互效果，可以用于展示各种内容。
              </p>
            </CardContent>
            <CardFooter action={<Button size="sm">操作</Button>}>
              <span className="text-sm text-secondary-500">2024年1月</span>
            </CardFooter>
          </Card>
          
          <Card variant="elevated" hoverable>
            <CardHeader title="高亮卡片" subtitle="带有阴影效果的卡片" />
            <CardContent>
              <p className="text-secondary-600">
                高亮卡片具有更强的视觉层次，适合重要内容的展示。
              </p>
            </CardContent>
            <CardFooter action={<Button size="sm" variant="primary">主要操作</Button>}>
              <span className="text-sm text-secondary-500">2024年1月</span>
            </CardFooter>
          </Card>
          
          <Card variant="outlined" clickable>
            <CardHeader title="可点击卡片" subtitle="支持点击交互的卡片" />
            <CardContent>
              <p className="text-secondary-600">
                可点击卡片具有交互反馈，适合作为导航或链接使用。
              </p>
            </CardContent>
            <CardFooter action={<Button size="sm" variant="outline">查看详情</Button>}>
              <span className="text-sm text-secondary-500">2024年1月</span>
            </CardFooter>
          </Card>
        </div>

        {/* 工具函数展示 */}
        <Card>
          <CardHeader title="工具函数" subtitle="常用的工具函数展示" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">货币格式化</h4>
                <p className="text-sm text-secondary-600">
                  {formatCurrency(1234567.89)} - 人民币
                </p>
                <p className="text-sm text-secondary-600">
                  {formatCurrency(1234567.89, 'USD', 'en-US')} - 美元
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">日期格式化</h4>
                <p className="text-sm text-secondary-600">
                  {formatDate(new Date())} - 默认格式
                </p>
                <p className="text-sm text-secondary-600">
                  {formatDate(new Date(), { year: 'numeric', month: 'short', day: 'numeric' })} - 短格式
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}