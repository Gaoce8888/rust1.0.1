import React, { useState, useRef, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button,
  Chip,
  Divider,
  Spinner
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
import {
  ProductCard,
  UserProfileCard,
  NotificationCard,
  DataCard,
  VoiceMessageCard,
  ActionCard,
  MediaCard,
  FormCard,
  CardContainer,
  CardConfigManager,
  CARD_SIZE_CONFIG,
  CARD_THEME_CONFIG,
  useAdaptiveSize
} from './ReactCardComponents';

// React卡片消息类型
export const ReactCardType = {
  PRODUCT: 'product',
  USER_PROFILE: 'user_profile',
  NOTIFICATION: 'notification',
  DATA: 'data',
  VOICE_MESSAGE: 'voice_message',
  ACTION: 'action',
  MEDIA: 'media',
  FORM: 'form',
  CUSTOM: 'custom'
};

// React卡片消息组件
export const ReactCardMessage = ({
  cardType,
  cardData,
  cardConfig = {},
  size = 'auto',
  theme = 'auto',
  showInDialog = true,
  dialogTitle = '卡片详情',
  className = "",
  onCardAction,
  onCardClose,
  ...props
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const configManager = useRef(new CardConfigManager());

  // 自适应大小
  const adaptiveSize = useAdaptiveSize(containerRef, size, {
    minWidth: 200,
    maxWidth: 600,
    debounceMs: 150
  });

  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const config = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];

  // 处理卡片动作
  const handleCardAction = (action, data) => {
    if (onCardAction) {
      onCardAction(action, data);
    }
    
    // 如果是查看详情动作，打开对话框
    if (action === 'view_details' && showInDialog) {
      setIsDialogOpen(true);
    }
  };

  // 渲染卡片内容
  const renderCard = () => {
    const commonProps = {
      size: finalSize,
      containerRef,
      theme,
      className: `react-card-message ${className}`,
      ...cardConfig,
      ...props
    };

    switch (cardType) {
      case ReactCardType.PRODUCT:
        return (
          <ProductCard
            {...commonProps}
            title={cardData.title}
            price={cardData.price}
            image={cardData.image}
            description={cardData.description}
            rating={cardData.rating}
            onClick={() => handleCardAction('view_details', cardData)}
          />
        );

      case ReactCardType.USER_PROFILE:
        return (
          <UserProfileCard
            {...commonProps}
            avatar={cardData.avatar}
            name={cardData.name}
            email={cardData.email}
            role={cardData.role}
            status={cardData.status}
            onEdit={() => handleCardAction('edit', cardData)}
          />
        );

      case ReactCardType.NOTIFICATION:
        return (
          <NotificationCard
            {...commonProps}
            title={cardData.title}
            message={cardData.message}
            type={cardData.type}
            timestamp={cardData.timestamp}
            onDismiss={() => handleCardAction('dismiss', cardData)}
            onAction={() => handleCardAction('action', cardData)}
          />
        );

      case ReactCardType.DATA:
        return (
          <DataCard
            {...commonProps}
            title={cardData.title}
            value={cardData.value}
            change={cardData.change}
            trend={cardData.trend}
            icon={cardData.icon}
            color={cardData.color}
          />
        );

      case ReactCardType.VOICE_MESSAGE:
        return (
          <VoiceMessageCard
            {...commonProps}
            title={cardData.title}
            duration={cardData.duration}
            isPlaying={cardData.isPlaying}
            onPlay={() => handleCardAction('play', cardData)}
            onPause={() => handleCardAction('pause', cardData)}
          />
        );

      case ReactCardType.ACTION:
        return (
          <ActionCard
            {...commonProps}
            title={cardData.title}
            description={cardData.description}
            actions={cardData.actions?.map(action => ({
              ...action,
              onPress: () => handleCardAction(action.action, { ...cardData, action })
            }))}
          />
        );

      case ReactCardType.MEDIA:
        return (
          <MediaCard
            {...commonProps}
            title={cardData.title}
            mediaUrl={cardData.mediaUrl}
            mediaType={cardData.mediaType}
            description={cardData.description}
            onPlay={() => handleCardAction('play', cardData)}
          />
        );

      case ReactCardType.FORM:
        return (
          <FormCard
            {...commonProps}
            title={cardData.title}
            fields={cardData.fields}
            onSubmit={(formData) => handleCardAction('submit', { ...cardData, formData })}
            submitLabel={cardData.submitLabel}
          />
        );

      case ReactCardType.CUSTOM:
        return (
          <CardContainer
            size={finalSize}
            theme={theme}
            containerRef={containerRef}
            className={className}
          >
            <div 
              className="p-4"
              style={{ 
                fontSize: config.fontSize,
                padding: config.padding 
              }}
            >
              {cardData.content}
            </div>
          </CardContainer>
        );

      default:
        return (
          <CardContainer
            size={finalSize}
            theme={theme}
            containerRef={containerRef}
            className={className}
          >
            <div className="p-4 text-center text-default-500">
              未知的卡片类型: {cardType}
            </div>
          </CardContainer>
        );
    }
  };

  // 渲染对话框内容
  const renderDialogContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* 卡片预览 */}
        <div className="flex justify-center">
          {renderCard()}
        </div>

        {/* 卡片信息 */}
        <Divider />
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-small text-default-500">卡片类型</span>
            <Chip size="sm" variant="flat" color="primary">
              {cardType}
            </Chip>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-small text-default-500">当前大小</span>
            <Chip size="sm" variant="flat">
              {finalSize} ({adaptiveSize.containerWidth}px)
            </Chip>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-small text-default-500">主题</span>
            <Chip size="sm" variant="flat">
              {theme}
            </Chip>
          </div>
        </div>

        {/* 卡片数据 */}
        <Divider />
        
        <div>
          <h4 className="text-small font-medium mb-2">卡片数据</h4>
          <pre className="text-tiny bg-default-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(cardData, null, 2)}
          </pre>
        </div>

        {/* 配置信息 */}
        <Divider />
        
        <div>
          <h4 className="text-small font-medium mb-2">配置信息</h4>
          <pre className="text-tiny bg-default-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(cardConfig, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 卡片内容 */}
      <div 
        ref={containerRef}
        className="react-card-message-container"
        style={{
          width: config.width,
          maxWidth: config.maxWidth,
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {renderCard()}
        
        {/* 查看详情按钮 */}
        {showInDialog && (
          <div className="flex justify-center mt-2">
            <Button
              size="sm"
              variant="light"
              startContent={<Icon icon="solar:eye-linear" width={16} />}
              onPress={() => setIsDialogOpen(true)}
            >
              查看详情
            </Button>
          </div>
        )}
      </div>

      {/* 详情对话框 */}
      {showInDialog && (
        <Modal 
          isOpen={isDialogOpen} 
          onClose={() => {
            setIsDialogOpen(false);
            onCardClose?.();
          }}
          size="2xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center gap-2">
                <Icon icon="solar:widget-linear" width={20} />
                <span>{dialogTitle}</span>
              </div>
            </ModalHeader>
            
            <ModalBody>
              {renderDialogContent()}
            </ModalBody>
            
            <ModalFooter>
              <Button 
                variant="light" 
                onPress={() => setIsDialogOpen(false)}
              >
                关闭
              </Button>
              
              <Button 
                color="primary"
                onPress={() => {
                  handleCardAction('interact', cardData);
                  setIsDialogOpen(false);
                }}
              >
                交互
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

// React卡片消息列表组件
export const ReactCardMessageList = ({
  cards = [],
  size = 'auto',
  theme = 'auto',
  layout = 'grid', // grid, list, masonry
  columns = 2,
  gap = 16,
  className = "",
  onCardAction,
  ...props
}) => {
  const containerRef = useRef(null);
  const adaptiveSize = useAdaptiveSize(containerRef, size);

  const getLayoutStyle = () => {
    switch (layout) {
      case 'grid':
        return {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`
        };
      case 'list':
        return {
          display: 'flex',
          flexDirection: 'column',
          gap: `${gap}px`
        };
      case 'masonry':
        return {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
          gridAutoRows: 'masonry'
        };
      default:
        return {};
    }
  };

  return (
    <div
      ref={containerRef}
      className={`react-card-message-list ${className}`}
      style={getLayoutStyle()}
      {...props}
    >
      {cards.map((card, index) => (
        <ReactCardMessage
          key={`${card.cardType}-${index}`}
          cardType={card.cardType}
          cardData={card.cardData}
          cardConfig={card.cardConfig}
          size={size}
          theme={theme}
          onCardAction={onCardAction}
        />
      ))}
    </div>
  );
};

// React卡片消息生成器
export const ReactCardMessageGenerator = ({
  onGenerate,
  className = "",
  ...props
}) => {
  const [selectedType, setSelectedType] = useState(ReactCardType.PRODUCT);
  const [cardData, setCardData] = useState({});
  const [cardConfig, setCardConfig] = useState({});

  // 默认卡片数据模板
  const getDefaultCardData = (type) => {
    switch (type) {
      case ReactCardType.PRODUCT:
        return {
          title: '示例产品',
          price: 99.99,
          image: 'https://via.placeholder.com/300x200',
          description: '这是一个示例产品描述',
          rating: 4.5
        };
      case ReactCardType.USER_PROFILE:
        return {
          avatar: 'https://via.placeholder.com/100x100',
          name: '示例用户',
          email: 'user@example.com',
          role: '客户',
          status: 'online'
        };
      case ReactCardType.NOTIFICATION:
        return {
          title: '通知标题',
          message: '这是一个示例通知消息',
          type: 'info',
          timestamp: new Date().toISOString()
        };
      case ReactCardType.DATA:
        return {
          title: '数据指标',
          value: 1234,
          change: 12.5,
          trend: 'up',
          icon: '📊',
          color: 'primary'
        };
      case ReactCardType.VOICE_MESSAGE:
        return {
          title: '语音消息',
          duration: 120,
          isPlaying: false
        };
      case ReactCardType.ACTION:
        return {
          title: '操作卡片',
          description: '包含多个操作按钮的卡片',
          actions: [
            { label: '确认', action: 'confirm', color: 'primary' },
            { label: '取消', action: 'cancel', color: 'default' }
          ]
        };
      case ReactCardType.MEDIA:
        return {
          title: '媒体内容',
          mediaUrl: 'https://via.placeholder.com/400x300',
          mediaType: 'image',
          description: '媒体内容描述'
        };
      case ReactCardType.FORM:
        return {
          title: '表单卡片',
          fields: [
            { name: 'name', label: '姓名', type: 'text', required: true },
            { name: 'email', label: '邮箱', type: 'text', required: true }
          ],
          submitLabel: '提交'
        };
      default:
        return {};
    }
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setCardData(getDefaultCardData(type));
  };

  const handleGenerate = () => {
    onGenerate?.({
      cardType: selectedType,
      cardData,
      cardConfig
    });
  };

  return (
    <div className={`react-card-generator ${className}`} {...props}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">生成React卡片</h3>
          <p className="text-small text-default-500">
            选择卡片类型并配置数据，然后生成卡片消息
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-small font-medium mb-2 block">卡片类型</label>
            <select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full p-2 border border-divider rounded-md bg-content1"
            >
              {Object.entries(ReactCardType).map(([key, value]) => (
                <option key={value} value={value}>
                  {key.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            color="primary"
            onPress={handleGenerate}
            startContent={<Icon icon="solar:magic-stick-linear" width={16} />}
          >
            生成卡片
          </Button>
          
          <Button
            variant="bordered"
            onPress={() => {
              setCardData(getDefaultCardData(selectedType));
              setCardConfig({});
            }}
          >
            重置数据
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReactCardMessage;