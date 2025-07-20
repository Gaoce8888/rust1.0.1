// 企业级组件索引文件

// 核心组件
export { default as EnterpriseCore } from './EnterpriseCore';
export { default as EnterpriseNotifications } from './EnterpriseNotifications';
export { default as EnterpriseWebSocket } from './EnterpriseWebSocket';
export { default as EnterpriseDashboard } from './EnterpriseDashboard';

// AI功能组件
export { default as EnterpriseAI } from './EnterpriseAI';
export { default as EnterpriseAIExample } from './EnterpriseAIExample';

// 模板管理组件
export { default as EnterpriseTemplateManager } from './EnterpriseTemplateManager';
export { default as TemplateManagerComponent } from './TemplateManager';

// IP位置组件
export { default as EnterpriseIpLocation } from './EnterpriseIpLocation';
export { default as IpLocationExample } from './IpLocationExample';

// 导出管理器实例
export { templateManager } from './EnterpriseTemplateManager';
export { ipLocationManager } from './EnterpriseIpLocation';
export { notificationManager } from './EnterpriseNotifications';

// 导出Hook
export { useTemplateManager } from './EnterpriseTemplateManager';
export { useIpLocation } from './EnterpriseIpLocation';

// 导出类型和类
export { 
  VariableType, 
  TemplateVariable, 
  HtmlTemplate 
} from './EnterpriseTemplateManager';

export { 
  IpLocationQuery, 
  IpLocationResponse, 
  ClientRegisterInfo 
} from './EnterpriseIpLocation';

// 导出通知类型
export { 
  NotificationType, 
  NotificationPriority 
} from './EnterpriseNotifications';