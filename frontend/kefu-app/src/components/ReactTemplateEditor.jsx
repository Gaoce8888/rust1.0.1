import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody, 
  Button, 
  Input, 
  Textarea, 
  Select, 
  SelectItem,
  Tabs, 
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Alert
} from '@nextui-org/react';
import ReactCardComponents from './ReactCardComponents';

// React模板编辑器
export const ReactTemplateEditor = () => {
  const [template, setTemplate] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [componentLibrary, setComponentLibrary] = useState([]);
  const [previewData, setPreviewData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 模拟组件库数据
  useEffect(() => {
    const mockComponents = [
      {
        id: 'product-card',
        name: 'ProductCard',
        category: 'Card',
        description: '产品展示卡片',
        thumbnail: '🛍️',
        props: {
          title: '产品标题',
          price: 99.99,
          image: 'https://via.placeholder.com/300x200',
          description: '产品描述',
          rating: 4.5
        }
      },
      {
        id: 'user-profile-card',
        name: 'UserProfileCard',
        category: 'Card',
        description: '用户资料卡片',
        thumbnail: '👤',
        props: {
          avatar: 'https://via.placeholder.com/100x100',
          name: '用户名',
          email: 'user@example.com',
          role: '用户角色',
          status: 'online'
        }
      },
      {
        id: 'notification-card',
        name: 'NotificationCard',
        category: 'Card',
        description: '通知消息卡片',
        thumbnail: '🔔',
        props: {
          title: '通知标题',
          message: '通知内容',
          type: 'info',
          timestamp: new Date().toISOString()
        }
      },
      {
        id: 'data-card',
        name: 'DataCard',
        category: 'Card',
        description: '数据展示卡片',
        thumbnail: '📊',
        props: {
          title: '数据标题',
          value: '1,234',
          change: 12.5,
          trend: 'up',
          icon: '📈'
        }
      }
    ];
    setComponentLibrary(mockComponents);
  }, []);

  // 保存模板
  const handleSaveTemplate = async () => {
    if (!template) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/react/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });
      
      if (!response.ok) {
        throw new Error('保存失败');
      }
      
      const result = await response.json();
      console.log('模板保存成功:', result);
      
      // 显示成功消息
      alert('模板保存成功！');
    } catch (err) {
      setError(err.message);
      console.error('保存模板失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 预览模板
  const handlePreview = () => {
    onOpen();
  };

  // 添加组件到模板
  const handleAddComponent = (component) => {
    if (!template) {
      // 创建新模板
      setTemplate({
        name: '新模板',
        description: '',
        card_type: 'CustomCard',
        components: [{
          id: `${component.id}-${Date.now()}`,
          component_id: component.id,
          name: component.name,
          props: component.props,
          position: {
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            z_index: 1
          }
        }]
      });
    } else {
      // 添加组件到现有模板
      setTemplate(prev => ({
        ...prev,
        components: [
          ...prev.components,
          {
            id: `${component.id}-${Date.now()}`,
            component_id: component.id,
            name: component.name,
            props: component.props,
            position: {
              x: 0,
              y: 0,
              width: 400,
              height: 300,
              z_index: prev.components.length + 1
            }
          }
        ]
      }));
    }
  };

  // 更新组件属性
  const handleComponentUpdate = (componentId, updatedProps) => {
    setTemplate(prev => ({
      ...prev,
      components: prev.components.map(comp => 
        comp.id === componentId 
          ? { ...comp, props: { ...comp.props, ...updatedProps } }
          : comp
      )
    }));
  };

  // 删除组件
  const handleDeleteComponent = (componentId) => {
    setTemplate(prev => ({
      ...prev,
      components: prev.components.filter(comp => comp.id !== componentId)
    }));
    setSelectedComponent(null);
  };

  // 渲染组件预览
  const renderComponentPreview = (component) => {
    const Component = ReactCardComponents[component.name];
    if (!Component) {
      return <div className="p-4 text-center text-gray-500">组件未找到: {component.name}</div>;
    }
    
    return <Component {...component.props} />;
  };

  return (
    <div className="react-template-editor min-h-screen bg-gray-50">
      {/* 工具栏 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">React模板编辑器</h1>
            <Input
              placeholder="模板名称"
              value={template?.name || ''}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="w-64"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="bordered"
              startContent={<span>👁️</span>}
              onPress={handlePreview}
              isDisabled={!template}
            >
              预览
            </Button>
            
            <Button
              color="primary"
              startContent={<span>💾</span>}
              onPress={handleSaveTemplate}
              isLoading={isLoading}
              isDisabled={!template}
            >
              保存模板
            </Button>
          </div>
        </div>
      </div>

      {/* 主编辑区域 */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* 组件库面板 */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">组件库</h3>
            
            <Tabs aria-label="组件分类" className="w-full">
              <Tab key="cards" title="卡片">
                <div className="space-y-3 mt-4">
                  {componentLibrary
                    .filter(c => c.category === 'Card')
                    .map(component => (
                      <Card
                        key={component.id}
                        isPressable
                        onPress={() => handleAddComponent(component)}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardBody className="p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{component.thumbnail}</span>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {component.name}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {component.description}
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                </div>
              </Tab>
              
              <Tab key="buttons" title="按钮">
                <div className="mt-4 text-center text-gray-500">
                  按钮组件开发中...
                </div>
              </Tab>
              
              <Tab key="forms" title="表单">
                <div className="mt-4 text-center text-gray-500">
                  表单组件开发中...
                </div>
              </Tab>
            </Tabs>
          </div>
        </div>

        {/* 画布区域 */}
        <div className="flex-1 bg-gray-100 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow-sm min-h-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">画布</h3>
            
            {!template ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  开始创建React模板
                </h3>
                <p className="text-gray-500 mb-6">
                  从左侧组件库拖拽组件到画布中
                </p>
                <Button
                  color="primary"
                  onPress={() => handleAddComponent(componentLibrary[0])}
                >
                  添加第一个组件
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {template.components.map(component => (
                  <div
                    key={component.id}
                    className={`relative border-2 rounded-lg p-2 ${
                      selectedComponent?.id === component.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedComponent(component)}
                  >
                    {renderComponentPreview(component)}
                    
                    {selectedComponent?.id === component.id && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => handleDeleteComponent(component.id)}
                        >
                          <span>🗑️</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 属性面板 */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">属性</h3>
            
            {selectedComponent ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {selectedComponent.name}
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    组件ID: {selectedComponent.component_id}
                  </p>
                </div>
                
                {Object.entries(selectedComponent.props).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {key}
                    </label>
                    
                    {typeof value === 'string' && (
                      <Input
                        value={value}
                        onChange={(e) => handleComponentUpdate(selectedComponent.id, { [key]: e.target.value })}
                        size="sm"
                      />
                    )}
                    
                    {typeof value === 'number' && (
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleComponentUpdate(selectedComponent.id, { [key]: parseFloat(e.target.value) || 0 })}
                        size="sm"
                      />
                    )}
                    
                    {typeof value === 'boolean' && (
                      <Select
                        selectedKeys={[value.toString()]}
                        onSelectionChange={(keys) => {
                          const boolValue = Array.from(keys)[0] === 'true';
                          handleComponentUpdate(selectedComponent.id, { [key]: boolValue });
                        }}
                        size="sm"
                      >
                        <SelectItem key="true" value="true">是</SelectItem>
                        <SelectItem key="false" value="false">否</SelectItem>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">⚙️</div>
                <p className="text-gray-500">
                  请选择一个组件来编辑属性
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 预览模态框 */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>模板预览</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {template?.components.map(component => (
                <div key={component.id}>
                  {renderComponentPreview(component)}
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onClose}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 错误提示 */}
      {error && (
        <Alert
          color="danger"
          className="fixed bottom-4 right-4 w-80"
          onClose={() => setError(null)}
        >
          <span>错误: {error}</span>
        </Alert>
      )}
    </div>
  );
};

export default ReactTemplateEditor;