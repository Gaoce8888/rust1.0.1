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

const TestComponents = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState('');

  // 测试数据
  const testData = [
    { id: 1, name: '测试用户1', status: '在线' },
    { id: 2, name: '测试用户2', status: '离线' },
  ];

  const testColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '姓名' },
    { key: 'status', label: '状态' },
  ];

  const dropdownOptions = [
    { value: 'test1', label: '测试选项1' },
    { value: 'test2', label: '测试选项2' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">组件测试</h2>
      
      {/* 测试按钮 */}
      <Card title="按钮测试">
        <div className="space-y-2">
          <Button onClick={() => alert('按钮点击成功!')}>
            测试按钮
          </Button>
          <Button variant="success" loading>
            加载按钮
          </Button>
        </div>
      </Card>

      {/* 测试输入框 */}
      <Card title="输入框测试">
        <Input
          label="测试输入"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="请输入内容"
        />
        <p className="mt-2 text-sm text-gray-600">
          输入值: {inputValue || '无'}
        </p>
      </Card>

      {/* 测试下拉框 */}
      <Card title="下拉框测试">
        <Dropdown
          options={dropdownOptions}
          value={selectedOption}
          onChange={setSelectedOption}
          placeholder="请选择"
        />
        <p className="mt-2 text-sm text-gray-600">
          选择值: {selectedOption || '无'}
        </p>
      </Card>

      {/* 测试表格 */}
      <Card title="表格测试">
        <Table
          data={testData}
          columns={testColumns}
          sortable
          onRowClick={(row) => alert(`点击了: ${row.name}`)}
        />
      </Card>

      {/* 测试加载 */}
      <Card title="加载测试">
        <Loading type="spinner" text="测试加载中..." />
      </Card>

      {/* 测试模态框 */}
      <Card title="模态框测试">
        <Button onClick={() => setModalOpen(true)}>
          打开模态框
        </Button>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="测试模态框"
        footer={
          <Button onClick={() => setModalOpen(false)}>
            关闭
          </Button>
        }
      >
        <p>这是一个测试模态框，所有组件都正常工作！</p>
      </Modal>
    </div>
  );
};

export default TestComponents;