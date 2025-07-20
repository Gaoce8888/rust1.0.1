import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  OptimizedPortal, 
  useOptimizedCache, 
  useDebounce, 
  useThrottle,
  PerformanceMonitor,
  ErrorBoundary
} from './EnterpriseCore';
import { notificationManager, NotificationType, NotificationPriority } from './EnterpriseNotifications';
import './EnterpriseTemplateManager.css';

// 模板变量类型枚举 - 与后端VariableType对应
export const VariableType = {
  STRING: 'String',
  NUMBER: 'Number',
  BOOLEAN: 'Boolean',
  DATE: 'Date',
  URL: 'Url',
  EMAIL: 'Email',
  JSON: 'Json',
  ARRAY: 'Array'
};

// 模板变量结构 - 与后端TemplateVariable对应
export class TemplateVariable {
  constructor(name, varType, defaultValue = null, required = false, description = '', validation = '') {
    this.name = name;
    this.var_type = varType;
    this.default_value = defaultValue;
    this.required = required;
    this.description = description;
    this.validation = validation;
  }
}

// HTML模板结构 - 与后端HtmlTemplate对应
export class HtmlTemplate {
  constructor(id, name, description = '', category = 'default', content = '', variables = [], css = '', javascript = '', createdBy = '') {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
    this.content = content;
    this.variables = variables;
    this.css = css;
    this.javascript = javascript;
    this.thumbnail = null;
    this.is_active = true;
    this.created_by = createdBy;
    this.created_at = new Date();
    this.updated_at = new Date();
    this.version = 1;
    this.tags = [];
    this.usage_count = 0;
  }
}

