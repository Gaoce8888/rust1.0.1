# 自定义AI处理器使用指南

## 概述

自定义AI处理器允许您灵活集成各种AI服务、工具和知识库，无需修改核心代码。支持MCP工具、知识库、RAG系统、向量数据库等多种集成方式。

## 核心特性

### 🔌 支持的集成类型

1. **MCP工具** - 集成Model Context Protocol工具
2. **知识库** - 查询内部知识库系统
3. **RAG系统** - 检索增强生成
4. **HTTP API** - 调用任意HTTP接口
5. **Python脚本** - 执行自定义Python逻辑
6. **WebAssembly** - 高性能计算模块
7. **向量数据库** - 语义搜索和相似度匹配

### 🚀 主要优势

- ✅ **无需编译**: 通过配置文件添加新的AI能力
- ✅ **热重载**: 运行时更新处理器配置
- ✅ **缓存支持**: 提高响应速度，减少API调用
- ✅ **预处理/后处理**: 灵活的数据转换管道
- ✅ **统一接口**: 所有自定义处理器使用相同的调用方式

## 使用方法

### 1. 调用自定义处理器

```json
POST /api/ai/task
{
    "task_type": "CustomProcessor",
    "user_id": "user123",
    "message_id": "msg456",
    "input_data": {
        "processor_id": "kb_faq",  // 指定要使用的处理器ID
        "query": "如何办理退款？",
        "filters": {
            "category": "refund"
        }
    },
    "priority": 5
}
```

### 2. 配置处理器

在 `config/ai_config.toml` 中添加新的处理器：

```toml
[[custom_processor.processors]]
id = "my_custom_processor"
name = "我的自定义处理器"
description = "处理特定业务逻辑"
endpoint = "http://localhost:8086/api/process"
api_key = ""  # 从环境变量读取
timeout_seconds = 30
max_retries = 3
cache_enabled = true
cache_ttl_seconds = 600

[custom_processor.processors.processor_type]
type = "http_api"
method = "POST"
# ... 其他配置
```

## 集成示例

### 示例1：集成MCP工具

```toml
[[custom_processor.processors]]
id = "mcp_web_search"
name = "MCP网页搜索"
description = "使用MCP工具搜索网页内容"

[custom_processor.processors.processor_type]
type = "mcp_tool"
tool_name = "web_search"
tool_version = "1.0"
tool_config = {
    engine = "google",
    max_results = 10,
    language = "zh-CN"
}
```

使用示例：
```json
{
    "processor_id": "mcp_web_search",
    "query": "最新的AI技术趋势"
}
```

### 示例2：知识库查询

```toml
[[custom_processor.processors]]
id = "product_kb"
name = "产品知识库"
description = "查询产品相关信息"

[custom_processor.processors.processor_type]
type = "knowledge_base"
kb_id = "products_v2"
search_type = "hybrid"
max_results = 3
min_score = 0.8
```

使用示例：
```json
{
    "processor_id": "product_kb",
    "query": "手机保修政策",
    "filters": {
        "brand": "Apple",
        "category": "warranty"
    }
}
```

### 示例3：RAG系统

```toml
[[custom_processor.processors]]
id = "smart_qa"
name = "智能问答系统"
description = "基于RAG的智能问答"

[custom_processor.processors.processor_type]
type = "rag"
retriever_endpoint = "http://localhost:8083/retrieve"
generator_endpoint = "http://localhost:8084/generate"
retriever_config = {
    index_name = "qa_docs",
    top_k = 5,
    rerank = true
}
generator_config = {
    model = "gpt-3.5-turbo",
    prompt_template = "基于以下信息回答问题：\n{context}\n\n问题：{query}\n回答：",
    temperature = 0.3
}
```

### 示例4：自定义HTTP API

