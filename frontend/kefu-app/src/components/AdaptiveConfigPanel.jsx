import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Input, 
  Select, 
  SelectItem, 
  Switch, 
  Slider, 
  Divider, 
  Card, 
  CardBody,
  Chip,
  Textarea
} from '@nextui-org/react';
import adaptiveConfigManager, { adaptiveUtils } from '../utils/adaptiveConfig';

/**
 * 自适应配置面板组件
 */
const AdaptiveConfigPanel = ({ 
  isOpen, 
  onClose, 
  onConfigChange,
  className = ""
}) => {
  const [config, setConfig] = useState(adaptiveConfigManager.getConfig());
  const [isDirty, setIsDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');

  // 监听配置变化
  useEffect(() => {
    const handleConfigChange = (newConfig) => {
      setConfig(newConfig);
      setIsDirty(false);
    };

    adaptiveConfigManager.addListener(handleConfigChange);
    return () => adaptiveConfigManager.removeListener(handleConfigChange);
  }, []);

  // 处理配置更新
  const handleConfigUpdate = (updates) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setIsDirty(true);
  };

  // 保存配置
  const handleSave = () => {
    if (adaptiveConfigManager.saveConfig(config)) {
      setIsDirty(false);
      onConfigChange?.(config);
    }
  };

  // 重置配置
  const handleReset = () => {
    adaptiveConfigManager.resetConfig();
  };

  // 导出配置
  const handleExport = () => {
    const configData = adaptiveConfigManager.exportConfig();
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adaptive-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const configData = JSON.parse(e.target.result);
          if (adaptiveConfigManager.importConfig(configData)) {
            onConfigChange?.(adaptiveConfigManager.getConfig());
          }
        } catch (error) {
          console.error('导入配置失败:', error);
          alert('导入配置失败: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  // 获取自适应模式选项
  const adaptiveModes = adaptiveConfigManager.getAdaptiveModes();
  const containerTypes = adaptiveConfigManager.getContainerTypes();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      className={className}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3>自适应配置设置</h3>
          <p className="text-sm text-gray-500">
            配置React卡片的自适应行为和显示效果
          </p>
        </ModalHeader>
        
        <ModalBody>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 基础设置 */}
            <Card>
              <CardBody>
                <h4 className="text-lg font-semibold mb-4">基础设置</h4>
                
                <div className="space-y-4">
                  {/* 启用自适应 */}
                  <div className="flex items-center justify-between">
                    <span>启用自适应</span>
                    <Switch
                      isSelected={config.enabled}
                      onValueChange={(value) => handleConfigUpdate({ enabled: value })}
                    />
                  </div>

                  {/* 自适应模式 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">自适应模式</label>
                    <Select
                      selectedKeys={[config.mode]}
                      onSelectionChange={(keys) => {
                        const mode = Array.from(keys)[0];
                        handleConfigUpdate({ mode });
                      }}
                    >
                      {Object.entries(adaptiveModes).map(([key, mode]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <div className="font-medium">{mode.description}</div>
                            <div className="text-xs text-gray-500">{key}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* 容器类型 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">容器类型</label>
                    <Select
                      selectedKeys={[config.containerType]}
                      onSelectionChange={(keys) => {
                        const containerType = Array.from(keys)[0];
                        handleConfigUpdate({ containerType });
                      }}
                    >
                      {Object.entries(containerTypes).map(([key, container]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <div className="font-medium">{container.description}</div>
                            <div className="text-xs text-gray-500">{key}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 尺寸设置 */}
            <Card>
              <CardBody>
                <h4 className="text-lg font-semibold mb-4">尺寸设置</h4>
                
                <div className="space-y-4">
                  {/* 最小宽度 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      最小宽度: {config.minWidth}px
                    </label>
                    <Slider
                      value={config.minWidth}
                      onChange={(value) => handleConfigUpdate({ minWidth: value })}
                      minValue={100}
                      maxValue={500}
                      step={10}
                      className="w-full"
                    />
                  </div>

                  {/* 最大宽度 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      最大宽度: {config.maxWidth}px
                    </label>
                    <Slider
                      value={config.maxWidth}
                      onChange={(value) => handleConfigUpdate({ maxWidth: value })}
                      minValue={300}
                      maxValue={1200}
                      step={50}
                      className="w-full"
                    />
                  </div>

                  {/* 最小高度 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      最小高度: {config.minHeight}px
                    </label>
                    <Slider
                      value={config.minHeight}
                      onChange={(value) => handleConfigUpdate({ minHeight: value })}
                      minValue={50}
                      maxValue={300}
                      step={10}
                      className="w-full"
                    />
                  </div>

                  {/* 最大高度 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      最大高度: {config.maxHeight}px
                    </label>
                    <Slider
                      value={config.maxHeight}
                      onChange={(value) => handleConfigUpdate({ maxHeight: value })}
                      minValue={200}
                      maxValue={800}
                      step={50}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 响应式断点 */}
            <Card>
              <CardBody>
                <h4 className="text-lg font-semibold mb-4">响应式断点</h4>
                
                <div className="space-y-4">
                  {Object.entries(config.breakpoints || {}).map(([breakpoint, breakpointConfig]) => (
                    <div key={breakpoint} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{breakpoint}px</span>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          onClick={() => {
                            const newBreakpoints = { ...config.breakpoints };
                            delete newBreakpoints[breakpoint];
                            handleConfigUpdate({ breakpoints: newBreakpoints });
                          }}
                        >
                          删除
                        </Button>
                      </div>
                      <Textarea
                        placeholder="CSS样式 (JSON格式)"
                        value={JSON.stringify(breakpointConfig, null, 2)}
                        onChange={(e) => {
                          try {
                            const newConfig = JSON.parse(e.target.value);
                            const newBreakpoints = { ...config.breakpoints };
                            newBreakpoints[breakpoint] = newConfig;
                            handleConfigUpdate({ breakpoints: newBreakpoints });
                          } catch (error) {
                            // 解析错误时不更新
                          }
                        }}
                        minRows={2}
                        maxRows={4}
                      />
                    </div>
                  ))}
                  
                  <Button
                    color="primary"
                    variant="bordered"
                    onClick={() => {
                      const newBreakpoint = prompt('输入断点宽度 (px):', '768');
                      if (newBreakpoint && !isNaN(newBreakpoint)) {
                        const newBreakpoints = { 
                          ...config.breakpoints, 
                          [newBreakpoint]: { fontSize: '14px' } 
                        };
                        handleConfigUpdate({ breakpoints: newBreakpoints });
                      }
                    }}
                  >
                    添加断点
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* 自定义CSS类 */}
            <Card>
              <CardBody>
                <h4 className="text-lg font-semibold mb-4">自定义CSS类</h4>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(config.customClasses || []).map((className, index) => (
                      <Chip
                        key={index}
                        onClose={() => {
                          const newClasses = config.customClasses.filter((_, i) => i !== index);
                          handleConfigUpdate({ customClasses: newClasses });
                        }}
                      >
                        {className}
                      </Chip>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入CSS类名"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const newClasses = [...(config.customClasses || []), e.target.value.trim()];
                          handleConfigUpdate({ customClasses: newClasses });
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button
                      color="primary"
                      variant="bordered"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="输入CSS类名"]');
                        if (input && input.value.trim()) {
                          const newClasses = [...(config.customClasses || []), input.value.trim()];
                          handleConfigUpdate({ customClasses: newClasses });
                          input.value = '';
                        }
                      }}
                    >
                      添加
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 预览 */}
          <Card className="mt-6">
            <CardBody>
              <h4 className="text-lg font-semibold mb-4">预览效果</h4>
              
              <div className="flex gap-4 mb-4">
                {['desktop', 'tablet', 'mobile'].map((mode) => (
                  <Button
                    key={mode}
                    variant={previewMode === mode ? 'solid' : 'bordered'}
                    size="sm"
                    onClick={() => setPreviewMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
              
              <div 
                className={`border rounded-lg p-4 transition-all duration-300 ${
                  previewMode === 'desktop' ? 'w-full' :
                  previewMode === 'tablet' ? 'w-2/3 mx-auto' :
                  'w-1/3 mx-auto'
                }`}
                style={{
                  minHeight: '200px',
                  backgroundColor: '#f8f9fa'
                }}
              >
                <div className="text-center text-gray-500">
                  预览区域 - {previewMode} 模式
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  当前配置: {config.mode} + {config.containerType}
                </div>
              </div>
            </CardBody>
          </Card>
        </ModalBody>
        
        <ModalFooter>
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              <Button
                color="secondary"
                variant="bordered"
                onClick={handleReset}
              >
                重置
              </Button>
              <Button
                color="secondary"
                variant="bordered"
                onClick={handleExport}
              >
                导出
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button color="secondary" variant="bordered" as="span">
                  导入
                </Button>
              </label>
            </div>
            
            <div className="flex gap-2">
              <Button
                color="danger"
                variant="light"
                onPress={onClose}
              >
                取消
              </Button>
              <Button
                color="primary"
                onPress={handleSave}
                isDisabled={!isDirty}
              >
                保存配置
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AdaptiveConfigPanel;