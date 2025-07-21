import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  Chip, 
  Divider,
  Tabs,
  Tab,
  Select,
  SelectItem,
  Switch,
  Slider,
  Input
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { CardConfigProvider, CardConfigSettings, useCardConfig } from './CardConfigManager';
import { 
  ReactCardMessage, 
  ReactCardMessageList, 
  ReactCardMessageGenerator,
  ReactCardType 
} from './ReactCardMessage';

// React卡片演示组件
export const ReactCardDemo = () => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState('auto');
  const [selectedTheme, setSelectedTheme] = useState('auto');
  const [showDialog, setShowDialog] = useState(true);
  const [demoCards, setDemoCards] = useState([]);

  // 示例卡片数据
  const sampleCards = [
    {
      cardType: ReactCardType.PRODUCT,
      cardData: {
        title: 'iPhone 15 Pro',
        price: 8999,
        image: 'https://via.placeholder.com/300x200/007AFF/FFFFFF?text=iPhone+15+Pro',
        description: '最新款iPhone，搭载A17 Pro芯片，钛金属机身设计',
        rating: 4.8
      },
      cardConfig: {
        showRating: true,
        showDescription: true,
        showButton: true
      }
    },
    {
      cardType: ReactCardType.USER_PROFILE,
      cardData: {
        avatar: 'https://via.placeholder.com/100x100/FF6B6B/FFFFFF?text=张',
        name: '张小明',
        email: 'zhang@example.com',
        role: 'VIP客户',
        status: 'online'
      },
      cardConfig: {
        showStatus: true,
        showRole: true,
        showActions: true
      }
    },
    {
      cardType: ReactCardType.NOTIFICATION,
      cardData: {
        title: '订单状态更新',
        message: '您的订单 #12345 已发货，预计明天送达',
        type: 'success',
        timestamp: new Date().toISOString()
      },
      cardConfig: {
        showTimestamp: true,
        showAction: true,
        autoDismiss: false
      }
    },
    {
      cardType: ReactCardType.DATA,
      cardData: {
        title: '今日销售额',
        value: 125680,
        change: 12.5,
        trend: 'up',
        icon: '💰',
        color: 'success'
      },
      cardConfig: {
        showChange: true,
        showIcon: true,
        numberFormat: 'comma'
      }
    },
    {
      cardType: ReactCardType.VOICE_MESSAGE,
      cardData: {
        title: '语音留言',
        duration: 45,
        isPlaying: false
      },
      cardConfig: {
        showTitle: true,
        showProgress: true,
        autoPlay: false
      }
    },
    {
      cardType: ReactCardType.ACTION,
      cardData: {
        title: '订单操作',
        description: '请选择您要执行的操作',
        actions: [
          { label: '确认收货', action: 'confirm', color: 'success' },
          { label: '申请退款', action: 'refund', color: 'warning' },
          { label: '联系客服', action: 'contact', color: 'primary' },
          { label: '取消订单', action: 'cancel', color: 'danger' }
        ]
      },
      cardConfig: {
        showDescription: true,
        buttonLayout: 'horizontal',
        maxButtons: 4
      }
    },
    {
      cardType: ReactCardType.MEDIA,
      cardData: {
        title: '产品展示视频',
        mediaUrl: 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Video',
        mediaType: 'video',
        description: '产品使用演示视频'
      },
      cardConfig: {
        showDescription: true,
        controls: true,
        lazyLoad: true
      }
    },
    {
      cardType: ReactCardType.FORM,
      cardData: {
        title: '反馈表单',
        fields: [
          { name: 'name', label: '姓名', type: 'text', required: true, placeholder: '请输入您的姓名' },
          { name: 'email', label: '邮箱', type: 'text', required: true, placeholder: '请输入您的邮箱' },
          { name: 'feedback', label: '反馈内容', type: 'textarea', required: true, placeholder: '请详细描述您的问题或建议', rows: 4 },
          { name: 'category', label: '反馈类型', type: 'select', required: true, placeholder: '请选择反馈类型', options: [
            { value: 'bug', label: '问题反馈' },
            { value: 'feature', label: '功能建议' },
            { value: 'other', label: '其他' }
          ]}
        ],
        submitLabel: '提交反馈'
      },
      cardConfig: {
        showLabels: true,
        showValidation: true,
        autoFocus: true
      }
    }
  ];

  const handleCardAction = (action, data) => {
    console.log('卡片动作:', action, data);
    
    // 根据动作类型执行相应操作
    switch (action) {
      case 'view_details':
        alert(`查看详情: ${data.title || data.name || '未知项目'}`);
        break;
      case 'edit':
        alert(`编辑: ${data.name || '未知用户'}`);
        break;
      case 'confirm':
        alert('确认操作');
        break;
      case 'refund':
        alert('申请退款');
        break;
      case 'contact':
        alert('联系客服');
        break;
      case 'cancel':
        alert('取消操作');
        break;
      case 'submit':
        alert(`表单提交: ${JSON.stringify(data.formData, null, 2)}`);
        break;
      default:
        alert(`执行动作: ${action}`);
    }
  };

  const handleGenerateCard = (cardConfig) => {
    setDemoCards(prev => [...prev, cardConfig]);
  };

  const handleClearCards = () => {
    setDemoCards([]);
  };

  return (
    <CardConfigProvider>
      <div className="p-6 space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">React卡片系统演示</h1>
            <p className="text-default-500">展示自适应大小和对话框功能的React卡片组件</p>
          </div>
          <div className="flex gap-2">
            <Button
              color="primary"
              variant="bordered"
              startContent={<Icon icon="solar:settings-linear" width={16} />}
              onPress={() => setIsConfigOpen(true)}
            >
              配置设置
            </Button>
            <Button
              color="secondary"
              variant="bordered"
              startContent={<Icon icon="solar:magic-stick-linear" width={16} />}
              onPress={() => setDemoCards(sampleCards)}
            >
              加载示例
            </Button>
            <Button
              color="danger"
              variant="light"
              startContent={<Icon icon="solar:trash-bin-minimalistic-linear" width={16} />}
              onPress={handleClearCards}
            >
              清空
            </Button>
          </div>
        </div>

        {/* 控制面板 */}
        <Card className="bg-default-50">
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select
                label="卡片大小"
                selectedKeys={[selectedSize]}
                onSelectionChange={(keys) => setSelectedSize(Array.from(keys)[0])}
              >
                <SelectItem key="tiny" value="tiny">极小</SelectItem>
                <SelectItem key="small" value="small">小</SelectItem>
                <SelectItem key="medium" value="medium">中</SelectItem>
                <SelectItem key="large" value="large">大</SelectItem>
                <SelectItem key="auto" value="auto">自适应</SelectItem>
              </Select>

              <Select
                label="主题"
                selectedKeys={[selectedTheme]}
                onSelectionChange={(keys) => setSelectedTheme(Array.from(keys)[0])}
              >
                <SelectItem key="light" value="light">浅色</SelectItem>
                <SelectItem key="dark" value="dark">深色</SelectItem>
                <SelectItem key="auto" value="auto">自动</SelectItem>
              </Select>

              <div className="flex items-center gap-2">
                <Switch
                  isSelected={showDialog}
                  onValueChange={setShowDialog}
                />
                <span className="text-small">对话框</span>
              </div>

              <div className="flex items-center gap-2">
                <Chip size="sm" color="primary">
                  {demoCards.length} 张卡片
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 主要内容 */}
        <Tabs aria-label="演示分类" className="w-full">
          {/* 单个卡片演示 */}
          <Tab key="single" title="单个卡片">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sampleCards.map((card, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4">
                      {card.cardType.replace(/_/g, ' ')}
                    </h3>
                    <ReactCardMessage
                      cardType={card.cardType}
                      cardData={card.cardData}
                      cardConfig={card.cardConfig}
                      size={selectedSize}
                      theme={selectedTheme}
                      showInDialog={showDialog}
                      onCardAction={handleCardAction}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Tab>

          {/* 卡片列表演示 */}
          <Tab key="list" title="卡片列表">
            <div className="space-y-6">
              <div className="flex gap-4">
                <Select
                  label="布局方式"
                  selectedKeys={['grid']}
                  className="w-48"
                >
                  <SelectItem key="grid" value="grid">网格布局</SelectItem>
                  <SelectItem key="list" value="list">列表布局</SelectItem>
                  <SelectItem key="masonry" value="masonry">瀑布流</SelectItem>
                </Select>

                <Input
                  label="列数"
                  type="number"
                  defaultValue={2}
                  min={1}
                  max={4}
                  className="w-32"
                />
              </div>

              <ReactCardMessageList
                cards={demoCards.length > 0 ? demoCards : sampleCards}
                size={selectedSize}
                theme={selectedTheme}
                layout="grid"
                columns={2}
                gap={16}
                onCardAction={handleCardAction}
              />
            </div>
          </Tab>

          {/* 卡片生成器 */}
          <Tab key="generator" title="卡片生成器">
            <div className="space-y-6">
              <ReactCardMessageGenerator
                onGenerate={handleGenerateCard}
              />
              
              <Divider />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">生成的卡片</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {demoCards.map((card, index) => (
                    <ReactCardMessage
                      key={index}
                      cardType={card.cardType}
                      cardData={card.cardData}
                      cardConfig={card.cardConfig}
                      size={selectedSize}
                      theme={selectedTheme}
                      showInDialog={showDialog}
                      onCardAction={handleCardAction}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Tab>

          {/* 响应式演示 */}
          <Tab key="responsive" title="响应式演示">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">响应式布局演示</h3>
                <p className="text-default-500">
                  调整浏览器窗口大小，观察卡片如何自适应调整
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sampleCards.slice(0, 4).map((card, index) => (
                  <ReactCardMessage
                    key={index}
                    cardType={card.cardType}
                    cardData={card.cardData}
                    cardConfig={card.cardConfig}
                    size="auto"
                    theme={selectedTheme}
                    showInDialog={showDialog}
                    onCardAction={handleCardAction}
                  />
                ))}
              </div>

              <div className="bg-default-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">响应式断点说明</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <strong>移动端:</strong> &lt; 480px
                  </div>
                  <div>
                    <strong>平板:</strong> 480px - 768px
                  </div>
                  <div>
                    <strong>桌面:</strong> 768px - 1024px
                  </div>
                  <div>
                    <strong>宽屏:</strong> &gt; 1024px
                  </div>
                </div>
              </div>
            </div>
          </Tab>
        </Tabs>

        {/* 配置设置对话框 */}
        <CardConfigSettings
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
        />
      </div>
    </CardConfigProvider>
  );
};

// 使用卡片配置的演示组件
const ConfigDemo = () => {
  const { globalConfig, cardConfigs, updateGlobalConfig, updateCardConfig } = useCardConfig();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">配置状态</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">全局配置</h4>
          <div className="space-y-2 text-sm">
            <div>默认大小: {globalConfig.defaultSize}</div>
            <div>默认主题: {globalConfig.defaultTheme}</div>
            <div>响应式: {globalConfig.enableResponsive ? '启用' : '禁用'}</div>
            <div>动画: {globalConfig.enableAnimations ? '启用' : '禁用'}</div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">卡片配置</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(cardConfigs).map(([cardType, config]) => (
              <div key={cardType}>
                {cardType}: {Object.keys(config).length} 项配置
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactCardDemo;