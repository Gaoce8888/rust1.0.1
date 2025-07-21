import React, { useState, useCallback, useEffect } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Textarea,
    Select,
    SelectItem,
    Card,
    CardBody,
    Chip,
    Progress,
    Spinner,
    Alert,
    Divider,
    Accordion,
    AccordionItem,
    Switch,
    Slider,
} from '@heroui/react';
import aiReactService, { aiReactUtils } from '../utils/aiReactService';

const AIComponentGenerator = ({ 
    isOpen, 
    onClose, 
    onComponentGenerated,
    currentUserId 
}) => {
    const [description, setDescription] = useState('');
    const [componentType, setComponentType] = useState('card');
    const [requirements, setRequirements] = useState([]);
    const [context, setContext] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [generatedComponents, setGeneratedComponents] = useState([]);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [qualityCheck, setQualityCheck] = useState(true);
    const [autoOptimize, setAutoOptimize] = useState(true);

    // 组件类型选项
    const componentTypes = [
        { key: 'card', label: '卡片 (Card)', description: '信息展示卡片' },
        { key: 'button', label: '按钮 (Button)', description: '交互按钮' },
        { key: 'image', label: '图片 (Image)', description: '图片展示' },
        { key: 'avatar', label: '头像 (Avatar)', description: '用户头像' },
        { key: 'chip', label: '标签 (Chip)', description: '状态标签' },
        { key: 'progress', label: '进度条 (Progress)', description: '进度指示' },
        { key: 'tabs', label: '标签页 (Tabs)', description: '分页内容' },
        { key: 'modal', label: '弹窗 (Modal)', description: '对话框' },
        { key: 'input', label: '输入框 (Input)', description: '文本输入' },
        { key: 'select', label: '选择器 (Select)', description: '下拉选择' },
        { key: 'switch', label: '开关 (Switch)', description: '开关控件' },
        { key: 'slider', label: '滑块 (Slider)', description: '数值选择' },
        { key: 'accordion', label: '手风琴 (Accordion)', description: '折叠内容' },
        { key: 'alert', label: '提示 (Alert)', description: '消息提示' },
        { key: 'spinner', label: '加载器 (Spinner)', description: '加载动画' },
    ];

    // 常用要求选项
    const commonRequirements = [
        '响应式设计',
        '现代化样式',
        '交互友好',
        '动画效果',
        '无障碍支持',
        '深色模式',
        '国际化支持',
        '性能优化',
        '可访问性',
        '移动端适配',
    ];

    // 快速模板
    const quickTemplates = [
        {
            name: '产品卡片',
            description: '产品展示卡片，包含图片、标题、价格和购买按钮',
            type: 'card',
            requirements: ['响应式设计', '现代化样式', '交互友好'],
        },
        {
            name: '用户信息',
            description: '用户信息展示，包含头像、姓名和状态',
            type: 'card',
            requirements: ['简洁设计', '状态指示'],
        },
        {
            name: '操作按钮组',
            description: '操作按钮组，包含主要和次要操作',
            type: 'button',
            requirements: ['按钮组布局', '不同优先级'],
        },
        {
            name: '进度指示器',
            description: '进度指示器，显示当前操作进度',
            type: 'progress',
            requirements: ['动画效果', '百分比显示'],
        },
        {
            name: '通知提示',
            description: '通知提示框，显示重要信息',
            type: 'alert',
            requirements: ['不同类型', '可关闭'],
        },
    ];

    // 添加要求
    const addRequirement = useCallback((req) => {
        if (!requirements.includes(req)) {
            setRequirements(prev => [...prev, req]);
        }
    }, [requirements]);

    // 移除要求
    const removeRequirement = useCallback((req) => {
        setRequirements(prev => prev.filter(r => r !== req));
    }, []);

    // 使用快速模板
    const useTemplate = useCallback((template) => {
        setDescription(template.description);
        setComponentType(template.type);
        setRequirements(template.requirements);
        setShowAdvanced(true);
    }, []);

    // 生成组件
    const generateComponent = useCallback(async () => {
        if (!description.trim()) {
            setError('请输入组件描述');
            return;
        }

        if (!currentUserId) {
            setError('用户ID不能为空');
            return;
        }

        setIsGenerating(true);
        setError('');
        setSuccess('');
        setGenerationProgress(0);

        try {
            // 模拟进度
            const progressInterval = setInterval(() => {
                setGenerationProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const request = {
                description: description.trim(),
                component_type: componentType,
                requirements: requirements.length > 0 ? requirements : undefined,
                context: context.trim() || undefined,
                user_id: currentUserId,
            };

            const result = await aiReactService.generateComponent(request);
            
            clearInterval(progressInterval);
            setGenerationProgress(100);

            setSuccess(`组件生成成功！ID: ${result.component_id}`);
            setGeneratedComponents(prev => [result, ...prev]);

            // 调用回调函数
            if (onComponentGenerated) {
                onComponentGenerated(result);
            }

            // 重置表单
            setTimeout(() => {
                setDescription('');
                setRequirements([]);
                setContext('');
                setGenerationProgress(0);
                setSuccess('');
            }, 2000);

        } catch (err) {
            setError(`生成失败: ${err.message}`);
            setGenerationProgress(0);
        } finally {
            setIsGenerating(false);
        }
    }, [description, componentType, requirements, context, currentUserId, onComponentGenerated]);

    // 批量生成常用模板
    const generateCommonTemplates = useCallback(async () => {
        if (!currentUserId) {
            setError('用户ID不能为空');
            return;
        }

        setIsGenerating(true);
        setError('');
        setSuccess('');

        try {
            const result = await aiReactService.generateCommonTemplates(currentUserId);
            
            setSuccess(`批量生成完成！成功 ${result.successful.length} 个，失败 ${result.failed.length} 个`);
            setGeneratedComponents(prev => [...result.successful, ...prev]);

            if (onComponentGenerated && result.successful.length > 0) {
                result.successful.forEach(component => {
                    onComponentGenerated(component);
                });
            }

        } catch (err) {
            setError(`批量生成失败: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    }, [currentUserId, onComponentGenerated]);

    // 智能生成
    const smartGenerate = useCallback(async () => {
        if (!description.trim()) {
            setError('请输入组件描述');
            return;
        }

        if (!currentUserId) {
            setError('用户ID不能为空');
            return;
        }

        setIsGenerating(true);
        setError('');
        setSuccess('');

        try {
            const result = await aiReactService.smartGenerate(description, currentUserId, {
                requirements: requirements.length > 0 ? requirements : undefined,
                context: context.trim() || undefined,
            });

            setSuccess(`智能生成成功！类型: ${result.component_type}, ID: ${result.component_id}`);
            setGeneratedComponents(prev => [result, ...prev]);

            if (onComponentGenerated) {
                onComponentGenerated(result);
            }

            // 重置表单
            setTimeout(() => {
                setDescription('');
                setRequirements([]);
                setContext('');
            }, 2000);

        } catch (err) {
            setError(`智能生成失败: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    }, [description, requirements, context, currentUserId, onComponentGenerated]);

    // 关闭模态框时重置状态
    const handleClose = useCallback(() => {
        setDescription('');
        setRequirements([]);
        setContext('');
        setError('');
        setSuccess('');
        setGenerationProgress(0);
        setShowAdvanced(false);
        onClose();
    }, [onClose]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose}
            size="3xl"
            scrollBehavior="inside"
            classNames={{
                base: "max-h-[90vh]",
                body: "py-6",
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold">AI React组件生成器</h3>
                    <p className="text-sm text-gray-500">
                        使用AI智能生成React组件，支持多种组件类型和自定义要求
                    </p>
                </ModalHeader>

                <ModalBody>
                    {/* 快速模板 */}
                    <div className="mb-6">
                        <h4 className="text-lg font-medium mb-3">快速模板</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {quickTemplates.map((template, index) => (
                                <Card 
                                    key={index} 
                                    isPressable 
                                    onPress={() => useTemplate(template)}
                                    className="hover:scale-105 transition-transform"
                                >
                                    <CardBody className="p-4">
                                        <h5 className="font-medium text-sm">{template.name}</h5>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {template.description}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {template.requirements.slice(0, 2).map((req, idx) => (
                                                <Chip key={idx} size="sm" variant="flat" color="primary">
                                                    {req}
                                                </Chip>
                                            ))}
                                        </div>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <Divider className="my-4" />

                    {/* 基本配置 */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                组件描述 *
                            </label>
                            <Textarea
                                placeholder="请详细描述您想要的组件，例如：产品展示卡片，包含图片、标题、价格和购买按钮"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                minRows={3}
                                maxRows={6}
                                isDisabled={isGenerating}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    组件类型
                                </label>
                                <Select
                                    selectedKeys={[componentType]}
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0];
                                        if (selected) setComponentType(selected);
                                    }}
                                    isDisabled={isGenerating}
                                >
                                    {componentTypes.map((type) => (
                                        <SelectItem key={type.key} value={type.key}>
                                            <div>
                                                <div className="font-medium">{type.label}</div>
                                                <div className="text-xs text-gray-500">{type.description}</div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    上下文信息
                                </label>
                                <Input
                                    placeholder="可选的上下文信息，帮助AI更好地理解需求"
                                    value={context}
                                    onChange={(e) => setContext(e.target.value)}
                                    isDisabled={isGenerating}
                                />
                            </div>
                        </div>

                        {/* 高级选项 */}
                        <div>
                            <Button
                                variant="light"
                                onPress={() => setShowAdvanced(!showAdvanced)}
                                className="p-0 h-auto"
                            >
                                <span className="text-sm">
                                    {showAdvanced ? '隐藏' : '显示'} 高级选项
                                </span>
                            </Button>
                        </div>

                        {showAdvanced && (
                            <Accordion variant="splitted">
                                <AccordionItem key="requirements" title="特殊要求">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {commonRequirements.map((req) => (
                                                <Chip
                                                    key={req}
                                                    variant={requirements.includes(req) ? "solid" : "bordered"}
                                                    color={requirements.includes(req) ? "primary" : "default"}
                                                    isPressable
                                                    onPress={() => {
                                                        if (requirements.includes(req)) {
                                                            removeRequirement(req);
                                                        } else {
                                                            addRequirement(req);
                                                        }
                                                    }}
                                                    size="sm"
                                                >
                                                    {req}
                                                </Chip>
                                            ))}
                                        </div>
                                        {requirements.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-500 mb-2">已选择的要求：</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {requirements.map((req) => (
                                                        <Chip
                                                            key={req}
                                                            variant="solid"
                                                            color="primary"
                                                            onClose={() => removeRequirement(req)}
                                                            size="sm"
                                                        >
                                                            {req}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </AccordionItem>

                                <AccordionItem key="options" title="生成选项">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium">质量控制</p>
                                                <p className="text-xs text-gray-500">自动检查生成质量</p>
                                            </div>
                                            <Switch
                                                isSelected={qualityCheck}
                                                onValueChange={setQualityCheck}
                                                isDisabled={isGenerating}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium">自动优化</p>
                                                <p className="text-xs text-gray-500">自动优化组件性能</p>
                                            </div>
                                            <Switch
                                                isSelected={autoOptimize}
                                                onValueChange={setAutoOptimize}
                                                isDisabled={isGenerating}
                                            />
                                        </div>
                                    </div>
                                </AccordionItem>
                            </Accordion>
                        )}
                    </div>

                    {/* 生成进度 */}
                    {isGenerating && (
                        <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Spinner size="sm" />
                                <span className="text-sm">正在生成组件...</span>
                            </div>
                            <Progress
                                value={generationProgress}
                                color="primary"
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* 错误信息 */}
                    {error && (
                        <Alert variant="flat" color="danger" className="mt-4">
                            {error}
                        </Alert>
                    )}

                    {/* 成功信息 */}
                    {success && (
                        <Alert variant="flat" color="success" className="mt-4">
                            {success}
                        </Alert>
                    )}

                    {/* 最近生成的组件 */}
                    {generatedComponents.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-lg font-medium mb-3">最近生成的组件</h4>
                            <div className="space-y-2">
                                {generatedComponents.slice(0, 5).map((component, index) => (
                                    <Card key={index} variant="bordered" className="p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {component.component_type} - {component.component_id}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {component.description}
                                                </p>
                                            </div>
                                            <Chip size="sm" color="success" variant="flat">
                                                已生成
                                            </Chip>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter>
                    <div className="flex flex-wrap gap-2 w-full">
                        <Button
                            color="primary"
                            onPress={generateComponent}
                            isLoading={isGenerating}
                            isDisabled={!description.trim() || !currentUserId}
                        >
                            生成组件
                        </Button>
                        
                        <Button
                            color="secondary"
                            onPress={smartGenerate}
                            isLoading={isGenerating}
                            isDisabled={!description.trim() || !currentUserId}
                        >
                            智能生成
                        </Button>
                        
                        <Button
                            color="success"
                            onPress={generateCommonTemplates}
                            isLoading={isGenerating}
                            isDisabled={!currentUserId}
                        >
                            批量生成模板
                        </Button>
                        
                        <Button
                            variant="light"
                            onPress={handleClose}
                            isDisabled={isGenerating}
                        >
                            关闭
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default AIComponentGenerator;