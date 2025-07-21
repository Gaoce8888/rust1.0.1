import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Card, CardBody, CardHeader, CardFooter, Button, Image, Avatar, Chip, Progress, Tabs, Tab, Modal, Spinner, Alert, Input, Textarea, Select, SelectItem, Switch, Slider, Divider, Accordion, AccordionItem } from '@heroui/react';
import { useResizeObserver } from '../utils/performance';

/**
 * React卡片渲染器 - 支持动态组件渲染和自适应大小
 */
const ReactCardRenderer = ({ 
  componentData, 
  adaptiveStyles, 
  containerId, 
  onEvent,
  className = "",
  style = {}
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [componentState, setComponentState] = useState({});

  // 使用ResizeObserver监听容器大小变化
  const { width, height } = useResizeObserver(containerRef);

  // 更新尺寸状态
  useEffect(() => {
    if (width && height) {
      setDimensions({ width, height });
    }
  }, [width, height]);

  // 组件加载完成
  useEffect(() => {
    if (componentData) {
      setIsLoading(false);
    }
  }, [componentData]);

  // 处理组件事件
  const handleComponentEvent = useCallback((eventName, eventData) => {
    if (onEvent) {
      onEvent({
        type: eventName,
        data: eventData,
        componentName: componentData?.component_name,
        containerId
      });
    }
  }, [onEvent, componentData, containerId]);

  // 渲染组件属性
  const renderProps = useMemo(() => {
    if (!componentData?.props) return {};
    
    try {
      const props = typeof componentData.props === 'string' 
        ? JSON.parse(componentData.props) 
        : componentData.props;
      
      // 处理动态属性
      return Object.entries(props).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && value.includes('{{dimensions}}')) {
          // 替换尺寸变量
          acc[key] = value.replace('{{dimensions.width}}', dimensions.width)
                         .replace('{{dimensions.height}}', dimensions.height);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});
    } catch (err) {
      console.error('解析组件属性失败:', err);
      return {};
    }
  }, [componentData?.props, dimensions]);

  // 渲染组件样式
  const renderStyles = useMemo(() => {
    if (!componentData?.styles) return {};
    
    try {
      const styles = typeof componentData.styles === 'string' 
        ? JSON.parse(componentData.styles) 
        : componentData.styles;
      
      // 合并自适应样式
      const adaptiveStyleObj = {};
      if (adaptiveStyles) {
        try {
          const adaptiveParsed = JSON.parse(adaptiveStyles);
          Object.assign(adaptiveStyleObj, adaptiveParsed);
        } catch (err) {
          // 如果不是JSON，可能是CSS字符串，直接使用
          console.warn('自适应样式不是有效的JSON格式');
        }
      }
      
      return { ...styles, ...adaptiveStyleObj };
    } catch (err) {
      console.error('解析组件样式失败:', err);
      return {};
    }
  }, [componentData?.styles, adaptiveStyles]);

  // 渲染具体组件
  const renderComponent = useCallback(() => {
    if (!componentData?.component_name) {
      return <div>组件名称未定义</div>;
    }

    const componentName = componentData.component_name.toLowerCase();
    const props = renderProps;
    const styles = renderStyles;

    try {
      switch (componentName) {
        case 'card':
          return (
            <Card 
              {...props}
              style={styles}
              className={`react-card ${className}`}
            >
              {props.header && (
                <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
                  {props.header}
                </CardHeader>
              )}
              <CardBody className="overflow-visible py-2">
                {props.children || props.content}
              </CardBody>
              {props.footer && (
                <CardFooter className="pt-0 px-4 pb-4">
                  {props.footer}
                </CardFooter>
              )}
            </Card>
          );

        case 'button':
          return (
            <Button 
              {...props}
              style={styles}
              className={`react-button ${className}`}
              onClick={() => handleComponentEvent('click', props)}
            >
              {props.children || props.text || '按钮'}
            </Button>
          );

        case 'image':
          return (
            <Image
              {...props}
              style={styles}
              className={`react-image ${className}`}
              alt={props.alt || '图片'}
              onLoad={() => handleComponentEvent('load', props)}
              onError={() => handleComponentEvent('error', props)}
            />
          );

        case 'avatar':
          return (
            <Avatar
              {...props}
              style={styles}
              className={`react-avatar ${className}`}
              src={props.src}
              name={props.name}
            />
          );

        case 'chip':
          return (
            <Chip
              {...props}
              style={styles}
              className={`react-chip ${className}`}
            >
              {props.children || props.text}
            </Chip>
          );

        case 'progress':
          return (
            <Progress
              {...props}
              style={styles}
              className={`react-progress ${className}`}
              value={props.value || 0}
              maxValue={props.maxValue || 100}
            />
          );

        case 'tabs':
          return (
            <Tabs
              {...props}
              style={styles}
              className={`react-tabs ${className}`}
              onSelectionChange={(key) => handleComponentEvent('tabChange', { key })}
            >
              {props.items?.map((item, index) => (
                <Tab key={item.key || index} title={item.title}>
                  {item.content}
                </Tab>
              ))}
            </Tabs>
          );

        case 'modal':
          return (
            <Modal
              {...props}
              style={styles}
              className={`react-modal ${className}`}
              isOpen={componentState.isOpen || false}
              onOpenChange={(open) => {
                setComponentState(prev => ({ ...prev, isOpen: open }));
                handleComponentEvent('openChange', { open });
              }}
            >
              {props.children || props.content}
            </Modal>
          );

        case 'input':
          return (
            <Input
              {...props}
              style={styles}
              className={`react-input ${className}`}
              onChange={(e) => handleComponentEvent('change', { value: e.target.value })}
            />
          );

        case 'textarea':
          return (
            <Textarea
              {...props}
              style={styles}
              className={`react-textarea ${className}`}
              onChange={(e) => handleComponentEvent('change', { value: e.target.value })}
            />
          );

        case 'select':
          return (
            <Select
              {...props}
              style={styles}
              className={`react-select ${className}`}
              onSelectionChange={(key) => handleComponentEvent('selectionChange', { key })}
            >
              {props.items?.map((item, index) => (
                <SelectItem key={item.key || index} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </Select>
          );

        case 'switch':
          return (
            <Switch
              {...props}
              style={styles}
              className={`react-switch ${className}`}
              isSelected={componentState.isSelected || false}
              onValueChange={(selected) => {
                setComponentState(prev => ({ ...prev, isSelected: selected }));
                handleComponentEvent('valueChange', { selected });
              }}
            >
              {props.children || props.text}
            </Switch>
          );

        case 'slider':
          return (
            <Slider
              {...props}
              style={styles}
              className={`react-slider ${className}`}
              value={componentState.value || props.defaultValue || 0}
              onChange={(value) => {
                setComponentState(prev => ({ ...prev, value }));
                handleComponentEvent('change', { value });
              }}
            />
          );

        case 'accordion':
          return (
            <Accordion
              {...props}
              style={styles}
              className={`react-accordion ${className}`}
            >
              {props.items?.map((item, index) => (
                <AccordionItem key={item.key || index} title={item.title}>
                  {item.content}
                </AccordionItem>
              ))}
            </Accordion>
          );

        case 'alert':
          return (
            <Alert
              {...props}
              style={styles}
              className={`react-alert ${className}`}
            >
              {props.children || props.content}
            </Alert>
          );

        case 'spinner':
          return (
            <Spinner
              {...props}
              style={styles}
              className={`react-spinner ${className}`}
            />
          );

        case 'divider':
          return (
            <Divider
              {...props}
              style={styles}
              className={`react-divider ${className}`}
            />
          );

        default:
          // 自定义组件或未识别的组件
          return (
            <div 
              {...props}
              style={styles}
              className={`react-custom-component ${className}`}
              data-component-name={componentName}
            >
              {props.children || props.content || `未识别的组件: ${componentName}`}
            </div>
          );
      }
    } catch (err) {
      console.error('渲染组件失败:', err);
      return <div>组件渲染失败: {err.message}</div>;
    }
  }, [componentData, renderProps, renderStyles, className, componentState, handleComponentEvent]);

  // 处理错误
  if (error) {
    return (
      <Alert variant="destructive" className="react-card-error">
        渲染错误: {error.message}
      </Alert>
    );
  }

  // 加载状态
  if (isLoading) {
    return (
      <div ref={containerRef} className={`react-card-container ${className}`} style={style}>
        <Spinner size="lg" />
        <p>加载组件中...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`react-card-container ${className}`} 
      style={{
        width: '100%',
        height: 'auto',
        position: 'relative',
        ...style
      }}
      data-component-name={componentData?.component_name}
      data-container-id={containerId}
    >
      {renderComponent()}
    </div>
  );
};

export default ReactCardRenderer;