// 模板管理器类
export class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.callbacks = new Map();
    this.eventListeners = new Map();
    this.apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:6006';
  }

  // 获取模板列表
  async getTemplateList(request = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/template/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: request.category || null,
          tags: request.tags || null,
          created_by: request.createdBy || null,
          is_active: request.isActive !== undefined ? request.isActive : null,
          page: request.page || 1,
          limit: request.limit || 20,
          sort_by: request.sortBy || 'created_at',
          sort_order: request.sortOrder || 'desc',
          search: request.search || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取模板列表失败:', error);
      throw error;
    }
  }

  // 获取单个模板
  async getTemplate(templateId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/template/get/${templateId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取模板失败:', error);
      throw error;
    }
  }

  // 创建模板
  async createTemplate(templateData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/template/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('创建模板失败:', error);
      throw error;
    }
  }

  // 更新模板
  async updateTemplate(templateId, updateData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/template/update/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('更新模板失败:', error);
      throw error;
    }
  }

  // 删除模板
  async deleteTemplate(templateId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/template/delete/${templateId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('删除模板失败:', error);
      throw error;
    }
  }

  // 渲染模板
  async renderTemplate(templateId, variables = {}, userId = '') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/template/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: templateId,
          variables: variables,
          user_id: userId,
          callback_url: null,
          callback_data: null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('渲染模板失败:', error);
      throw error;
    }
  }

  // 预览模板
  async previewTemplate(templateId, variables = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/template/preview/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variables })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('预览模板失败:', error);
      throw error;
    }
  }

  // 获取统计信息
  async getStatistics() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/template/statistics`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  // 事件系统
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`事件处理器错误 [${event}]:`, error);
        }
      });
    }
  }
}

// 全局模板管理器实例
export const templateManager = new TemplateManager();

// 模板编辑器组件
export const TemplateEditor = React.memo(({ 
  template = null, 
  onSave, 
  onCancel,
  className = "" 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'default',
    content: '',
    css: '',
    javascript: '',
    variables: [],
    tags: [],
    is_active: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'default',
        content: template.content || '',
        css: template.css || '',
        javascript: template.javascript || '',
        variables: template.variables || [],
        tags: template.tags || [],
        is_active: template.is_active !== undefined ? template.is_active : true
      });
    }
  }, [template]);

  // 处理表单变化
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 添加变量
  const addVariable = useCallback(() => {
    const newVariable = new TemplateVariable(
      `variable_${formData.variables.length + 1}`,
      VariableType.STRING,
      '',
      false,
      '',
      ''
    );
    
    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable]
    }));
  }, [formData.variables.length]);

  // 更新变量
  const updateVariable = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((var_, i) => 
        i === index ? { ...var_, [field]: value } : var_
      )
    }));
  }, []);

  // 删除变量
  const removeVariable = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  }, []);

  // 预览模板
  const handlePreview = useCallback(async () => {
    try {
      setIsLoading(true);
      const html = await templateManager.previewTemplate(template?.id || 'preview', {});
      setPreviewHtml(html);
      setShowPreview(true);
    } catch (error) {
      notificationManager.add({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '预览失败',
        message: error.message,
        autoDismiss: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [template?.id]);

  // 保存模板
  const handleSave = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const templateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        content: formData.content,
        variables: formData.variables,
        css: formData.css,
        javascript: formData.javascript,
        created_by: 'current_user', // 应该从用户上下文获取
        tags: formData.tags
      };

      let result;
      if (template) {
        result = await templateManager.updateTemplate(template.id, templateData);
      } else {
        result = await templateManager.createTemplate(templateData);
      }

      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '保存成功',
        message: `模板 "${formData.name}" 已保存`,
        autoDismiss: true,
        dismissDelay: 3000
      });

      onSave?.(result);
    } catch (error) {
      notificationManager.add({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '保存失败',
        message: error.message,
        autoDismiss: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, template, onSave]);

  return (
    <ErrorBoundary>
      <div className={`template-editor ${className}`}>
        <div className="editor-header">
          <h3>{template ? '编辑模板' : '创建模板'}</h3>
          <div className="editor-actions">
            <button 
              onClick={handlePreview}
              disabled={isLoading}
              className="preview-btn"
            >
              👁️ 预览
            </button>
            <button 
              onClick={handleSave}
              disabled={isLoading || !formData.name.trim()}
              className="save-btn"
            >
              {isLoading ? '保存中...' : '💾 保存'}
            </button>
            <button 
              onClick={onCancel}
              disabled={isLoading}
              className="cancel-btn"
            >
              ❌ 取消
            </button>
          </div>
        </div>

        <div className="editor-content">
          <div className="form-section">
            <h4>基本信息</h4>
            <div className="form-row">
              <label>模板名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="输入模板名称"
                required
              />
            </div>
            
            <div className="form-row">
              <label>描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="输入模板描述"
                rows="3"
              />
            </div>

            <div className="form-row">
              <label>分类</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="default">默认</option>
                <option value="notification">通知</option>
                <option value="form">表单</option>
                <option value="card">卡片</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div className="form-row">
              <label>标签</label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                placeholder="用逗号分隔标签"
              />
            </div>
          </div>

          <div className="form-section">
            <h4>HTML内容</h4>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="输入HTML内容，使用 {{变量名}} 语法"
              rows="10"
              className="code-editor"
            />
          </div>

          <div className="form-section">
            <h4>CSS样式</h4>
            <textarea
              value={formData.css}
              onChange={(e) => handleInputChange('css', e.target.value)}
              placeholder="输入CSS样式"
              rows="6"
              className="code-editor"
            />
          </div>

          <div className="form-section">
            <h4>JavaScript</h4>
            <textarea
              value={formData.javascript}
              onChange={(e) => handleInputChange('javascript', e.target.value)}
              placeholder="输入JavaScript代码"
              rows="6"
              className="code-editor"
            />
          </div>

          <div className="form-section">
            <h4>模板变量</h4>
            <div className="variables-list">
              {formData.variables.map((variable, index) => (
                <div key={index} className="variable-item">
                  <div className="variable-header">
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => updateVariable(index, 'name', e.target.value)}
                      placeholder="变量名"
                      className="variable-name"
                    />
                    <select
                      value={variable.var_type}
                      onChange={(e) => updateVariable(index, 'var_type', e.target.value)}
                      className="variable-type"
                    >
                      {Object.values(VariableType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeVariable(index)}
                      className="remove-variable-btn"
                    >
                      ❌
                    </button>
                  </div>
                  <div className="variable-details">
                    <input
                      type="text"
                      value={variable.default_value || ''}
                      onChange={(e) => updateVariable(index, 'default_value', e.target.value)}
                      placeholder="默认值"
                      className="variable-default"
                    />
                    <input
                      type="text"
                      value={variable.description || ''}
                      onChange={(e) => updateVariable(index, 'description', e.target.value)}
                      placeholder="描述"
                      className="variable-description"
                    />
                    <label className="variable-required">
                      <input
                        type="checkbox"
                        checked={variable.required}
                        onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                      />
                      必填
                    </label>
                  </div>
                </div>
              ))}
              <button onClick={addVariable} className="add-variable-btn">
                ➕ 添加变量
              </button>
            </div>
          </div>
        </div>

        {showPreview && (
          <OptimizedPortal>
            <div className="preview-modal-overlay">
              <div className="preview-modal">
                <div className="preview-header">
                  <h3>模板预览</h3>
                  <button onClick={() => setShowPreview(false)}>❌</button>
                </div>
                <div className="preview-content">
                  <iframe
                    srcDoc={previewHtml}
                    title="模板预览"
                    className="preview-iframe"
                  />
                </div>
              </div>
            </div>
          </OptimizedPortal>
        )}
      </div>
    </ErrorBoundary>
  );
});

// 模板列表组件
export const TemplateList = React.memo(({ 
  templates = [], 
  onSelect, 
  onEdit, 
  onDelete,
  onRender,
  className = "" 
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [renderVariables, setRenderVariables] = useState({});
  const [showRenderModal, setShowRenderModal] = useState(false);

  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplate(template);
    onSelect?.(template);
  }, [onSelect]);

  const handleRender = useCallback(async () => {
    if (!selectedTemplate) return;

    try {
      const result = await templateManager.renderTemplate(
        selectedTemplate.id,
        renderVariables,
        'current_user'
      );

      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '渲染成功',
        message: `模板 "${selectedTemplate.name}" 已渲染`,
        autoDismiss: true,
        dismissDelay: 3000
      });

      onRender?.(result);
      setShowRenderModal(false);
    } catch (error) {
      notificationManager.add({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '渲染失败',
        message: error.message,
        autoDismiss: false
      });
    }
  }, [selectedTemplate, renderVariables, onRender]);

  return (
    <div className={`template-list ${className}`}>
      <div className="list-header">
        <h3>模板列表 ({templates.length})</h3>
        <div className="list-actions">
          <button 
            onClick={() => setShowRenderModal(true)}
            disabled={!selectedTemplate}
            className="render-btn"
          >
            🎨 渲染
          </button>
        </div>
      </div>

      <div className="templates-grid">
        {templates.map(template => (
          <div 
            key={template.id}
            className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="template-header">
              <h4>{template.name}</h4>
              <div className="template-meta">
                <span className="category">{template.category}</span>
                <span className="usage">使用 {template.usage_count} 次</span>
              </div>
            </div>
            
            <div className="template-content">
              <p>{template.description || '暂无描述'}</p>
              <div className="template-tags">
                {template.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>

            <div className="template-actions">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(template);
                }}
                className="edit-btn"
              >
                ✏️ 编辑
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(template);
                }}
                className="delete-btn"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {showRenderModal && selectedTemplate && (
        <OptimizedPortal>
          <div className="render-modal-overlay">
            <div className="render-modal">
              <div className="render-header">
                <h3>渲染模板: {selectedTemplate.name}</h3>
                <button onClick={() => setShowRenderModal(false)}>❌</button>
              </div>
              <div className="render-content">
                <div className="variables-form">
                  <h4>模板变量</h4>
                  {selectedTemplate.variables.map(variable => (
                    <div key={variable.name} className="variable-input">
                      <label>
                        {variable.name}
                        {variable.required && <span className="required">*</span>}
                      </label>
                      <input
                        type="text"
                        value={renderVariables[variable.name] || variable.default_value || ''}
                        onChange={(e) => setRenderVariables(prev => ({
                          ...prev,
                          [variable.name]: e.target.value
                        }))}
                        placeholder={variable.description || `输入 ${variable.name}`}
                        required={variable.required}
                      />
                    </div>
                  ))}
                </div>
                <div className="render-actions">
                  <button onClick={handleRender} className="render-confirm-btn">
                    🎨 确认渲染
                  </button>
                  <button onClick={() => setShowRenderModal(false)} className="cancel-btn">
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </OptimizedPortal>
      )}
    </div>
  );
});

// 主模板管理器组件
export const EnterpriseTemplateManager = React.memo(({ className = "" }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('list');

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await templateManager.getTemplateList({
        page: 1,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      setTemplates(result.templates || []);
    } catch (error) {
      notificationManager.add({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '加载失败',
        message: '无法加载模板列表',
        autoDismiss: false
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载统计信息
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await templateManager.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadTemplates();
    loadStatistics();
  }, [loadTemplates, loadStatistics]);

  // 处理模板选择
  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplate(template);
  }, []);

  // 处理模板编辑
  const handleTemplateEdit = useCallback((template) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setActiveTab('editor');
  }, []);

  // 处理模板删除
  const handleTemplateDelete = useCallback(async (template) => {
    if (!confirm(`确定要删除模板 "${template.name}" 吗？`)) {
      return;
    }

    try {
      await templateManager.deleteTemplate(template.id);
      
      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '删除成功',
        message: `模板 "${template.name}" 已删除`,
        autoDismiss: true,
        dismissDelay: 3000
      });

      loadTemplates();
    } catch (error) {
      notificationManager.add({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '删除失败',
        message: error.message,
        autoDismiss: false
      });
    }
  }, [loadTemplates]);

  // 处理模板保存
  const handleTemplateSave = useCallback((savedTemplate) => {
    setIsEditing(false);
    setSelectedTemplate(null);
    setActiveTab('list');
    loadTemplates();
  }, [loadTemplates]);

  // 处理模板渲染
  const handleTemplateRender = useCallback((renderResult) => {
    console.log('模板渲染结果:', renderResult);
    // 这里可以处理渲染结果，比如发送到聊天窗口
  }, []);

  return (
    <PerformanceMonitor componentName="EnterpriseTemplateManager">
      <div className={`enterprise-template-manager ${className}`}>
        <div className="manager-header">
          <h2>🎨 HTML模板管理器</h2>
          <div className="header-actions">
            <button 
              onClick={() => {
                setSelectedTemplate(null);
                setIsEditing(true);
                setActiveTab('editor');
              }}
              className="create-btn"
            >
              ➕ 创建模板
            </button>
          </div>
        </div>

        <div className="manager-tabs">
          <button
            className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            📋 模板列表
          </button>
          <button
            className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            ✏️ 模板编辑器
          </button>
          <button
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 统计信息
          </button>
        </div>

        <div className="manager-content">
          {activeTab === 'list' && (
            <TemplateList
              templates={templates}
              onSelect={handleTemplateSelect}
              onEdit={handleTemplateEdit}
              onDelete={handleTemplateDelete}
              onRender={handleTemplateRender}
            />
          )}

          {activeTab === 'editor' && (
            <TemplateEditor
              template={selectedTemplate}
              onSave={handleTemplateSave}
              onCancel={() => {
                setIsEditing(false);
                setSelectedTemplate(null);
                setActiveTab('list');
              }}
            />
          )}

          {activeTab === 'stats' && (
            <div className="statistics-panel">
              <h3>模板统计</h3>
              {statistics ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{statistics.total_templates}</div>
                    <div className="stat-label">总模板数</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{statistics.active_templates}</div>
                    <div className="stat-label">活跃模板</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{statistics.total_usage}</div>
                    <div className="stat-label">总使用次数</div>
                  </div>
                </div>
              ) : (
                <p>加载统计信息中...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </PerformanceMonitor>
  );
});

// Hook for using template manager
export const useTemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTemplates = useCallback(async (request = {}) => {
    try {
      setIsLoading(true);
      const result = await templateManager.getTemplateList(request);
      setTemplates(result.templates || []);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderTemplate = useCallback(async (templateId, variables = {}, userId = '') => {
    try {
      return await templateManager.renderTemplate(templateId, variables, userId);
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    templates,
    isLoading,
    loadTemplates,
    renderTemplate,
    templateManager
  };
};

export default EnterpriseTemplateManager;