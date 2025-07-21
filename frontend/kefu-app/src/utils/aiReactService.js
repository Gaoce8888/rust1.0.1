/**
 * AI React组件服务
 * 提供调用后端AI接口生成和调用React组件的功能
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6006';

/**
 * AI React组件服务类
 */
class AIReactService {
    constructor() {
        this.baseUrl = `${API_BASE_URL}/api/ai/react`;
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
    }

    /**
     * 生成React组件
     * @param {Object} request - 生成请求
     * @param {string} request.description - 组件描述
     * @param {string} [request.component_type] - 组件类型
     * @param {Object} [request.props] - 组件属性
     * @param {Object} [request.styles] - 样式要求
     * @param {Array<string>} [request.requirements] - 特殊要求
     * @param {string} [request.context] - 上下文信息
     * @param {string} request.user_id - 用户ID
     * @returns {Promise<Object>} 生成结果
     */
    async generateComponent(request) {
        try {
            console.log('AI生成React组件:', request.description);

            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('AI组件生成成功:', result.component_id);
            
            // 缓存结果
            this.cache.set(result.component_id, result);
            
            return result;
        } catch (error) {
            console.error('AI组件生成失败:', error);
            throw error;
        }
    }

    /**
     * 调用React组件
     * @param {Object} request - 调用请求
     * @param {string} request.component_id - 组件ID
     * @param {Object} request.variables - 变量数据
     * @param {string} [request.context] - 上下文信息
     * @param {string} request.user_id - 用户ID
     * @returns {Promise<Object>} 调用结果
     */
    async callComponent(request) {
        try {
            console.log('AI调用React组件:', request.component_id);

            const response = await fetch(`${this.baseUrl}/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('AI组件调用成功:', result.call_id);
            
            return result;
        } catch (error) {
            console.error('AI组件调用失败:', error);
            throw error;
        }
    }

    /**
     * 批量生成React组件
     * @param {Array<Object>} requests - 生成请求列表
     * @param {Object} [options] - 批量处理选项
     * @returns {Promise<Object>} 批量生成结果
     */
    async batchGenerateComponents(requests, options = {}) {
        try {
            console.log('AI批量生成React组件:', requests.length, '个请求');

            const batchRequest = {
                requests,
                options: {
                    concurrency: options.concurrency || 5,
                    timeout: options.timeout || 30,
                    quality_check: options.quality_check !== false,
                },
            };

            const response = await fetch(`${this.baseUrl}/batch-generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(batchRequest),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('AI批量生成完成:', result.successful.length, '成功,', result.failed.length, '失败');
            
            // 缓存成功的结果
            result.successful.forEach(component => {
                this.cache.set(component.component_id, component);
            });
            
            return result;
        } catch (error) {
            console.error('AI批量生成失败:', error);
            throw error;
        }
    }

    /**
     * 获取组件生成统计
     * @returns {Promise<Object>} 统计数据
     */
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/stats`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('获取AI统计失败:', error);
            throw error;
        }
    }

    /**
     * 健康检查
     * @returns {Promise<Object>} 健康状态
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('AI健康检查失败:', error);
            throw error;
        }
    }

    /**
     * 从缓存获取组件
     * @param {string} componentId - 组件ID
     * @returns {Object|null} 缓存的组件
     */
    getCachedComponent(componentId) {
        return this.cache.get(componentId) || null;
    }

    /**
     * 清除缓存
     * @param {string} [componentId] - 特定组件ID，不传则清除所有缓存
     */
    clearCache(componentId = null) {
        if (componentId) {
            this.cache.delete(componentId);
        } else {
            this.cache.clear();
        }
    }

    /**
     * 智能生成组件（根据描述自动选择合适的类型）
     * @param {string} description - 组件描述
     * @param {string} userId - 用户ID
     * @param {Object} [options] - 选项
     * @returns {Promise<Object>} 生成结果
     */
    async smartGenerate(description, userId, options = {}) {
        // 根据描述智能推断组件类型
        const componentType = this.inferComponentType(description);
        
        const request = {
            description,
            component_type: componentType,
            user_id: userId,
            ...options,
        };

        return await this.generateComponent(request);
    }

    /**
     * 推断组件类型
     * @param {string} description - 描述
     * @returns {string} 组件类型
     */
    inferComponentType(description) {
        const lowerDesc = description.toLowerCase();
        
        if (lowerDesc.includes('按钮') || lowerDesc.includes('button') || lowerDesc.includes('点击')) {
            return 'button';
        }
        if (lowerDesc.includes('图片') || lowerDesc.includes('image') || lowerDesc.includes('照片')) {
            return 'image';
        }
        if (lowerDesc.includes('头像') || lowerDesc.includes('avatar') || lowerDesc.includes('用户头像')) {
            return 'avatar';
        }
        if (lowerDesc.includes('标签') || lowerDesc.includes('chip') || lowerDesc.includes('标记')) {
            return 'chip';
        }
        if (lowerDesc.includes('进度') || lowerDesc.includes('progress') || lowerDesc.includes('加载')) {
            return 'progress';
        }
        if (lowerDesc.includes('标签页') || lowerDesc.includes('tabs') || lowerDesc.includes('分页')) {
            return 'tabs';
        }
        if (lowerDesc.includes('弹窗') || lowerDesc.includes('modal') || lowerDesc.includes('对话框')) {
            return 'modal';
        }
        if (lowerDesc.includes('输入') || lowerDesc.includes('input') || lowerDesc.includes('文本框')) {
            return 'input';
        }
        if (lowerDesc.includes('选择') || lowerDesc.includes('select') || lowerDesc.includes('下拉')) {
            return 'select';
        }
        if (lowerDesc.includes('开关') || lowerDesc.includes('switch') || lowerDesc.includes('切换')) {
            return 'switch';
        }
        if (lowerDesc.includes('滑块') || lowerDesc.includes('slider') || lowerDesc.includes('滑动')) {
            return 'slider';
        }
        if (lowerDesc.includes('手风琴') || lowerDesc.includes('accordion') || lowerDesc.includes('折叠')) {
            return 'accordion';
        }
        if (lowerDesc.includes('警告') || lowerDesc.includes('alert') || lowerDesc.includes('提示')) {
            return 'alert';
        }
        if (lowerDesc.includes('加载') || lowerDesc.includes('spinner') || lowerDesc.includes('等待')) {
            return 'spinner';
        }
        
        // 默认为卡片
        return 'card';
    }

    /**
     * 生成常用组件模板
     * @param {string} userId - 用户ID
     * @returns {Promise<Array>} 生成的组件列表
     */
    async generateCommonTemplates(userId) {
        const commonTemplates = [
            {
                description: '产品展示卡片，包含图片、标题、价格和购买按钮',
                component_type: 'card',
                requirements: ['响应式设计', '现代化样式', '交互友好'],
            },
            {
                description: '用户信息展示，包含头像、姓名和状态',
                component_type: 'card',
                requirements: ['简洁设计', '状态指示'],
            },
            {
                description: '操作按钮组，包含主要和次要操作',
                component_type: 'button',
                requirements: ['按钮组布局', '不同优先级'],
            },
            {
                description: '进度指示器，显示当前操作进度',
                component_type: 'progress',
                requirements: ['动画效果', '百分比显示'],
            },
            {
                description: '通知提示框，显示重要信息',
                component_type: 'alert',
                requirements: ['不同类型', '可关闭'],
            },
        ];

        const requests = commonTemplates.map(template => ({
            ...template,
            user_id: userId,
        }));

        return await this.batchGenerateComponents(requests);
    }
}

// 创建全局实例
const aiReactService = new AIReactService();

// 导出工具函数
export const aiReactUtils = {
    /**
     * 快速生成简单组件
     */
    async quickGenerate(description, userId) {
        return await aiReactService.smartGenerate(description, userId);
    },

    /**
     * 生成产品卡片
     */
    async generateProductCard(productData, userId) {
        const description = `产品卡片：${productData.name}，价格${productData.price}，${productData.description}`;
        return await aiReactService.generateComponent({
            description,
            component_type: 'card',
            props: {
                title: productData.name,
                price: productData.price,
                image: productData.image,
                description: productData.description,
            },
            user_id: userId,
        });
    },

    /**
     * 生成用户信息卡片
     */
    async generateUserCard(userData, userId) {
        const description = `用户信息卡片：${userData.name}，${userData.role}`;
        return await aiReactService.generateComponent({
            description,
            component_type: 'card',
            props: {
                name: userData.name,
                avatar: userData.avatar,
                role: userData.role,
                status: userData.status,
            },
            user_id: userId,
        });
    },

    /**
     * 生成操作按钮组
     */
    async generateActionButtons(actions, userId) {
        const description = `操作按钮组：${actions.map(a => a.label).join('、')}`;
        return await aiReactService.generateComponent({
            description,
            component_type: 'button',
            props: {
                actions: actions,
            },
            user_id: userId,
        });
    },
};

export default aiReactService;