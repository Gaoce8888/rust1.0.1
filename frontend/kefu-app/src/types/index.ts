// 导入客户端的基础类型
export * from '../../../kehu-app/src/types';

// 客服端专用类型扩展

// 客服人员类型
export interface Agent extends User {
  role: 'agent' | 'admin' | 'supervisor';
  department: string;
  skills: string[];
  maxConcurrentSessions: number;
  currentSessionCount: number;
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  status: 'online' | 'offline' | 'away' | 'busy';
  lastActivity: string;
  performance: AgentPerformance;
}

// 客服绩效统计
export interface AgentPerformance {
  totalSessions: number;
  avgResponseTime: number; // 秒
  avgSessionDuration: number; // 秒
  customerSatisfactionScore: number; // 1-5
  resolutionRate: number; // 0-1
  handledToday: number;
  handledThisWeek: number;
  handledThisMonth: number;
}

// 扩展会话类型，增加客服相关字段
export interface AgentChatSession extends ChatSession {
  assignedAgent?: Agent;
  queuePosition?: number;
  estimatedWaitTime?: number;
  customerInfo: CustomerInfo;
  sessionNotes: SessionNote[];
  transferHistory: TransferRecord[];
  escalationLevel: 'none' | 'level1' | 'level2' | 'level3';
  internalNotes: string;
  crmId?: string;
  ticketId?: string;
}

// 客户信息
export interface CustomerInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  previousSessions: number;
  lastContact?: string;
  preferredLanguage: string;
  timezone: string;
  customFields: Record<string, any>;
}

// 会话笔记
export interface SessionNote {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: string;
  type: 'note' | 'internal' | 'escalation' | 'resolution';
  tags: string[];
}

// 转接记录
export interface TransferRecord {
  id: string;
  fromAgent: Agent;
  toAgent?: Agent;
  toDepartment?: string;
  reason: string;
  timestamp: string;
  notes?: string;
}

// 队列状态
export interface QueueStatus {
  totalWaiting: number;
  avgWaitTime: number;
  longestWaitTime: number;
  availableAgents: number;
  busyAgents: number;
  departmentQueues: DepartmentQueue[];
}

// 部门队列
export interface DepartmentQueue {
  department: string;
  waiting: number;
  avgWaitTime: number;
  availableAgents: number;
  sessions: AgentChatSession[];
}

// 实时监控数据
export interface RealtimeMetrics {
  activeSessions: number;
  queueLength: number;
  avgResponseTime: number;
  agentUtilization: number;
  customerSatisfaction: number;
  peakTrafficTime: string;
  trending: {
    sessionsLast24h: number[];
    responseTimeLast24h: number[];
  };
}

// 客服工作台状态
export interface AgentWorkspace {
  agent: Agent;
  activeSessions: AgentChatSession[];
  pendingSessions: AgentChatSession[];
  recentSessions: AgentChatSession[];
  knowledgeBase: KnowledgeArticle[];
  quickReplies: QuickReply[];
  notifications: AgentNotification[];
  settings: AgentSettings;
}

// 知识库文章
export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  popularity: number;
  lastUpdated: string;
  author: string;
  helpfulCount: number;
  searchKeywords: string[];
}

// 快捷回复
export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
  hotkey?: string;
  usage: number;
  lastUsed?: string;
  isPersonal: boolean;
  tags: string[];
}

// 客服通知
export interface AgentNotification extends Notification {
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'session' | 'system' | 'escalation' | 'queue' | 'performance';
  sessionId?: string;
  customerId?: string;
  requiresAction: boolean;
  actionUrl?: string;
}

// 客服设置
export interface AgentSettings {
  autoAcceptSessions: boolean;
  maxConcurrentSessions: number;
  awayAfterInactivity: number; // 分钟
  playSoundNotifications: boolean;
  showDesktopNotifications: boolean;
  autoExpandNewSessions: boolean;
  defaultQuickReplies: string[];
  signature: string;
  workingHours: {
    enabled: boolean;
    schedule: WeeklySchedule;
  };
  breakSchedule: BreakTime[];
}

// 工作时间表
export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start: string; // HH:mm format
  end: string;
  breaks: BreakTime[];
}

export interface BreakTime {
  start: string;
  end: string;
  title: string;
}

// 客服操作日志
export interface AgentAction {
  id: string;
  agentId: string;
  sessionId?: string;
  action: 'login' | 'logout' | 'session_accept' | 'session_transfer' | 'session_close' | 'break_start' | 'break_end' | 'status_change';
  timestamp: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

// 客服报告数据
export interface AgentReport {
  period: {
    start: string;
    end: string;
  };
  agent: Agent;
  metrics: {
    totalSessions: number;
    avgSessionDuration: number;
    avgResponseTime: number;
    firstResponseTime: number;
    resolutionRate: number;
    transferRate: number;
    customerSatisfaction: number;
    activeTime: number; // 分钟
    idleTime: number; // 分钟
  };
  dailyBreakdown: DailyMetrics[];
  topIssues: IssueMetric[];
  customerFeedback: CustomerFeedback[];
}

export interface DailyMetrics {
  date: string;
  sessions: number;
  duration: number;
  satisfaction: number;
}

export interface IssueMetric {
  category: string;
  count: number;
  avgResolutionTime: number;
}

export interface CustomerFeedback {
  sessionId: string;
  rating: number;
  comment?: string;
  timestamp: string;
}

// 升级配置
export interface EscalationRule {
  id: string;
  name: string;
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  priority: number;
  enabled: boolean;
}

export interface EscalationCondition {
  type: 'wait_time' | 'agent_unavailable' | 'customer_rating' | 'keyword' | 'session_count';
  operator: 'gt' | 'lt' | 'eq' | 'contains';
  value: any;
}

export interface EscalationAction {
  type: 'transfer_department' | 'assign_agent' | 'send_notification' | 'create_ticket';
  target: string;
  message?: string;
}

// 系统配置
export interface SystemConfig {
  maxSessionsPerAgent: number;
  maxWaitTimeMinutes: number;
  autoAssignSessions: boolean;
  enableVideoChat: boolean;
  enableVoiceChat: boolean;
  enableFileTransfer: boolean;
  allowedFileTypes: string[];
  maxFileSize: number;
  sessionTimeout: number;
  escalationRules: EscalationRule[];
  workingHours: WeeklySchedule;
  supportedLanguages: string[];
  integrations: {
    crm: boolean;
    ticketing: boolean;
    analytics: boolean;
  };
}