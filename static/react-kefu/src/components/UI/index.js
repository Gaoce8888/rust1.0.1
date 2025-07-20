// UI 基础组件统一导出
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Modal } from './Modal';
export { default as Card } from './Card';
export { default as Toast, ToastContainer } from './Toast';
export { default as Loading, PageLoading, ContentLoading, ButtonLoading } from './Loading';
export { default as Avatar, AvatarGroup } from './Avatar';
export { default as Badge, StatusBadge, NumberBadge } from './Badge';

// 组件使用示例和文档
export const UIComponents = {
  Button: {
    description: '通用按钮组件，支持多种样式变体和状态',
    props: {
      variant: 'primary | secondary | success | danger | warning | outline | ghost',
      size: 'small | medium | large',
      isLoading: 'boolean',
      isDisabled: 'boolean',
      leftIcon: 'ReactNode',
      rightIcon: 'ReactNode'
    },
    example: `
      <Button variant="primary" size="medium" leftIcon={<Icon />}>
        点击按钮
      </Button>
    `
  },
  
  Input: {
    description: '通用输入组件，支持多种输入类型和验证状态',
    props: {
      type: 'text | email | password | number | tel | url',
      variant: 'bordered | flat | faded | underlined',
      size: 'small | medium | large',
      error: 'string',
      helpText: 'string',
      leftIcon: 'ReactNode',
      rightIcon: 'ReactNode'
    },
    example: `
      <Input 
        label="邮箱" 
        placeholder="请输入邮箱"
        type="email"
        error={errors.email}
      />
    `
  },
  
  Modal: {
    description: '通用模态框组件，支持自定义内容和操作按钮',
    props: {
      isOpen: 'boolean',
      onClose: 'function',
      title: 'string',
      size: 'small | medium | large | xl | full',
      confirmText: 'string',
      cancelText: 'string',
      onConfirm: 'function',
      onCancel: 'function'
    },
    example: `
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title="确认操作"
        onConfirm={handleConfirm}
      >
        确定要执行此操作吗？
      </Modal>
    `
  },
  
  Card: {
    description: '通用卡片组件，支持头部、内容和底部区域',
    props: {
      title: 'string',
      subtitle: 'string',
      shadow: 'none | small | medium | large',
      radius: 'none | small | medium | large',
      hoverable: 'boolean',
      clickable: 'boolean'
    },
    example: `
      <Card 
        title="卡片标题"
        subtitle="卡片副标题"
        hoverable
        footer={<Button>操作</Button>}
      >
        卡片内容
      </Card>
    `
  },
  
  Toast: {
    description: 'Toast通知组件，支持不同类型的消息提示',
    props: {
      type: 'success | error | warning | info',
      duration: 'number',
      position: 'top-right | top-left | bottom-right | bottom-left | top-center | bottom-center',
      showIcon: 'boolean',
      closable: 'boolean'
    },
    example: `
      <Toast 
        message="操作成功！"
        type="success"
        duration={3000}
        onClose={handleClose}
      />
    `
  },
  
  Loading: {
    description: 'Loading加载组件，支持多种加载样式和大小',
    props: {
      size: 'small | medium | large | xl',
      color: 'primary | secondary | success | warning | danger',
      type: 'spinner | dots | pulse | heroui',
      text: 'string',
      overlay: 'boolean'
    },
    example: `
      <Loading 
        size="large"
        text="加载中..."
        type="spinner"
      />
    `
  },
  
  Avatar: {
    description: 'Avatar头像组件，支持图片、姓名缩写和在线状态显示',
    props: {
      src: 'string',
      name: 'string',
      size: 'small | medium | large | xl',
      shape: 'circle | square | rounded',
      status: 'online | offline | away | busy',
      showBorder: 'boolean'
    },
    example: `
      <Avatar 
        src="/avatar.jpg"
        name="用户名"
        size="medium"
        status="online"
      />
    `
  },
  
  Badge: {
    description: 'Badge徽章组件，支持数字、文本和状态显示',
    props: {
      content: 'string | number',
      color: 'primary | secondary | success | warning | danger',
      variant: 'solid | flat | bordered | light',
      size: 'small | medium | large',
      dot: 'boolean',
      max: 'number'
    },
    example: `
      <Badge content={5} color="danger">
        <Bell />
      </Badge>
    `
  }
};