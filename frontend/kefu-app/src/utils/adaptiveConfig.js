/**
 * 自适应配置管理器
 * 用于管理React卡片的自适应设置和配置机制
 */

// 默认自适应配置
const DEFAULT_ADAPTIVE_CONFIG = {
  enabled: true,
  minWidth: 200,
  maxWidth: 800,
  minHeight: 100,
  maxHeight: 600,
  mode: 'fit', // fit, scroll, scale
  containerType: 'dialog', // dialog, modal, inline
  breakpoints: {
    '768': { fontSize: '14px', padding: '8px' },
    '480': { fontSize: '12px', padding: '4px' }
  },
  customClasses: ['adaptive-card', 'responsive']
};

// 自适应模式配置
const ADAPTIVE_MODES = {
  fit: {
    description: '适应容器大小',
    css: {
      width: '100%',
      height: 'auto',
      objectFit: 'contain'
    }
  },
  scroll: {
    description: '滚动模式',
    css: {
      width: '100%',
      height: '100%',
      overflow: 'auto'
    }
  },
  scale: {
    description: '缩放模式',
    css: {
      width: '100%',
      height: '100%',
      transform: 'scale(1)',
      transformOrigin: 'top left'
    }
  }
};

// 容器类型配置
const CONTAINER_TYPES = {
  dialog: {
    description: '对话框容器',
    css: {
      position: 'relative',
      margin: '10px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }
  },
  modal: {
    description: '模态框容器',
    css: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000
    }
  },
  inline: {
    description: '内联容器',
    css: {
      display: 'inline-block',
      verticalAlign: 'top'
    }
  }
};

/**
 * 自适应配置管理器类
 */
class AdaptiveConfigManager {
  constructor() {
    this.config = this.loadConfig();
    this.listeners = new Set();
  }

  /**
   * 加载配置
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem('adaptiveConfig');
      return saved ? { ...DEFAULT_ADAPTIVE_CONFIG, ...JSON.parse(saved) } : DEFAULT_ADAPTIVE_CONFIG;
    } catch (error) {
      console.warn('加载自适应配置失败，使用默认配置:', error);
      return DEFAULT_ADAPTIVE_CONFIG;
    }
  }

  /**
   * 保存配置
   */
  saveConfig(config) {
    try {
      this.config = { ...this.config, ...config };
      localStorage.setItem('adaptiveConfig', JSON.stringify(this.config));
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('保存自适应配置失败:', error);
      return false;
    }
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates) {
    return this.saveConfig(updates);
  }

  /**
   * 重置为默认配置
   */
  resetConfig() {
    return this.saveConfig(DEFAULT_ADAPTIVE_CONFIG);
  }

  /**
   * 获取自适应模式信息
   */
  getAdaptiveModes() {
    return ADAPTIVE_MODES;
  }

  /**
   * 获取容器类型信息
   */
  getContainerTypes() {
    return CONTAINER_TYPES;
  }

  /**
   * 生成自适应样式
   */
  generateAdaptiveStyles(containerId, customConfig = {}) {
    const config = { ...this.config, ...customConfig };
    const styles = [];

    // 基础容器样式
    styles.push(`.adaptive-container-${containerId} {`);

    // 尺寸限制
    if (config.minWidth) {
      styles.push(`  min-width: ${config.minWidth}px;`);
    }
    if (config.maxWidth) {
      styles.push(`  max-width: ${config.maxWidth}px;`);
    }
    if (config.minHeight) {
      styles.push(`  min-height: ${config.minHeight}px;`);
    }
    if (config.maxHeight) {
      styles.push(`  max-height: ${config.maxHeight}px;`);
    }

    // 自适应模式样式
    const modeConfig = ADAPTIVE_MODES[config.mode];
    if (modeConfig) {
      Object.entries(modeConfig.css).forEach(([property, value]) => {
        styles.push(`  ${property}: ${value};`);
      });
    }

    // 容器类型样式
    const containerConfig = CONTAINER_TYPES[config.containerType];
    if (containerConfig) {
      Object.entries(containerConfig.css).forEach(([property, value]) => {
        styles.push(`  ${property}: ${value};`);
      });
    }

    // 自定义CSS类
    if (config.customClasses) {
      config.customClasses.forEach(className => {
        styles.push(`  /* 自定义类: ${className} */`);
      });
    }

    styles.push('}');

    // 响应式断点
    if (config.breakpoints) {
      Object.entries(config.breakpoints).forEach(([breakpoint, breakpointConfig]) => {
        styles.push(`@media (max-width: ${breakpoint}px) {`);
        styles.push(`  .adaptive-container-${containerId} {`);
        if (typeof breakpointConfig === 'object') {
          Object.entries(breakpointConfig).forEach(([property, value]) => {
            styles.push(`    ${property}: ${value};`);
          });
        }
        styles.push('  }');
        styles.push('}');
      });
    }

    return styles.join('\n');
  }