```toml
[[custom_processor.processors]]
id = "sentiment_analyzer"
name = "情感分析器"
description = "分析文本情感"

[custom_processor.processors.processor_type]
type = "http_api"
method = "POST"

[custom_processor.processors.processor_type.request_template]
text = "{{input}}"
model = "sentiment-v2"
return_confidence = true

[custom_processor.processors.processor_type.response_mapping]
extract_path = "$.results.sentiment"
```

## 预处理和后处理

### 预处理示例

```toml
[[custom_processor.processors.preprocessing.steps]]
type = "text_normalize"
lowercase = true
remove_punctuation = true

[[custom_processor.processors.preprocessing.steps]]
type = "text_split"
method = "sentence"
max_length = 500

[[custom_processor.processors.preprocessing.steps]]
type = "template_render"
template = "Context: {{context}}\nQuery: {{query}}"
```

### 后处理示例

```toml
[[custom_processor.processors.postprocessing.steps]]
type = "json_extract"
path = "$.data.answer"

[[custom_processor.processors.postprocessing.steps]]
type = "text_format"
format_template = "根据知识库，{{answer}}"

[[custom_processor.processors.postprocessing.steps]]
type = "result_filter"
condition = "confidence > 0.7"
```

## 高级功能

### 1. 链式处理

可以通过多个处理器组合实现复杂功能：

```javascript
// 先查询知识库
const kbResult = await submitTask({
    task_type: "CustomProcessor",
    input_data: {
        processor_id: "kb_faq",
        query: userQuestion
    }
});

// 如果知识库没有找到，使用RAG
if (!kbResult.found) {
    const ragResult = await submitTask({
        task_type: "CustomProcessor",
        input_data: {
            processor_id: "rag_customer_service",
            query: userQuestion,
            context: kbResult.related_docs
        }
    });
}
```

### 2. 并行处理

同时调用多个处理器：

```javascript
const tasks = [
    { processor_id: "sentiment_analyzer", text: message },
    { processor_id: "intent_classifier", text: message },
    { processor_id: "entity_extractor", text: message }
];

const results = await Promise.all(
    tasks.map(task => submitTask({
        task_type: "CustomProcessor",
        input_data: task
    }))
);
```

### 3. 缓存策略

- **查询缓存**: 相同的查询直接返回缓存结果
- **TTL控制**: 设置合适的缓存过期时间
- **选择性缓存**: 只缓存成功的结果

## 最佳实践

### 1. 处理器命名
- 使用清晰的ID和名称
- 添加详细的描述
- 遵循命名规范：`domain_function`

### 2. 错误处理
- 设置合理的超时时间
- 配置重试策略
- 提供降级方案

### 3. 性能优化
- 启用缓存减少API调用
- 使用预处理减少数据传输
- 合理设置并发限制

### 4. 安全考虑
- API密钥使用环境变量
- 验证输入数据
- 限制访问权限
- 审计日志记录

## 故障排除

### 常见问题

1. **处理器未找到**
   - 检查processor_id是否正确
   - 确认配置文件已加载
   - 尝试重载配置

2. **超时错误**
   - 增加timeout_seconds
   - 检查网络连接
   - 验证端点可用性

3. **缓存未生效**
   - 确认cache_enabled为true
   - 检查cache_ttl_seconds设置
   - 查看缓存键是否一致

## 扩展开发

### 添加新的处理器类型

1. 在 `custom_processor.rs` 中添加新的枚举值
2. 实现相应的处理逻辑
3. 更新配置解析
4. 添加文档说明

### 自定义预处理/后处理步骤

1. 定义新的步骤类型
2. 实现处理逻辑
3. 注册到处理管道
4. 更新配置示例

## 总结

自定义AI处理器提供了极大的灵活性，让您可以：

- 🔧 **快速集成**: 无需修改代码即可添加新的AI能力
- 🚀 **灵活扩展**: 支持各种AI服务和工具
- 💡 **统一管理**: 所有AI能力通过统一接口调用
- 📊 **性能优化**: 内置缓存和并发控制
- 🔒 **安全可靠**: 完善的错误处理和安全机制

通过合理使用自定义处理器，您可以构建强大而灵活的AI系统。