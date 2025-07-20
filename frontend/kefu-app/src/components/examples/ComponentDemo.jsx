import React, { useState } from 'react';
import { 
  Button, 
  Input, 
  Modal, 
  ConfirmModal,
  Card, 
  CardHeader,
  CardBody,
  CardFooter,
  StatCard,
  ProductCard,
  Table,
  Pagination
} from '../ui';
import {
  Layout,
  Header,
  Sidebar,
  MenuItem,
  SubMenu,
  Breadcrumb,
  Content
} from '../layout/Layout';
import {
  ToastProvider,
  ToastInit,
  useToast
} from '../feedback/Toast';
import {
  Form,
  FormItem,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  validators
} from '../forms/Form';

// 组件演示页面
const ComponentDemo = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const toast = useToast();

  // 表格数据
  const tableData = [
    { id: 1, name: '张三', email: 'zhangsan@example.com', role: '管理员', status: '激活' },
    { id: 2, name: '李四', email: 'lisi@example.com', role: '用户', status: '禁用' },
    { id: 3, name: '王五', email: 'wangwu@example.com', role: '用户', status: '激活' },
    { id: 4, name: '赵六', email: 'zhaoliu@example.com', role: '编辑', status: '激活' },
  ];

  const tableColumns = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'name', title: '姓名', sortable: true },
    { key: 'email', title: '邮箱' },
    { key: 'role', title: '角色' },
    { 
      key: 'status', 
      title: '状态',
      render: (status) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          status === '激活' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {status}
        </span>
      )
    },
    {
      key: 'actions',
      title: '操作',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">编辑</Button>
          <Button size="sm" variant="danger">删除</Button>
        </div>
      )
    }
  ];

  // 表单提交处理
  const handleFormSubmit = (values) => {
    console.log('Form submitted:', values);
    toast.success('表单提交成功！');
  };

  // 侧边栏菜单
  const sidebarMenu = (
    <div>
      <MenuItem 
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
        }
        active
      >
        组件演示
      </MenuItem>
      
      <SubMenu
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        title="基础组件"
      >
        <MenuItem>按钮</MenuItem>
        <MenuItem>输入框</MenuItem>
        <MenuItem>卡片</MenuItem>
      </SubMenu>
      
      <SubMenu
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
          </svg>
        }
        title="数据展示"
      >
        <MenuItem>表格</MenuItem>
        <MenuItem>统计卡片</MenuItem>
      </SubMenu>
    </div>
  );

  const breadcrumbItems = [
    { title: '首页', href: '/' },
    { title: '组件库' },
    { title: '演示页面' }
  ];

  return (
    <ToastProvider>
      <ToastInit />
      
      <Layout
        header={
          <Header
            title="企业级组件库"
            subtitle="React + Tailwind CSS"
            logo={
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RC</span>
                </div>
                <span className="font-semibold text-gray-900">React Components</span>
              </div>
            }
            actions={
              <>
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h10v-1a3 3 0 00-3-3H7a3 3 0 00-3 3v1z" />
                  </svg>
                  文档
                </Button>
                <Button>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  创建项目
                </Button>
              </>
            }
            user={
              <div className="flex items-center gap-2">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" 
                  alt="用户头像" 
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium">John Doe</span>
              </div>
            }
          />
        }
        sidebar={
          <Sidebar
            logo={
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">RC</span>
                </div>
                <span className="font-semibold text-gray-900">Components</span>
              </div>
            }
            menu={sidebarMenu}
            footer={
              <div className="text-xs text-gray-500 text-center">
                版本 v1.0.0
              </div>
            }
          />
        }
      >
        <Content
          breadcrumb={<Breadcrumb items={breadcrumbItems} />}
          title="组件演示"
          subtitle="展示所有可用的企业级React组件"
          extra={
            <div className="flex gap-2">
              <Button variant="outline">导出代码</Button>
              <Button onClick={() => toast.info('功能开发中...')}>
                查看源码
              </Button>
            </div>
          }
        >
          <div className="space-y-8">
            {/* 按钮演示 */}
            <Card>
              <CardHeader title="按钮组件" subtitle="支持多种变体、尺寸和状态的按钮" />
              <CardBody>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">主要按钮</Button>
                    <Button variant="secondary">次要按钮</Button>
                    <Button variant="success">成功按钮</Button>
                    <Button variant="warning">警告按钮</Button>
                    <Button variant="danger">危险按钮</Button>
                    <Button variant="outline">边框按钮</Button>
                    <Button variant="ghost">幽灵按钮</Button>
                    <Button variant="link">链接按钮</Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button size="xs">超小按钮</Button>
                    <Button size="sm">小按钮</Button>
                    <Button size="md">中等按钮</Button>
                    <Button size="lg">大按钮</Button>
                    <Button size="xl">超大按钮</Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button loading>加载中</Button>
                    <Button disabled>禁用状态</Button>
                    <Button 
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      }
                    >
                      带图标
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 输入框演示 */}
            <Card>
              <CardHeader title="输入框组件" subtitle="支持验证、状态提示和各种装饰器" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="基础输入框"
                    placeholder="请输入内容"
                  />
                  <Input 
                    label="带错误状态"
                    placeholder="请输入内容"
                    status="error"
                    errorMessage="这是一个错误信息"
                  />
                  <Input 
                    label="带成功状态"
                    placeholder="请输入内容"
                    status="success"
                    successMessage="验证通过"
                  />
                  <Input 
                    label="密码输入"
                    type="password"
                    placeholder="请输入密码"
                    showPasswordToggle
                  />
                  <Input 
                    label="可清除输入"
                    placeholder="可清除的输入框"
                    clearable
                  />
                  <Input 
                    label="带图标"
                    placeholder="搜索内容"
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    }
                  />
                </div>
              </CardBody>
            </Card>

            {/* 卡片演示 */}
            <Card>
              <CardHeader title="卡片组件" subtitle="灵活的内容容器，支持多种样式和交互" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card hoverable>
                    <CardHeader title="基础卡片" />
                    <CardBody>
                      <p>这是一个基础的卡片内容，支持悬停效果。</p>
                    </CardBody>
                    <CardFooter>
                      <Button size="sm">查看详情</Button>
                    </CardFooter>
                  </Card>

                  <StatCard
                    title="总用户数"
                    value="1,234"
                    subtitle="较上月"
                    trend="+12%"
                    trendType="up"
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    }
                  />

                  <ProductCard
                    image="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop"
                    title="示例产品"
                    description="这是一个示例产品的描述信息"
                    price="999"
                    originalPrice="1299"
                    discount="23"
                    rating={4}
                    reviewCount="128"
                    badge="热销"
                    onAddToCart={() => toast.success('已添加到购物车')}
                    onViewDetails={() => toast.info('查看产品详情')}
                  />
                </div>
              </CardBody>
            </Card>

            {/* 表格演示 */}
            <Card>
              <CardHeader title="表格组件" subtitle="功能完整的数据表格，支持排序、分页和选择" />
              <CardBody>
                <Table
                  columns={tableColumns}
                  data={tableData}
                  sortable
                  selectable
                  onRowSelect={(selectedRows) => {
                    console.log('Selected rows:', selectedRows);
                  }}
                  pagination={
                    <Pagination
                      current={currentPage}
                      total={100}
                      pageSize={10}
                      showSizeChanger
                      showQuickJumper
                      onChange={(page, pageSize) => {
                        setCurrentPage(page);
                        console.log('Page changed:', { page, pageSize });
                      }}
                    />
                  }
                />
              </CardBody>
            </Card>

            {/* 表单演示 */}
            <Card>
              <CardHeader title="表单组件" subtitle="完整的表单解决方案，支持验证和复杂布局" />
              <CardBody>
                <Form
                  onSubmit={handleFormSubmit}
                  initialValues={{
                    email: '',
                    password: '',
                    confirmPassword: '',
                    role: '',
                    bio: '',
                    subscribe: false
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormItem
                      name="email"
                      label="邮箱地址"
                      required
                      rules={[
                        validators.required,
                        validators.email
                      ]}
                    >
                      <FormInput name="email" type="email" placeholder="请输入邮箱地址" />
                    </FormItem>

                    <FormItem
                      name="password"
                      label="密码"
                      required
                      rules={[
                        validators.required,
                        validators.minLength(6, '密码至少6位')
                      ]}
                    >
                      <FormInput name="password" type="password" placeholder="请输入密码" />
                    </FormItem>

                    <FormItem
                      name="confirmPassword"
                      label="确认密码"
                      required
                      rules={[
                        validators.required,
                        validators.custom((value, values) => {
                          if (value !== values.password) {
                            return '两次密码输入不一致';
                          }
                          return null;
                        })
                      ]}
                    >
                      <FormInput name="confirmPassword" type="password" placeholder="请再次输入密码" />
                    </FormItem>

                    <FormItem
                      name="role"
                      label="角色"
                      required
                      rules={[validators.required]}
                    >
                      <FormSelect
                        name="role"
                        placeholder="请选择角色"
                        options={[
                          { value: 'admin', label: '管理员' },
                          { value: 'user', label: '普通用户' },
                          { value: 'editor', label: '编辑' }
                        ]}
                      />
                    </FormItem>
                  </div>

                  <FormItem
                    name="bio"
                    label="个人简介"
                    help="简单介绍一下你自己"
                  >
                    <FormTextarea name="bio" placeholder="请输入个人简介" />
                  </FormItem>

                  <FormItem name="subscribe">
                    <FormCheckbox name="subscribe">
                      订阅邮件通知
                    </FormCheckbox>
                  </FormItem>

                  <div className="flex gap-3">
                    <Button type="submit">提交表单</Button>
                    <Button type="button" variant="outline">重置</Button>
                  </div>
                </Form>
              </CardBody>
            </Card>

            {/* 模态框演示 */}
            <Card>
              <CardHeader title="模态框组件" subtitle="灵活的对话框解决方案" />
              <CardBody>
                <div className="flex gap-3">
                  <Button onClick={() => setModalOpen(true)}>
                    打开模态框
                  </Button>
                  <Button 
                    variant="warning"
                    onClick={() => setConfirmModalOpen(true)}
                  >
                    确认对话框
                  </Button>
                  <Button onClick={() => toast.success('这是一个成功消息！')}>
                    成功提示
                  </Button>
                  <Button onClick={() => toast.error('这是一个错误消息！')}>
                    错误提示
                  </Button>
                  <Button onClick={() => toast.warning('这是一个警告消息！')}>
                    警告提示
                  </Button>
                  <Button onClick={() => toast.info('这是一个信息提示！')}>
                    信息提示
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </Content>
      </Layout>

      {/* 基础模态框 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="示例模态框"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              确定
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>这是一个示例模态框的内容。你可以在这里放置任何内容。</p>
          <p>模态框支持多种尺寸、动画效果和可访问性功能。</p>
        </div>
      </Modal>

      {/* 确认对话框 */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          toast.success('操作已确认！');
        }}
        title="确认删除"
        content="你确定要删除这个项目吗？此操作不可撤销。"
        type="danger"
        confirmText="删除"
        cancelText="取消"
      />
    </ToastProvider>
  );
};

export default ComponentDemo;