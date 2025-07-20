import React, { useState } from 'react';
import {
  Button,
  Input,
  Card,
  Modal,
  Dropdown,
  Table,
  Loading
} from './index';

const Example = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // 表格数据示例
  const tableData = [
    { id: 1, name: '张三', email: 'zhangsan@example.com', status: '活跃' },
    { id: 2, name: '李四', email: 'lisi@example.com', status: '离线' },
    { id: 3, name: '王五', email: 'wangwu@example.com', status: '活跃' },
  ];

  const tableColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '姓名' },
    { key: 'email', label: '邮箱' },
    { 
      key: 'status', 
      label: '状态',
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === '活跃' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    }
  ];

  const dropdownOptions = [
    { value: 'option1', label: '选项 1' },
    { value: 'option2', label: '选项 2' },
    { value: 'option3', label: '选项 3' },
  ];

  const handleLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">UI 组件示例</h1>

      {/* Button 组件示例 */}
      <Card title="Button 组件" subtitle="支持多种样式和状态的按钮组件">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="success">成功按钮</Button>
            <Button variant="danger">危险按钮</Button>
            <Button variant="warning">警告按钮</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button disabled>禁用按钮</Button>
            <Button loading>加载按钮</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="small">小按钮</Button>
            <Button size="medium">中按钮</Button>
            <Button size="large">大按钮</Button>
          </div>
          <Button fullWidth onClick={() => setModalOpen(true)}>
            打开模态框
          </Button>
        </div>
      </Card>

      {/* Input 组件示例 */}
      <Card title="Input 组件" subtitle="支持多种输入类型和验证的输入框组件">
        <div className="space-y-4">
          <Input
            label="用户名"
            placeholder="请输入用户名"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
          />
          <Input
            type="email"
            label="邮箱"
            placeholder="请输入邮箱地址"
            error="请输入有效的邮箱地址"
          />
          <Input
            type="password"
            label="密码"
            placeholder="请输入密码"
            fullWidth
          />
        </div>
      </Card>

      {/* Dropdown 组件示例 */}
      <Card title="Dropdown 组件" subtitle="支持搜索功能的下拉选择组件">
        <div className="space-y-4">
          <Dropdown
            label="选择选项"
            options={dropdownOptions}
            value={selectedOption}
            onChange={setSelectedOption}
            placeholder="请选择一个选项"
            searchable
          />
          <p className="text-sm text-gray-600">
            当前选择: {selectedOption || '未选择'}
          </p>
        </div>
      </Card>

      {/* Table 组件示例 */}
      <Card title="Table 组件" subtitle="支持排序和分页的表格组件">
        <Table
          data={tableData}
          columns={tableColumns}
          sortable
          pagination
          pageSize={2}
          onRowClick={(row) => console.log('点击行:', row)}
        />
      </Card>

      {/* Loading 组件示例 */}
      <Card title="Loading 组件" subtitle="多种加载动画效果">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-8">
            <div className="text-center">
              <Loading type="spinner" size="small" />
              <p className="mt-2 text-sm text-gray-600">Spinner</p>
            </div>
            <div className="text-center">
              <Loading type="dots" size="small" />
              <p className="mt-2 text-sm text-gray-600">Dots</p>
            </div>
            <div className="text-center">
              <Loading type="pulse" size="small" />
              <p className="mt-2 text-sm text-gray-600">Pulse</p>
            </div>
            <div className="text-center">
              <Loading type="ring" size="small" />
              <p className="mt-2 text-sm text-gray-600">Ring</p>
            </div>
          </div>
          <Button onClick={handleLoading}>
            显示全屏加载
          </Button>
        </div>
      </Card>

      {/* Modal 组件示例 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="示例模态框"
        size="large"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              确认
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>这是一个模态框示例，可以包含任何内容。</p>
          <Input
            label="模态框内的输入框"
            placeholder="在这里输入内容"
          />
          <p className="text-sm text-gray-600">
            模态框支持键盘 ESC 关闭，点击遮罩层关闭等功能。
          </p>
        </div>
      </Modal>

      {/* 全屏加载示例 */}
      {loading && <Loading fullScreen text="正在处理请求..." />}
    </div>
  );
};

export default Example;