  /**
   * 计算最佳尺寸
   */
  calculateOptimalSize(containerWidth, containerHeight, contentWidth, contentHeight) {
    const config = this.config;
    let optimalWidth = contentWidth;
    let optimalHeight = contentHeight;

    // 根据模式计算最佳尺寸
    switch (config.mode) {
      case 'fit':
        // 适应容器，保持比例
        const scaleX = containerWidth / contentWidth;
        const scaleY = containerHeight / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1); // 不放大，只缩小
        optimalWidth = contentWidth * scale;
        optimalHeight = contentHeight * scale;
        break;

      case 'scroll':
        // 滚动模式，使用内容原始尺寸
        optimalWidth = Math.min(contentWidth, containerWidth);
        optimalHeight = Math.min(contentHeight, containerHeight);
        break;

      case 'scale':
        // 缩放模式，填满容器
        optimalWidth = containerWidth;
        optimalHeight = containerHeight;
        break;

      default:
        // 默认适应宽度
        optimalWidth = Math.min(contentWidth, containerWidth);
        optimalHeight = (contentHeight * optimalWidth) / contentWidth;
    }

    // 应用尺寸限制
    if (config.minWidth) {
      optimalWidth = Math.max(optimalWidth, config.minWidth);
    }
    if (config.maxWidth) {
      optimalWidth = Math.min(optimalWidth, config.maxWidth);
    }
    if (config.minHeight) {
      optimalHeight = Math.max(optimalHeight, config.minHeight);
    }
    if (config.maxHeight) {
      optimalHeight = Math.min(optimalHeight, config.maxHeight);
    }

    return { width: optimalWidth, height: optimalHeight };
  }

  /**
   * 添加配置变更监听器
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * 移除配置变更监听器
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('配置监听器执行失败:', error);
      }
    });
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const errors = [];

    // 验证尺寸
    if (config.minWidth && config.maxWidth && config.minWidth > config.maxWidth) {
      errors.push('最小宽度不能大于最大宽度');
    }
    if (config.minHeight && config.maxHeight && config.minHeight > config.maxHeight) {
      errors.push('最小高度不能大于最大高度');
    }

    // 验证模式
    if (config.mode && !ADAPTIVE_MODES[config.mode]) {
      errors.push(`无效的自适应模式: ${config.mode}`);
    }

    // 验证容器类型
    if (config.containerType && !CONTAINER_TYPES[config.containerType]) {
      errors.push(`无效的容器类型: ${config.containerType}`);
    }

    // 验证断点
    if (config.breakpoints) {
      Object.entries(config.breakpoints).forEach(([breakpoint, config]) => {
        const breakpointNum = parseInt(breakpoint);
        if (isNaN(breakpointNum) || breakpointNum <= 0) {
          errors.push(`无效的断点: ${breakpoint}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 导出配置
   */
  exportConfig() {
    return {
      config: this.config,
      modes: ADAPTIVE_MODES,
      containerTypes: CONTAINER_TYPES,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 导入配置
   */
  importConfig(configData) {
    try {
      if (configData.config) {
        const validation = this.validateConfig(configData.config);
        if (validation.isValid) {
          return this.saveConfig(configData.config);
        } else {
          console.error('配置验证失败:', validation.errors);
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }
}

// 创建全局实例
const adaptiveConfigManager = new AdaptiveConfigManager();

// 导出工具函数
export const adaptiveUtils = {
  /**
   * 获取设备类型
   */
  getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  },

  /**
   * 获取容器尺寸
   */
  getContainerSize(container) {
    if (!container) return { width: 0, height: 0 };
    const rect = container.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  },

  /**
   * 检测是否支持ResizeObserver
   */
  supportsResizeObserver() {
    return typeof ResizeObserver !== 'undefined';
  },

  /**
   * 创建ResizeObserver
   */
  createResizeObserver(callback) {
    if (!this.supportsResizeObserver()) {
      console.warn('ResizeObserver not supported');
      return null;
    }
    return new ResizeObserver(callback);
  },

  /**
   * 防抖函数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * 节流函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

export default adaptiveConfigManager;