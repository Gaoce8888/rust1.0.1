# AI配置管理指南

## 概述

AI系统现已支持**运行时配置管理**，无需重新编译后端即可修改AI模型配置。所有配置都通过外部配置文件管理，支持热重载。

## 核心特性

### ✅ 配置与代码分离
- AI配置存储在 `config/ai_config.toml` 文件中
- 支持运行时修改，无需重新编译
- 自动加载环境变量中的敏感信息

### ✅ 热重载支持
- 通过API端点触发配置重载
- 无需重启服务
- 配置立即生效

### ✅ 安全性
- API密钥从环境变量加载
- 配置文件中不存储敏感信息
- 保存配置时自动屏蔽密钥

## 配置文件位置

系统按以下顺序查找配置文件：
1. `config/ai_config.toml` (推荐)
2. `ai_config.toml` (当前目录)
3. `/etc/ylqkf/ai_config.toml` (系统级配置)

如果找不到配置文件，将使用内置默认配置。

## 配置管理API

### 1. 获取当前配置
```bash
GET /api/ai/config
```

### 2. 更新配置
```bash
PUT /api/ai/config
Content-Type: application/json

{
  "enabled": true,
  "max_concurrent_tasks": 20,
  "intent_recognition": {
    "enabled": true,
    "model_type": "openai",
    ...
  }
}
```

### 3. 重新加载配置文件
```bash
POST /api/ai/config/reload
```

此端点会从配置文件重新加载所有设置，并自动加载环境变量中的密钥。

## 环境变量配置

以下环境变量会自动加载到相应的配置中：

| 环境变量 | 用途 | 应用服务 |
|---------|------|----------|
| `OPENAI_API_KEY` | OpenAI API密钥 | 意图识别、自动回复 |
| `GOOGLE_TRANSLATE_API_KEY` | Google翻译API密钥 | 翻译服务 |
| `AZURE_SPEECH_KEY` | Azure语音服务密钥 | 语音识别 |
| `AZURE_TEXT_ANALYTICS_KEY` | Azure文本分析密钥 | 情感分析 |

## 配置示例

### 1. 启用新的AI模型
编辑 `config/ai_config.toml`：
```toml
[intent_recognition]
enabled = true
model_type = "azure"  # 从openai改为azure
api_endpoint = "https://your-azure-endpoint.cognitiveservices.azure.com/"
```

然后重新加载配置：
```bash
curl -X POST http://localhost:8080/api/ai/config/reload
```

### 2. 添加自定义意图
```toml
[[intent_recognition.custom_intents]]
name = "refund_request"
description = "退款请求"
keywords = ["退款", "退钱", "返还"]
patterns = ["我要退款", "申请退款"]
confidence_boost = 0.2
```

### 3. 调整性能参数
```toml
[general]
max_concurrent_tasks = 20  # 增加并发任务数
task_timeout_seconds = 60  # 增加超时时间
```

## 配置验证

系统会自动验证配置的有效性：
- 必填字段检查
- 数值范围验证
- API密钥存在性检查（当服务启用时）

如果配置无效，更新会被拒绝，并返回详细错误信息。

## 最佳实践

### 1. 密钥管理
- **永远不要**在配置文件中硬编码API密钥
- 使用环境变量管理所有敏感信息
- 定期轮换API密钥

### 2. 配置备份
```bash
# 备份当前配置
cp config/ai_config.toml config/ai_config.toml.backup

# 恢复配置
cp config/ai_config.toml.backup config/ai_config.toml
curl -X POST http://localhost:8080/api/ai/config/reload
```

### 3. 渐进式更新
- 先在测试环境验证配置
- 逐步调整参数，观察效果
- 保留可用的配置版本

### 4. 监控配置变更
- 记录所有配置更改
- 监控AI性能指标
- 设置告警阈值

## 故障排除

### 配置不生效
1. 检查配置文件语法是否正确
2. 确认环境变量已设置
3. 查看服务日志中的错误信息
4. 尝试手动重载配置

### API密钥错误
1. 确认环境变量名称正确
2. 检查密钥是否有效
3. 验证API端点URL
4. 查看具体的API错误信息

### 性能问题
1. 调整 `max_concurrent_tasks`
2. 增加 `task_timeout_seconds`
3. 检查API配额限制
4. 启用缓存功能

## 迁移指南

从硬编码配置迁移到文件配置：

1. **创建配置文件**
   ```bash
   cp config/ai_config.toml.example config/ai_config.toml
   ```

2. **设置环境变量**
   ```bash
   export OPENAI_API_KEY=your_key
   export GOOGLE_TRANSLATE_API_KEY=your_key
   ```

3. **重启服务**
   ```bash
   systemctl restart ylqkf-ai
   ```

4. **验证配置**
   ```bash
   curl http://localhost:8080/api/ai/config
   ```

## 总结

通过配置文件管理，AI系统实现了：
- ✅ **灵活性**: 无需重新编译即可调整AI行为
- ✅ **安全性**: 敏感信息与配置分离
- ✅ **可维护性**: 配置版本控制和备份
- ✅ **可扩展性**: 轻松添加新的AI服务

这种设计使得AI系统的管理和维护变得更加简单和高效。