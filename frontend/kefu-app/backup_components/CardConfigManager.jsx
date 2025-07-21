import React, { useState, useEffect, createContext, useContext } from 'react';
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
  Card,
  CardBody,
  Tabs,
  Tab,
  Divider,
  Chip,
  Textarea,
  Accordion,
  AccordionItem
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { 
  CARD_SIZE_CONFIG, 
  CARD_THEME_CONFIG, 
  RESPONSIVE_BREAKPOINTS,
  CardConfigManager as ConfigManagerClass 
} from './ReactCardComponents';
import { ReactCardType } from './ReactCardMessage';

// 卡片配置上下文
const CardConfigContext = createContext();

// 卡片配置提供者
export const CardConfigProvider = ({ children }) => {
  const [configManager] = useState(() => new ConfigManagerClass());
  const [globalConfig, setGlobalConfig] = useState({
    defaultSize: 'auto',
    defaultTheme: 'auto',
    enableResponsive: true,
    enableAnimations: true,
    enableShadows: true,
    enableDialogBox: true,
    borderRadius: 8,
    animationDuration: 300,
    maxWidth: '100%',
    minWidth: '280px',
    dialogSize: '2xl',
    autoAdaptive: true,
    debounceMs: 150
  });

  const [cardConfigs, setCardConfigs] = useState({
    ProductCard: {
      showRating: true,
      showDescription: true,
      showButton: true,
      showPrice: true,
      showImage: true,
      imageAspectRatio: '16/9',
      priceFormat: '¥{price}',
      ratingMax: 5,
      loadingState: false,
      errorHandling: true
    },
    UserProfileCard: {
      showStatus: true,
      showRole: true,
      showActions: true,
      showEmail: true,
      avatarShape: 'circle',
      statusIndicator: true,
      actionButtons: ['message', 'edit']
    },
    NotificationCard: {
      showTimestamp: true,
      showAction: true,
      autoDismiss: false,
      dismissDelay: 5000,
      maxLines: 3,
      dismissible: true
    },
    DataCard: {
      showChange: true,
      showIcon: true,
      numberFormat: 'comma',
      decimalPlaces: 2,
      trendColors: true,
      animateValue: true
    },
    VoiceMessageCard: {
      showTitle: true,
      showProgress: true,
      autoPlay: false,
      loop: false,
      volume: 1.0,
      showControls: true
    },
    ActionCard: {
      showDescription: true,
      buttonLayout: 'horizontal',
      maxButtons: 4,
      buttonSpacing: 8,
      responsiveButtons: true
    },
    MediaCard: {
      showDescription: true,
      lazyLoad: true,
      preload: 'metadata',
      controls: true,
      showThumbnail: true
    },
    FormCard: {
      showLabels: true,
      showValidation: true,
      autoFocus: false,
      submitOnEnter: true,
      showProgress: false
    }
  });

  const [dialogConfig, setDialogConfig] = useState({
    enabled: true,
    size: '2xl',
    scrollBehavior: 'inside',
    showCardInfo: true,
    showCardData: true,
    showCardConfig: true,
    showActions: true,
    closeOnOverlayClick: true,
    closeOnEscape: true
  });

  const [responsiveConfig, setResponsiveConfig] = useState({
    enabled: true,
    breakpoints: {
      mobile: 480,
      tablet: 768,
      desktop: 1024,
      wide: 1440
    },
    sizes: {
      mobile: 'small',
      tablet: 'medium',
      desktop: 'large',
      wide: 'auto'
    },
    autoAdjust: true,
    smoothTransition: true
  });

  // 更新全局配置
  const updateGlobalConfig = (updates) => {
    setGlobalConfig(prev => ({ ...prev, ...updates }));
    configManager.setDefaultConfig(updates);
  };

  // 更新卡片配置
  const updateCardConfig = (cardType, updates) => {
    setCardConfigs(prev => ({
      ...prev,
      [cardType]: { ...prev[cardType], ...updates }
    }));
    configManager.setCardConfig(cardType, updates);
  };

  // 更新对话框配置
  const updateDialogConfig = (updates) => {
    setDialogConfig(prev => ({ ...prev, ...updates }));
  };

  // 更新响应式配置
  const updateResponsiveConfig = (updates) => {
    setResponsiveConfig(prev => ({ ...prev, ...updates }));
  };

  // 重置配置
  const resetConfig = (cardType = null) => {
    if (cardType) {
      setCardConfigs(prev => ({
        ...prev,
        [cardType]: {}
      }));
      configManager.setCardConfig(cardType, {});
    } else {
      setGlobalConfig({
        defaultSize: 'auto',
        defaultTheme: 'auto',
        enableResponsive: true,
        enableAnimations: true,
        enableShadows: true,
        enableDialogBox: true,
        borderRadius: 8,
        animationDuration: 300,
        maxWidth: '100%',
        minWidth: '280px',
        dialogSize: '2xl',
        autoAdaptive: true,
        debounceMs: 150
      });
      setCardConfigs({});
      setDialogConfig({
        enabled: true,
        size: '2xl',
        scrollBehavior: 'inside',
        showCardInfo: true,
        showCardData: true,
        showCardConfig: true,
        showActions: true,
        closeOnOverlayClick: true,
        closeOnEscape: true
      });
      setResponsiveConfig({
        enabled: true,
        breakpoints: {
          mobile: 480,
          tablet: 768,
          desktop: 1024,
          wide: 1440
        },
        sizes: {
          mobile: 'small',
          tablet: 'medium',
          desktop: 'large',
          wide: 'auto'
        },
        autoAdjust: true,
        smoothTransition: true
      });
    }
  };

  // 导出配置
  const exportConfig = () => {
    const config = {
      global: globalConfig,
      cards: cardConfigs,
      dialog: dialogConfig,
      responsive: responsiveConfig,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const importConfig = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        if (config.global) setGlobalConfig(config.global);
        if (config.cards) setCardConfigs(config.cards);
        if (config.dialog) setDialogConfig(config.dialog);
        if (config.responsive) setResponsiveConfig(config.responsive);
      } catch (error) {
        console.error('配置导入失败:', error);
        alert('配置文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  const value = {
    configManager,
    globalConfig,
    cardConfigs,
    dialogConfig,
    responsiveConfig,
    updateGlobalConfig,
    updateCardConfig,
    updateDialogConfig,
    updateResponsiveConfig,
    resetConfig,
    exportConfig,
    importConfig
  };

  return (
    <CardConfigContext.Provider value={value}>
      {children}
    </CardConfigContext.Provider>
  );
};

// 使用卡片配置Hook
export const useCardConfig = () => {
  const context = useContext(CardConfigContext);
  if (!context) {
    throw new Error('useCardConfig must be used within a CardConfigProvider');
  }
  return context;
};

// 卡片配置设置界面
export const CardConfigSettings = ({ isOpen, onClose }) => {
  const {
    globalConfig,
    cardConfigs,
    dialogConfig,
    responsiveConfig,
    updateGlobalConfig,
    updateCardConfig,
    updateDialogConfig,
    updateResponsiveConfig,
    resetConfig,
    exportConfig,
    importConfig
  } = useCardConfig();

  const [selectedCard, setSelectedCard] = useState('ProductCard');
  const [importFile, setImportFile] = useState(null);

  const cardTypes = [
    { key: 'ProductCard', label: '产品卡片', icon: '🛍️' },
    { key: 'UserProfileCard', label: '用户资料卡片', icon: '👤' },
    { key: 'NotificationCard', label: '通知卡片', icon: '🔔' },
    { key: 'DataCard', label: '数据卡片', icon: '📊' },
    { key: 'VoiceMessageCard', label: '语音消息卡片', icon: '🎵' },
    { key: 'ActionCard', label: '动作卡片', icon: '⚡' },
    { key: 'MediaCard', label: '媒体卡片', icon: '🖼️' },
    { key: 'FormCard', label: '表单卡片', icon: '📝' }
  ];

  const handleImport = () => {
    if (importFile) {
      importConfig(importFile);
      setImportFile(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Icon icon="solar:settings-linear" width={20} />
            <span>React卡片配置设置</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <Tabs aria-label="配置分类" className="w-full">
            {/* 全局配置 */}
            <Tab key="global" title="全局设置">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">基础设置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="默认大小"
                      selectedKeys={[globalConfig.defaultSize]}
                      onSelectionChange={(keys) => 
                        updateGlobalConfig({ defaultSize: Array.from(keys)[0] })
                      }
                    >
                      <SelectItem key="tiny" value="tiny">极小 (200px)</SelectItem>
                      <SelectItem key="small" value="small">小 (280px)</SelectItem>
                      <SelectItem key="medium" value="medium">中 (320px)</SelectItem>
                      <SelectItem key="large" value="large">大 (400px)</SelectItem>
                      <SelectItem key="auto" value="auto">自适应</SelectItem>
                    </Select>

                    <Select
                      label="默认主题"
                      selectedKeys={[globalConfig.defaultTheme]}
                      onSelectionChange={(keys) => 
                        updateGlobalConfig({ defaultTheme: Array.from(keys)[0] })
                      }
                    >
                      <SelectItem key="light" value="light">浅色</SelectItem>
                      <SelectItem key="dark" value="dark">深色</SelectItem>
                      <SelectItem key="auto" value="auto">自动</SelectItem>
                    </Select>

                    <Input
                      label="最大宽度"
                      value={globalConfig.maxWidth}
                      onChange={(e) => updateGlobalConfig({ maxWidth: e.target.value })}
                      placeholder="100%"
                    />

                    <Input
                      label="最小宽度"
                      value={globalConfig.minWidth}
                      onChange={(e) => updateGlobalConfig({ minWidth: e.target.value })}
                      placeholder="280px"
                    />

                    <Slider
                      label="圆角半径"
                      value={globalConfig.borderRadius}
                      onChange={(value) => updateGlobalConfig({ borderRadius: value })}
                      minValue={0}
                      maxValue={20}
                      step={1}
                      className="w-full"
                    />

                    <Slider
                      label="动画时长 (ms)"
                      value={globalConfig.animationDuration}
                      onChange={(value) => updateGlobalConfig({ animationDuration: value })}
                      minValue={100}
                      maxValue={1000}
                      step={50}
                      className="w-full"
                    />
                  </div>
                </div>

                <Divider />

                <div>
                  <h3 className="text-lg font-semibold mb-4">功能开关</h3>
                  <div className="space-y-4">
                    <Switch
                      isSelected={globalConfig.enableResponsive}
                      onValueChange={(value) => updateGlobalConfig({ enableResponsive: value })}
                    >
                      启用响应式设计
                    </Switch>

                    <Switch
                      isSelected={globalConfig.enableAnimations}
                      onValueChange={(value) => updateGlobalConfig({ enableAnimations: value })}
                    >
                      启用动画效果
                    </Switch>

                    <Switch
                      isSelected={globalConfig.enableShadows}
                      onValueChange={(value) => updateGlobalConfig({ enableShadows: value })}
                    >
                      启用阴影效果
                    </Switch>

                    <Switch
                      isSelected={globalConfig.enableDialogBox}
                      onValueChange={(value) => updateGlobalConfig({ enableDialogBox: value })}
                    >
                      启用对话框功能
                    </Switch>

                    <Switch
                      isSelected={globalConfig.autoAdaptive}
                      onValueChange={(value) => updateGlobalConfig({ autoAdaptive: value })}
                    >
                      自动自适应大小
                    </Switch>
                  </div>
                </div>

                <Divider />

                <div>
                  <h3 className="text-lg font-semibold mb-4">导入/导出</h3>
                  <div className="flex gap-4">
                    <Button
                      color="primary"
                      variant="bordered"
                      onPress={exportConfig}
                    >
                      导出配置
                    </Button>
                    
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => setImportFile(e.target.files[0])}
                        className="hidden"
                        id="import-config"
                      />
                      <label htmlFor="import-config">
                        <Button as="span" color="secondary" variant="bordered">
                          选择文件
                        </Button>
                      </label>
                      <Button
                        color="secondary"
                        onPress={handleImport}
                        isDisabled={!importFile}
                      >
                        导入配置
                      </Button>
                    </div>

                    <Button
                      color="danger"
                      variant="light"
                      onPress={() => resetConfig()}
                    >
                      重置所有配置
                    </Button>
                  </div>
                </div>
              </div>
            </Tab>

            {/* 对话框配置 */}
            <Tab key="dialog" title="对话框设置">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">对话框功能</h3>
                  <div className="space-y-4">
                    <Switch
                      isSelected={dialogConfig.enabled}
                      onValueChange={(value) => updateDialogConfig({ enabled: value })}
                    >
                      启用对话框功能
                    </Switch>

                    <Select
                      label="对话框大小"
                      selectedKeys={[dialogConfig.size]}
                      onSelectionChange={(keys) => 
                        updateDialogConfig({ size: Array.from(keys)[0] })
                      }
                    >
                      <SelectItem key="sm" value="sm">小</SelectItem>
                      <SelectItem key="md" value="md">中</SelectItem>
                      <SelectItem key="lg" value="lg">大</SelectItem>
                      <SelectItem key="xl" value="xl">超大</SelectItem>
                      <SelectItem key="2xl" value="2xl">最大</SelectItem>
                      <SelectItem key="full" value="full">全屏</SelectItem>
                    </Select>

                    <Select
                      label="滚动行为"
                      selectedKeys={[dialogConfig.scrollBehavior]}
                      onSelectionChange={(keys) => 
                        updateDialogConfig({ scrollBehavior: Array.from(keys)[0] })
                      }
                    >
                      <SelectItem key="inside" value="inside">内部滚动</SelectItem>
                      <SelectItem key="outside" value="outside">外部滚动</SelectItem>
                    </Select>
                  </div>
                </div>

                <Divider />

                <div>
                  <h3 className="text-lg font-semibold mb-4">显示选项</h3>
                  <div className="space-y-4">
                    <Switch
                      isSelected={dialogConfig.showCardInfo}
                      onValueChange={(value) => updateDialogConfig({ showCardInfo: value })}
                    >
                      显示卡片信息
                    </Switch>

                    <Switch
                      isSelected={dialogConfig.showCardData}
                      onValueChange={(value) => updateDialogConfig({ showCardData: value })}
                    >
                      显示卡片数据
                    </Switch>

                    <Switch
                      isSelected={dialogConfig.showCardConfig}
                      onValueChange={(value) => updateDialogConfig({ showCardConfig: value })}
                    >
                      显示配置信息
                    </Switch>

                    <Switch
                      isSelected={dialogConfig.showActions}
                      onValueChange={(value) => updateDialogConfig({ showActions: value })}
                    >
                      显示操作按钮
                    </Switch>
                  </div>
                </div>

                <Divider />

                <div>
                  <h3 className="text-lg font-semibold mb-4">交互选项</h3>
                  <div className="space-y-4">
                    <Switch
                      isSelected={dialogConfig.closeOnOverlayClick}
                      onValueChange={(value) => updateDialogConfig({ closeOnOverlayClick: value })}
                    >
                      点击遮罩关闭
                    </Switch>

                    <Switch
                      isSelected={dialogConfig.closeOnEscape}
                      onValueChange={(value) => updateDialogConfig({ closeOnEscape: value })}
                    >
                      ESC键关闭
                    </Switch>
                  </div>
                </div>
              </div>
            </Tab>

            {/* 响应式配置 */}
            <Tab key="responsive" title="响应式设置">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">响应式功能</h3>
                  <div className="space-y-4">
                    <Switch
                      isSelected={responsiveConfig.enabled}
                      onValueChange={(value) => updateResponsiveConfig({ enabled: value })}
                    >
                      启用响应式设计
                    </Switch>

                    <Switch
                      isSelected={responsiveConfig.autoAdjust}
                      onValueChange={(value) => updateResponsiveConfig({ autoAdjust: value })}
                    >
                      自动调整大小
                    </Switch>

                    <Switch
                      isSelected={responsiveConfig.smoothTransition}
                      onValueChange={(value) => updateResponsiveConfig({ smoothTransition: value })}
                    >
                      平滑过渡动画
                    </Switch>
                  </div>
                </div>

                <Divider />

                <div>
                  <h3 className="text-lg font-semibold mb-4">断点设置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="移动端断点 (px)"
                      type="number"
                      value={responsiveConfig.breakpoints.mobile}
                      onChange={(e) => updateResponsiveConfig({
                        breakpoints: {
                          ...responsiveConfig.breakpoints,
                          mobile: parseInt(e.target.value)
                        }
                      })}
                    />

                    <Input
                      label="平板断点 (px)"
                      type="number"
                      value={responsiveConfig.breakpoints.tablet}
                      onChange={(e) => updateResponsiveConfig({
                        breakpoints: {
                          ...responsiveConfig.breakpoints,
                          tablet: parseInt(e.target.value)
                        }
                      })}
                    />

                    <Input
                      label="桌面断点 (px)"
                      type="number"
                      value={responsiveConfig.breakpoints.desktop}
                      onChange={(e) => updateResponsiveConfig({
                        breakpoints: {
                          ...responsiveConfig.breakpoints,
                          desktop: parseInt(e.target.value)
                        }
                      })}
                    />

                    <Input
                      label="宽屏断点 (px)"
                      type="number"
                      value={responsiveConfig.breakpoints.wide}
                      onChange={(e) => updateResponsiveConfig({
                        breakpoints: {
                          ...responsiveConfig.breakpoints,
                          wide: parseInt(e.target.value)
                        }
                      })}
                    />
                  </div>
                </div>

                <Divider />

                <div>
                  <h3 className="text-lg font-semibold mb-4">大小映射</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="移动端大小"
                      selectedKeys={[responsiveConfig.sizes.mobile]}
                      onSelectionChange={(keys) => updateResponsiveConfig({
                        sizes: {
                          ...responsiveConfig.sizes,
                          mobile: Array.from(keys)[0]
                        }
                      })}
                    >
                      <SelectItem key="tiny" value="tiny">极小</SelectItem>
                      <SelectItem key="small" value="small">小</SelectItem>
                      <SelectItem key="medium" value="medium">中</SelectItem>
                      <SelectItem key="large" value="large">大</SelectItem>
                      <SelectItem key="auto" value="auto">自适应</SelectItem>
                    </Select>

                    <Select
                      label="平板大小"
                      selectedKeys={[responsiveConfig.sizes.tablet]}
                      onSelectionChange={(keys) => updateResponsiveConfig({
                        sizes: {
                          ...responsiveConfig.sizes,
                          tablet: Array.from(keys)[0]
                        }
                      })}
                    >
                      <SelectItem key="tiny" value="tiny">极小</SelectItem>
                      <SelectItem key="small" value="small">小</SelectItem>
                      <SelectItem key="medium" value="medium">中</SelectItem>
                      <SelectItem key="large" value="large">大</SelectItem>
                      <SelectItem key="auto" value="auto">自适应</SelectItem>
                    </Select>

                    <Select
                      label="桌面大小"
                      selectedKeys={[responsiveConfig.sizes.desktop]}
                      onSelectionChange={(keys) => updateResponsiveConfig({
                        sizes: {
                          ...responsiveConfig.sizes,
                          desktop: Array.from(keys)[0]
                        }
                      })}
                    >
                      <SelectItem key="tiny" value="tiny">极小</SelectItem>
                      <SelectItem key="small" value="small">小</SelectItem>
                      <SelectItem key="medium" value="medium">中</SelectItem>
                      <SelectItem key="large" value="large">大</SelectItem>
                      <SelectItem key="auto" value="auto">自适应</SelectItem>
                    </Select>

                    <Select
                      label="宽屏大小"
                      selectedKeys={[responsiveConfig.sizes.wide]}
                      onSelectionChange={(keys) => updateResponsiveConfig({
                        sizes: {
                          ...responsiveConfig.sizes,
                          wide: Array.from(keys)[0]
                        }
                      })}
                    >
                      <SelectItem key="tiny" value="tiny">极小</SelectItem>
                      <SelectItem key="small" value="small">小</SelectItem>
                      <SelectItem key="medium" value="medium">中</SelectItem>
                      <SelectItem key="large" value="large">大</SelectItem>
                      <SelectItem key="auto" value="auto">自适应</SelectItem>
                    </Select>
                  </div>
                </div>
              </div>
            </Tab>

            {/* 卡片配置 */}
            <Tab key="cards" title="卡片设置">
              <div className="flex gap-6">
                {/* 卡片类型选择 */}
                <div className="w-1/3">
                  <h3 className="text-lg font-semibold mb-4">卡片类型</h3>
                  <div className="space-y-2">
                    {cardTypes.map((card) => (
                      <Card
                        key={card.key}
                        isPressable
                        onPress={() => setSelectedCard(card.key)}
                        className={`cursor-pointer ${
                          selectedCard === card.key ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <CardBody className="p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{card.icon}</span>
                            <div>
                              <h4 className="text-sm font-medium">{card.label}</h4>
                              <p className="text-xs text-default-500">{card.key}</p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 卡片配置详情 */}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                      {cardTypes.find(c => c.key === selectedCard)?.label} 配置
                    </h3>
                    <Button
                      size="sm"
                      color="danger"
                      variant="light"
                      onPress={() => resetConfig(selectedCard)}
                    >
                      重置配置
                    </Button>
                  </div>

                  <CardConfigForm
                    cardType={selectedCard}
                    config={cardConfigs[selectedCard] || {}}
                    onUpdate={(updates) => updateCardConfig(selectedCard, updates)}
                  />
                </div>
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// 卡片配置表单组件
const CardConfigForm = ({ cardType, config, onUpdate }) => {
  const renderConfigFields = () => {
    switch (cardType) {
      case 'ProductCard':
        return (
          <Accordion variant="splitted">
            <AccordionItem key="display" aria-label="显示选项" title="显示选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.showRating ?? true}
                  onValueChange={(value) => onUpdate({ showRating: value })}
                >
                  显示评分
                </Switch>
                
                <Switch
                  isSelected={config.showDescription ?? true}
                  onValueChange={(value) => onUpdate({ showDescription: value })}
                >
                  显示描述
                </Switch>
                
                <Switch
                  isSelected={config.showButton ?? true}
                  onValueChange={(value) => onUpdate({ showButton: value })}
                >
                  显示按钮
                </Switch>

                <Switch
                  isSelected={config.showPrice ?? true}
                  onValueChange={(value) => onUpdate({ showPrice: value })}
                >
                  显示价格
                </Switch>

                <Switch
                  isSelected={config.showImage ?? true}
                  onValueChange={(value) => onUpdate({ showImage: value })}
                >
                  显示图片
                </Switch>
              </div>
            </AccordionItem>

            <AccordionItem key="format" aria-label="格式设置" title="格式设置">
              <div className="space-y-4">
                <Input
                  label="图片宽高比"
                  value={config.imageAspectRatio || '16/9'}
                  onChange={(e) => onUpdate({ imageAspectRatio: e.target.value })}
                  placeholder="16/9"
                />
                
                <Input
                  label="价格格式"
                  value={config.priceFormat || '¥{price}'}
                  onChange={(e) => onUpdate({ priceFormat: e.target.value })}
                  placeholder="¥{price}"
                />
                
                <Slider
                  label="最大评分"
                  value={config.ratingMax || 5}
                  onChange={(value) => onUpdate({ ratingMax: value })}
                  minValue={1}
                  maxValue={10}
                  step={1}
                />
              </div>
            </AccordionItem>

            <AccordionItem key="advanced" aria-label="高级选项" title="高级选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.loadingState ?? false}
                  onValueChange={(value) => onUpdate({ loadingState: value })}
                >
                  显示加载状态
                </Switch>

                <Switch
                  isSelected={config.errorHandling ?? true}
                  onValueChange={(value) => onUpdate({ errorHandling: value })}
                >
                  错误处理
                </Switch>
              </div>
            </AccordionItem>
          </Accordion>
        );

      case 'UserProfileCard':
        return (
          <Accordion variant="splitted">
            <AccordionItem key="display" aria-label="显示选项" title="显示选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.showStatus ?? true}
                  onValueChange={(value) => onUpdate({ showStatus: value })}
                >
                  显示状态
                </Switch>
                
                <Switch
                  isSelected={config.showRole ?? true}
                  onValueChange={(value) => onUpdate({ showRole: value })}
                >
                  显示角色
                </Switch>
                
                <Switch
                  isSelected={config.showActions ?? true}
                  onValueChange={(value) => onUpdate({ showActions: value })}
                >
                  显示操作按钮
                </Switch>

                <Switch
                  isSelected={config.showEmail ?? true}
                  onValueChange={(value) => onUpdate({ showEmail: value })}
                >
                  显示邮箱
                </Switch>
              </div>
            </AccordionItem>

            <AccordionItem key="style" aria-label="样式设置" title="样式设置">
              <div className="space-y-4">
                <Select
                  label="头像形状"
                  selectedKeys={[config.avatarShape || 'circle']}
                  onSelectionChange={(keys) => 
                    onUpdate({ avatarShape: Array.from(keys)[0] })
                  }
                >
                  <SelectItem key="circle" value="circle">圆形</SelectItem>
                  <SelectItem key="square" value="square">方形</SelectItem>
                  <SelectItem key="rounded" value="rounded">圆角</SelectItem>
                </Select>
                
                <Switch
                  isSelected={config.statusIndicator ?? true}
                  onValueChange={(value) => onUpdate({ statusIndicator: value })}
                >
                  状态指示器
                </Switch>
              </div>
            </AccordionItem>
          </Accordion>
        );

      case 'NotificationCard':
        return (
          <Accordion variant="splitted">
            <AccordionItem key="display" aria-label="显示选项" title="显示选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.showTimestamp ?? true}
                  onValueChange={(value) => onUpdate({ showTimestamp: value })}
                >
                  显示时间戳
                </Switch>
                
                <Switch
                  isSelected={config.showAction ?? true}
                  onValueChange={(value) => onUpdate({ showAction: value })}
                >
                  显示操作按钮
                </Switch>
                
                <Switch
                  isSelected={config.autoDismiss ?? false}
                  onValueChange={(value) => onUpdate({ autoDismiss: value })}
                >
                  自动消失
                </Switch>

                <Switch
                  isSelected={config.dismissible ?? true}
                  onValueChange={(value) => onUpdate({ dismissible: value })}
                >
                  可关闭
                </Switch>
              </div>
            </AccordionItem>

            <AccordionItem key="behavior" aria-label="行为设置" title="行为设置">
              <div className="space-y-4">
                <Slider
                  label="消失延迟 (毫秒)"
                  value={config.dismissDelay || 5000}
                  onChange={(value) => onUpdate({ dismissDelay: value })}
                  minValue={1000}
                  maxValue={30000}
                  step={1000}
                  isDisabled={!config.autoDismiss}
                />
                
                <Slider
                  label="最大行数"
                  value={config.maxLines || 3}
                  onChange={(value) => onUpdate({ maxLines: value })}
                  minValue={1}
                  maxValue={10}
                  step={1}
                />
              </div>
            </AccordionItem>
          </Accordion>
        );

      case 'DataCard':
        return (
          <Accordion variant="splitted">
            <AccordionItem key="display" aria-label="显示选项" title="显示选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.showChange ?? true}
                  onValueChange={(value) => onUpdate({ showChange: value })}
                >
                  显示变化
                </Switch>
                
                <Switch
                  isSelected={config.showIcon ?? true}
                  onValueChange={(value) => onUpdate({ showIcon: value })}
                >
                  显示图标
                </Switch>
                
                <Switch
                  isSelected={config.trendColors ?? true}
                  onValueChange={(value) => onUpdate({ trendColors: value })}
                >
                  趋势颜色
                </Switch>

                <Switch
                  isSelected={config.animateValue ?? true}
                  onValueChange={(value) => onUpdate({ animateValue: value })}
                >
                  数值动画
                </Switch>
              </div>
            </AccordionItem>

            <AccordionItem key="format" aria-label="格式设置" title="格式设置">
              <div className="space-y-4">
                <Select
                  label="数字格式"
                  selectedKeys={[config.numberFormat || 'comma']}
                  onSelectionChange={(keys) => 
                    onUpdate({ numberFormat: Array.from(keys)[0] })
                  }
                >
                  <SelectItem key="comma" value="comma">逗号分隔</SelectItem>
                  <SelectItem key="space" value="space">空格分隔</SelectItem>
                  <SelectItem key="none" value="none">无分隔</SelectItem>
                </Select>
                
                <Slider
                  label="小数位数"
                  value={config.decimalPlaces || 2}
                  onChange={(value) => onUpdate({ decimalPlaces: value })}
                  minValue={0}
                  maxValue={4}
                  step={1}
                />
              </div>
            </AccordionItem>
          </Accordion>
        );

      case 'VoiceMessageCard':
        return (
          <Accordion variant="splitted">
            <AccordionItem key="display" aria-label="显示选项" title="显示选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.showTitle ?? true}
                  onValueChange={(value) => onUpdate({ showTitle: value })}
                >
                  显示标题
                </Switch>
                
                <Switch
                  isSelected={config.showProgress ?? true}
                  onValueChange={(value) => onUpdate({ showProgress: value })}
                >
                  显示进度条
                </Switch>

                <Switch
                  isSelected={config.showControls ?? true}
                  onValueChange={(value) => onUpdate({ showControls: value })}
                >
                  显示控制按钮
                </Switch>
              </div>
            </AccordionItem>

            <AccordionItem key="behavior" aria-label="行为设置" title="行为设置">
              <div className="space-y-4">
                <Switch
                  isSelected={config.autoPlay ?? false}
                  onValueChange={(value) => onUpdate({ autoPlay: value })}
                >
                  自动播放
                </Switch>
                
                <Switch
                  isSelected={config.loop ?? false}
                  onValueChange={(value) => onUpdate({ loop: value })}
                >
                  循环播放
                </Switch>
                
                <Slider
                  label="音量"
                  value={config.volume || 1.0}
                  onChange={(value) => onUpdate({ volume: value })}
                  minValue={0}
                  maxValue={1}
                  step={0.1}
                />
              </div>
            </AccordionItem>
          </Accordion>
        );

      case 'ActionCard':
        return (
          <Accordion variant="splitted">
            <AccordionItem key="display" aria-label="显示选项" title="显示选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.showDescription ?? true}
                  onValueChange={(value) => onUpdate({ showDescription: value })}
                >
                  显示描述
                </Switch>

                <Switch
                  isSelected={config.responsiveButtons ?? true}
                  onValueChange={(value) => onUpdate({ responsiveButtons: value })}
                >
                  响应式按钮
                </Switch>
              </div>
            </AccordionItem>

            <AccordionItem key="layout" aria-label="布局设置" title="布局设置">
              <div className="space-y-4">
                <Select
                  label="按钮布局"
                  selectedKeys={[config.buttonLayout || 'horizontal']}
                  onSelectionChange={(keys) => 
                    onUpdate({ buttonLayout: Array.from(keys)[0] })
                  }
                >
                  <SelectItem key="horizontal" value="horizontal">水平</SelectItem>
                  <SelectItem key="vertical" value="vertical">垂直</SelectItem>
                  <SelectItem key="grid" value="grid">网格</SelectItem>
                </Select>
                
                <Slider
                  label="最大按钮数"
                  value={config.maxButtons || 4}
                  onChange={(value) => onUpdate({ maxButtons: value })}
                  minValue={1}
                  maxValue={8}
                  step={1}
                />
                
                <Slider
                  label="按钮间距 (px)"
                  value={config.buttonSpacing || 8}
                  onChange={(value) => onUpdate({ buttonSpacing: value })}
                  minValue={4}
                  maxValue={20}
                  step={2}
                />
              </div>
            </AccordionItem>
          </Accordion>
        );

      case 'MediaCard':
        return (
          <Accordion variant="splitted">
            <AccordionItem key="display" aria-label="显示选项" title="显示选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.showDescription ?? true}
                  onValueChange={(value) => onUpdate({ showDescription: value })}
                >
                  显示描述
                </Switch>

                <Switch
                  isSelected={config.showThumbnail ?? true}
                  onValueChange={(value) => onUpdate({ showThumbnail: value })}
                >
                  显示缩略图
                </Switch>
              </div>
            </AccordionItem>

            <AccordionItem key="performance" aria-label="性能设置" title="性能设置">
              <div className="space-y-4">
                <Switch
                  isSelected={config.lazyLoad ?? true}
                  onValueChange={(value) => onUpdate({ lazyLoad: value })}
                >
                  懒加载
                </Switch>
                
                <Select
                  label="预加载策略"
                  selectedKeys={[config.preload || 'metadata']}
                  onSelectionChange={(keys) => 
                    onUpdate({ preload: Array.from(keys)[0] })
                  }
                >
                  <SelectItem key="none" value="none">不预加载</SelectItem>
                  <SelectItem key="metadata" value="metadata">仅元数据</SelectItem>
                  <SelectItem key="auto" value="auto">自动</SelectItem>
                </Select>
                
                <Switch
                  isSelected={config.controls ?? true}
                  onValueChange={(value) => onUpdate({ controls: value })}
                >
                  显示控制按钮
                </Switch>
              </div>
            </AccordionItem>
          </Accordion>
        );

      case 'FormCard':
        return (
          <Accordion variant="splitted">
            <AccordionItem key="display" aria-label="显示选项" title="显示选项">
              <div className="space-y-4">
                <Switch
                  isSelected={config.showLabels ?? true}
                  onValueChange={(value) => onUpdate({ showLabels: value })}
                >
                  显示标签
                </Switch>
                
                <Switch
                  isSelected={config.showValidation ?? true}
                  onValueChange={(value) => onUpdate({ showValidation: value })}
                >
                  显示验证信息
                </Switch>

                <Switch
                  isSelected={config.showProgress ?? false}
                  onValueChange={(value) => onUpdate({ showProgress: value })}
                >
                  显示提交进度
                </Switch>
              </div>
            </AccordionItem>

            <AccordionItem key="behavior" aria-label="行为设置" title="行为设置">
              <div className="space-y-4">
                <Switch
                  isSelected={config.autoFocus ?? false}
                  onValueChange={(value) => onUpdate({ autoFocus: value })}
                >
                  自动聚焦
                </Switch>
                
                <Switch
                  isSelected={config.submitOnEnter ?? true}
                  onValueChange={(value) => onUpdate({ submitOnEnter: value })}
                >
                  Enter键提交
                </Switch>
              </div>
            </AccordionItem>
          </Accordion>
        );

      default:
        return (
          <div className="text-center text-default-500 py-8">
            该卡片类型的配置选项开发中...
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderConfigFields()}
    </div>
  );
};

export default CardConfigSettings;