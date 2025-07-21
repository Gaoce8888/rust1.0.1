use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use async_trait::async_trait;
use reqwest;
use std::collections::HashMap;

use super::{AITask, AIProcessor, AITaskType, config::AIConfig};

/// 自定义AI处理器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomProcessorConfig {
    pub enabled: bool,
    pub processors: Vec<CustomProcessorDef>,
}

/// 自定义处理器定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomProcessorDef {
    pub id: String,
    pub name: String,
    pub description: String,
    pub processor_type: CustomProcessorType,
    pub endpoint: String,
    pub api_key: String,
    pub headers: HashMap<String, String>,
    pub timeout_seconds: u64,
    pub max_retries: u32,
    pub preprocessing: Option<PreprocessingConfig>,
    pub postprocessing: Option<PostprocessingConfig>,
    pub cache_enabled: bool,
    pub cache_ttl_seconds: u64,
}

/// 自定义处理器类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CustomProcessorType {
    /// MCP工具调用
    #[serde(rename = "mcp_tool")]
    MCPTool {
        tool_name: String,
        tool_version: String,
        tool_config: serde_json::Value,
    },
    /// 知识库查询
    #[serde(rename = "knowledge_base")]
    KnowledgeBase {
        kb_id: String,
        search_type: String, // "semantic", "keyword", "hybrid"
        max_results: usize,
        min_score: f32,
    },
    /// RAG (Retrieval Augmented Generation)
    #[serde(rename = "rag")]
    RAG {
        retriever_endpoint: String,
        generator_endpoint: String,
        retriever_config: serde_json::Value,
        generator_config: serde_json::Value,
    },
    /// 自定义HTTP API
    #[serde(rename = "http_api")]
    HttpAPI {
        method: String,
        request_template: serde_json::Value,
        response_mapping: serde_json::Value,
    },
    /// 本地Python脚本
    #[serde(rename = "python_script")]
    PythonScript {
        script_path: String,
        python_path: String,
        virtualenv_path: Option<String>,
    },
    /// WebAssembly模块
    #[serde(rename = "wasm")]
    WASM {
        module_path: String,
        function_name: String,
        memory_limit_mb: u32,
    },
    /// 向量数据库查询
    #[serde(rename = "vector_db")]
    VectorDB {
        db_type: String, // "pinecone", "weaviate", "qdrant", "milvus"
        connection_string: String,
        collection_name: String,
        embedding_model: String,
    },
}

/// 预处理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreprocessingConfig {
    pub steps: Vec<PreprocessingStep>,
}

/// 预处理步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PreprocessingStep {
    #[serde(rename = "text_normalize")]
    TextNormalize {
        lowercase: bool,
        remove_punctuation: bool,
        remove_extra_spaces: bool,
    },
    #[serde(rename = "text_split")]
    TextSplit {
        method: String, // "sentence", "paragraph", "token"
        max_length: usize,
        overlap: usize,
    },
    #[serde(rename = "data_transform")]
    DataTransform {
        jq_expression: String,
    },
    #[serde(rename = "template_render")]
    TemplateRender {
        template: String,
    },
}

/// 后处理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostprocessingConfig {
    pub steps: Vec<PostprocessingStep>,
}

/// 后处理步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PostprocessingStep {
    #[serde(rename = "json_extract")]
    JsonExtract {
        path: String,
    },
    #[serde(rename = "text_format")]
    TextFormat {
        format_template: String,
    },
    #[serde(rename = "result_filter")]
    ResultFilter {
        condition: String,
    },
    #[serde(rename = "result_merge")]
    ResultMerge {
        merge_strategy: String, // "concat", "best", "vote"
    },
}

/// 自定义AI处理器
pub struct CustomAIProcessor {
    config: Arc<RwLock<AIConfig>>,
    http_client: reqwest::Client,
    cache: Arc<RwLock<HashMap<String, CachedResult>>>,
}

#[derive(Debug, Clone)]
struct CachedResult {
    result: serde_json::Value,
    timestamp: chrono::DateTime<chrono::Utc>,
    ttl_seconds: u64,
}

impl CustomAIProcessor {
    pub fn new(config: Arc<RwLock<AIConfig>>) -> Self {
        Self {
            config,
            http_client: reqwest::Client::new(),
            cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    async fn process_mcp_tool(&self, 
        task: &AITask, 
        tool_name: &str, 
        tool_version: &str, 
        tool_config: &serde_json::Value,
        processor_def: &CustomProcessorDef
    ) -> Result<serde_json::Value> {
        // MCP工具调用实现
        let request_body = serde_json::json!({
            "tool": tool_name,
            "version": tool_version,
            "config": tool_config,
            "input": task.input_data,
            "context": {
                "user_id": task.user_id,
                "message_id": task.message_id,
                "task_id": task.id,
            }
        });

        let response = self.http_client
            .post(&processor_def.endpoint)
            .json(&request_body)
            .headers(self.build_headers(&processor_def.headers, &processor_def.api_key)?)
            .timeout(std::time::Duration::from_secs(processor_def.timeout_seconds))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("MCP tool call failed: {}", response.status()));
        }

        let result: serde_json::Value = response.json().await?;
        Ok(result)
    }

    async fn process_knowledge_base(&self,
        task: &AITask,
        kb_id: &str,
        search_type: &str,
        max_results: usize,
        min_score: f32,
        processor_def: &CustomProcessorDef
    ) -> Result<serde_json::Value> {
        // 知识库查询实现
        let query = task.input_data.get("query")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing query in input data"))?;

        let request_body = serde_json::json!({
            "knowledge_base_id": kb_id,
            "query": query,
            "search_type": search_type,
            "max_results": max_results,
            "min_score": min_score,
            "metadata_filters": task.input_data.get("filters"),
        });

        let response = self.http_client
            .post(&processor_def.endpoint)
            .json(&request_body)
            .headers(self.build_headers(&processor_def.headers, &processor_def.api_key)?)
            .timeout(std::time::Duration::from_secs(processor_def.timeout_seconds))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Knowledge base query failed: {}", response.status()));
        }

        let result: serde_json::Value = response.json().await?;
        Ok(result)
    }

    async fn process_rag(&self,
        task: &AITask,
        retriever_endpoint: &str,
        generator_endpoint: &str,
        retriever_config: &serde_json::Value,
        generator_config: &serde_json::Value,
        processor_def: &CustomProcessorDef
    ) -> Result<serde_json::Value> {
        // RAG处理实现
        let query = task.input_data.get("query")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing query in input data"))?;

        // 1. 检索相关文档
        let retriever_request = serde_json::json!({
            "query": query,
            "config": retriever_config,
        });

        let retrieval_response = self.http_client
            .post(retriever_endpoint)
            .json(&retriever_request)
            .headers(self.build_headers(&processor_def.headers, &processor_def.api_key)?)
            .send()
            .await?;

        let documents: serde_json::Value = retrieval_response.json().await?;

        // 2. 生成回答
        let generator_request = serde_json::json!({
            "query": query,
            "context": documents,
            "config": generator_config,
        });

        let generation_response = self.http_client
            .post(generator_endpoint)
            .json(&generator_request)
            .headers(self.build_headers(&processor_def.headers, &processor_def.api_key)?)
            .send()
            .await?;

        let result: serde_json::Value = generation_response.json().await?;
        Ok(result)
    }

    async fn process_http_api(&self,
        task: &AITask,
        method: &str,
        request_template: &serde_json::Value,
        response_mapping: &serde_json::Value,
        processor_def: &CustomProcessorDef
    ) -> Result<serde_json::Value> {
        // 自定义HTTP API调用实现
        let request_body = self.render_template(request_template, &task.input_data)?;
        
        let request = match method.to_uppercase().as_str() {
            "GET" => self.http_client.get(&processor_def.endpoint),
            "POST" => self.http_client.post(&processor_def.endpoint),
            "PUT" => self.http_client.put(&processor_def.endpoint),
            "DELETE" => self.http_client.delete(&processor_def.endpoint),
            _ => return Err(anyhow::anyhow!("Unsupported HTTP method: {}", method)),
        };

        let response = request
            .json(&request_body)
            .headers(self.build_headers(&processor_def.headers, &processor_def.api_key)?)
            .timeout(std::time::Duration::from_secs(processor_def.timeout_seconds))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("HTTP API call failed: {}", response.status()));
        }

        let result: serde_json::Value = response.json().await?;
        let mapped_result = self.apply_response_mapping(&result, response_mapping)?;
        Ok(mapped_result)
    }

    async fn preprocess(&self, input: &serde_json::Value, config: &PreprocessingConfig) -> Result<serde_json::Value> {
        let mut result = input.clone();
        
        for step in &config.steps {
            result = match step {
                PreprocessingStep::TextNormalize { lowercase, remove_punctuation, remove_extra_spaces } => {
                    self.normalize_text(&result, *lowercase, *remove_punctuation, *remove_extra_spaces)?
                }
                PreprocessingStep::TextSplit { method, max_length, overlap } => {
                    self.split_text(&result, method, *max_length, *overlap)?
                }
                PreprocessingStep::DataTransform { jq_expression } => {
                    self.transform_data(&result, jq_expression)?
                }
                PreprocessingStep::TemplateRender { template } => {
                    self.render_template_str(template, &result)?
                }
            };
        }
        
        Ok(result)
    }

    async fn postprocess(&self, output: &serde_json::Value, config: &PostprocessingConfig) -> Result<serde_json::Value> {
        let mut result = output.clone();
        
        for step in &config.steps {
            result = match step {
                PostprocessingStep::JsonExtract { path } => {
                    self.extract_json_path(&result, path)?
                }
                PostprocessingStep::TextFormat { format_template } => {
                    self.format_text(&result, format_template)?
                }
                PostprocessingStep::ResultFilter { condition } => {
                    self.filter_result(&result, condition)?
                }
                PostprocessingStep::ResultMerge { merge_strategy } => {
                    self.merge_results(&result, merge_strategy)?
                }
            };
        }
        
        Ok(result)
    }

    // 辅助方法
    fn build_headers(&self, 
        custom_headers: &HashMap<String, String>, 
        api_key: &str
    ) -> Result<reqwest::header::HeaderMap> {
        let mut headers = reqwest::header::HeaderMap::new();
        
        // 添加API密钥
        if !api_key.is_empty() {
            headers.insert(
                reqwest::header::AUTHORIZATION,
                format!("Bearer {}", api_key).parse()?
            );
        }
        
        // 添加自定义头
        for (key, value) in custom_headers {
            headers.insert(
                reqwest::header::HeaderName::from_bytes(key.as_bytes())?,
                value.parse()?
            );
        }
        
        Ok(headers)
    }

    fn render_template(&self, template: &serde_json::Value, data: &serde_json::Value) -> Result<serde_json::Value> {
        // 使用简单的字符串替换实现模板渲染
        let template_str = serde_json::to_string(template)?;
        let data_str = serde_json::to_string(data)?;
        
        // 替换所有{{input}}标记
        let rendered = template_str.replace("{{input}}", &data_str);
        
        // 替换其他可能的变量
        let mut result = rendered;
        if let serde_json::Value::Object(map) = data {
            for (key, value) in map {
                let placeholder = format!("{{{{{}}}}}", key);
                let value_str = match value {
                    serde_json::Value::String(s) => s.clone(),
                    _ => serde_json::to_string(value)?,
                };
                result = result.replace(&placeholder, &value_str);
            }
        }
        
        Ok(serde_json::from_str(&result)?)
    }

    fn render_template_str(&self, template: &str, data: &serde_json::Value) -> Result<serde_json::Value> {
        let data_str = serde_json::to_string(data)?;
        let mut rendered = template.replace("{{input}}", &data_str);
        
        // 替换其他变量
        if let serde_json::Value::Object(map) = data {
            for (key, value) in map {
                let placeholder = format!("{{{{{}}}}}", key);
                let value_str = match value {
                    serde_json::Value::String(s) => s.clone(),
                    _ => serde_json::to_string(value)?,
                };
                rendered = rendered.replace(&placeholder, &value_str);
            }
        }
        
        Ok(serde_json::Value::String(rendered))
    }

    fn apply_response_mapping(&self, response: &serde_json::Value, mapping: &serde_json::Value) -> Result<serde_json::Value> {
        // 实现响应映射逻辑
        if let Some(extract_path) = mapping.get("extract_path").and_then(|v| v.as_str()) {
            // 简单的JSON路径提取
            let parts: Vec<&str> = extract_path.trim_start_matches("$.").split('.').collect();
            let mut current = response;
            
            for part in parts {
                if let Some(next) = current.get(part) {
                    current = next;
                } else {
                    return Ok(serde_json::Value::Null);
                }
            }
            
            // 应用字段重命名
            if let (Some(rename_map), serde_json::Value::Object(mut obj)) = 
                (mapping.get("rename_fields").and_then(|v| v.as_object()), current.clone()) {
                for (old_name, new_name) in rename_map {
                    if let (Some(value), Some(new_name_str)) = (obj.remove(old_name), new_name.as_str()) {
                        obj.insert(new_name_str.to_string(), value);
                    }
                }
                return Ok(serde_json::Value::Object(obj));
            }
            
            return Ok(current.clone());
        }
        
        Ok(response.clone())
    }

    fn normalize_text(&self, input: &serde_json::Value, lowercase: bool, remove_punctuation: bool, remove_extra_spaces: bool) -> Result<serde_json::Value> {
        // 实现文本规范化
        if let Some(text) = input.as_str() {
            let mut result = text.to_string();
            
            if lowercase {
                result = result.to_lowercase();
            }
            
            if remove_punctuation {
                result = result.chars()
                    .filter(|c| c.is_alphanumeric() || c.is_whitespace())
                    .collect();
            }
            
            if remove_extra_spaces {
                result = result.split_whitespace().collect::<Vec<_>>().join(" ");
            }
            
            return Ok(serde_json::Value::String(result));
        }
        
        Ok(input.clone())
    }

    fn split_text(&self, input: &serde_json::Value, method: &str, max_length: usize, overlap: usize) -> Result<serde_json::Value> {
        // 实现文本分割
        if let Some(text) = input.as_str() {
            let chunks = match method {
                "sentence" => {
                    // 按句子分割
                    text.split(|c| c == '。' || c == '！' || c == '？' || c == '.' || c == '!' || c == '?')
                        .filter(|s| !s.is_empty())
                        .map(|s| s.trim().to_string())
                        .collect::<Vec<_>>()
                }
                "paragraph" => {
                    // 按段落分割
                    text.split("\n\n")
                        .filter(|s| !s.is_empty())
                        .map(|s| s.trim().to_string())
                        .collect::<Vec<_>>()
                }
                "token" | _ => {
                    // 按固定长度分割
                    let chars: Vec<char> = text.chars().collect();
                    let mut chunks = Vec::new();
                    let mut i = 0;
                    
                    while i < chars.len() {
                        let end = (i + max_length).min(chars.len());
                        let chunk: String = chars[i..end].iter().collect();
                        chunks.push(chunk);
                        
                        if i + max_length >= chars.len() {
                            break;
                        }
                        
                        i += max_length - overlap;
                    }
                    
                    chunks
                }
            };
            
            return Ok(serde_json::json!(chunks));
        }
        
        Ok(input.clone())
    }

    fn transform_data(&self, input: &serde_json::Value, jq_expression: &str) -> Result<serde_json::Value> {
        // 简单的数据转换实现（不使用真正的JQ）
        // 这里只实现一些基本的转换
        match jq_expression {
            ".text" => Ok(input.get("text").cloned().unwrap_or(serde_json::Value::Null)),
            ".query" => Ok(input.get("query").cloned().unwrap_or(serde_json::Value::Null)),
            "." => Ok(input.clone()),
            _ => {
                // 对于复杂的JQ表达式，暂时返回原始数据
                tracing::warn!("Unsupported JQ expression: {}", jq_expression);
                Ok(input.clone())
            }
        }
    }

    fn extract_json_path(&self, input: &serde_json::Value, path: &str) -> Result<serde_json::Value> {
        // 实现JSON路径提取
        let parts: Vec<&str> = path.trim_start_matches("$.").split('.').collect();
        let mut current = input;
        
        for part in parts {
            if part.contains('[') && part.contains(']') {
                // 处理数组索引
                let (field, index_str) = part.split_once('[').unwrap();
                let index = index_str.trim_end_matches(']').parse::<usize>()?;
                
                if !field.is_empty() {
                    current = current.get(field).ok_or_else(|| anyhow::anyhow!("Field not found: {}", field))?;
                }
                
                current = current.get(index).ok_or_else(|| anyhow::anyhow!("Index out of bounds: {}", index))?;
            } else {
                current = current.get(part).ok_or_else(|| anyhow::anyhow!("Field not found: {}", part))?;
            }
        }
        
        Ok(current.clone())
    }

    fn format_text(&self, input: &serde_json::Value, format_template: &str) -> Result<serde_json::Value> {
        // 实现文本格式化
        let mut result = format_template.to_string();
        
        // 替换{{result}}
        let input_str = match input {
            serde_json::Value::String(s) => s.clone(),
            _ => serde_json::to_string(input)?,
        };
        result = result.replace("{{result}}", &input_str);
        result = result.replace("{{input}}", &input_str);
        
        // 替换其他可能的占位符
        if let serde_json::Value::Object(map) = input {
            for (key, value) in map {
                let placeholder = format!("{{{{{}}}}}", key);
                let value_str = match value {
                    serde_json::Value::String(s) => s.clone(),
                    _ => serde_json::to_string(value)?,
                };
                result = result.replace(&placeholder, &value_str);
            }
        }
        
        Ok(serde_json::Value::String(result))
    }

    fn filter_result(&self, input: &serde_json::Value, condition: &str) -> Result<serde_json::Value> {
        // 实现结果过滤
        // 简单的条件评估
        let parts: Vec<&str> = condition.split_whitespace().collect();
        if parts.len() != 3 {
            return Ok(input.clone());
        }
        
        let field = parts[0];
        let op = parts[1];
        let value = parts[2];
        
        // 获取字段值
        let field_value = if field == "score" || field == "confidence" {
            input.get(field).and_then(|v| v.as_f64())
        } else {
            None
        };
        
        if let Some(fv) = field_value {
            let threshold = value.parse::<f64>()?;
            let passes = match op {
                ">" => fv > threshold,
                ">=" => fv >= threshold,
                "<" => fv < threshold,
                "<=" => fv <= threshold,
                "==" => (fv - threshold).abs() < f64::EPSILON,
                _ => true,
            };
            
            if passes {
                Ok(input.clone())
            } else {
                Ok(serde_json::Value::Null)
            }
        } else {
            Ok(input.clone())
        }
    }

    fn merge_results(&self, input: &serde_json::Value, merge_strategy: &str) -> Result<serde_json::Value> {
        // 实现结果合并
        if let serde_json::Value::Array(arr) = input {
            match merge_strategy {
                "concat" => {
                    // 连接所有结果
                    let mut merged = Vec::new();
                    for item in arr {
                        if let serde_json::Value::Array(sub_arr) = item {
                            merged.extend(sub_arr.clone());
                        } else {
                            merged.push(item.clone());
                        }
                    }
                    Ok(serde_json::json!(merged))
                }
                "best" => {
                    // 选择最佳结果（基于score字段）
                    let best = arr.iter()
                        .max_by(|a, b| {
                            let a_score = a.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let b_score = b.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            a_score.partial_cmp(&b_score).unwrap_or(std::cmp::Ordering::Equal)
                        });
                    Ok(best.cloned().unwrap_or(serde_json::Value::Null))
                }
                "vote" => {
                    // 投票机制（选择出现次数最多的）
                    let mut counts = std::collections::HashMap::new();
                    for item in arr {
                        let key = serde_json::to_string(item)?;
                        *counts.entry(key).or_insert(0) += 1;
                    }
                    
                    if let Some((most_common, _)) = counts.iter().max_by_key(|(_, count)| *count) {
                        Ok(serde_json::from_str(most_common)?)
                    } else {
                        Ok(serde_json::Value::Null)
                    }
                }
                _ => Ok(input.clone()),
            }
        } else {
            Ok(input.clone())
        }
    }
}

#[async_trait]
impl AIProcessor for CustomAIProcessor {
    async fn process(&self, task: &AITask) -> Result<serde_json::Value> {
        // 获取自定义处理器ID
        let processor_id = task.input_data.get("processor_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing processor_id in input data"))?;

        // 查找处理器定义
        let config = self.config.read().await;
        let custom_config = config.custom_processor
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Custom processor not configured"))?;

        let processor_def = custom_config.processors
            .iter()
            .find(|p| p.id == processor_id)
            .ok_or_else(|| anyhow::anyhow!("Processor not found: {}", processor_id))?;

        // 检查缓存
        if processor_def.cache_enabled {
            let cache_key = format!("{}:{}", processor_id, serde_json::to_string(&task.input_data)?);
            let cache = self.cache.read().await;
            if let Some(cached) = cache.get(&cache_key) {
                if cached.timestamp + chrono::Duration::seconds(cached.ttl_seconds as i64) > chrono::Utc::now() {
                    return Ok(cached.result.clone());
                }
            }
        }

        // 处理请求
        let result = match &processor_def.processor_type {
            CustomProcessorType::MCPTool { tool_name, tool_version, tool_config } => {
                // MCP工具处理保持原样
                self.process_mcp_tool(
                    &task,
                    tool_name,
                    tool_version,
                    tool_config,
                    processor_def
                ).await?
            }
            _ => {
                // 其他处理器类型需要预处理
                let processed_input: serde_json::Value;
                
                // 预处理
                if let Some(preprocessing) = &processor_def.preprocessing {
                    processed_input = self.preprocess(&task.input_data, preprocessing).await?;
                } else {
                    processed_input = task.input_data.clone();
                }
                
                // 根据类型处理
                match &processor_def.processor_type {
                    CustomProcessorType::HttpAPI { method, request_template, response_mapping } => {
                        // 处理HTTP API
                        let result = self.process_http_api(
                            &task,
                            method,
                            request_template,
                            response_mapping,
                            processor_def
                        ).await?;
                        result
                    }
                    CustomProcessorType::KnowledgeBase { kb_id, search_type, max_results, min_score } => {
                        self.process_knowledge_base(
                            &task,
                            kb_id,
                            search_type,
                            *max_results,
                            *min_score,
                            processor_def
                        ).await?
                    }
                    CustomProcessorType::RAG { retriever_endpoint, generator_endpoint, retriever_config, generator_config } => {
                        self.process_rag(
                            &task,
                            retriever_endpoint,
                            generator_endpoint,
                            retriever_config,
                            generator_config,
                            processor_def
                        ).await?
                    }
                    _ => {
                        return Err(anyhow::anyhow!("不支持的处理器类型"));
                    }
                }
            }
        };

        // 后处理
        let mut output = result;
        if let Some(postprocessing) = &processor_def.postprocessing {
            output = self.postprocess(&output, postprocessing).await?;
        }

        // 更新缓存
        if processor_def.cache_enabled {
            let cache_key = format!("{}:{}", processor_id, serde_json::to_string(&task.input_data)?);
            let mut cache = self.cache.write().await;
            cache.insert(cache_key, CachedResult {
                result: output.clone(),
                timestamp: chrono::Utc::now(),
                ttl_seconds: processor_def.cache_ttl_seconds,
            });
        }

        Ok(output)
    }

    fn get_task_type(&self) -> AITaskType {
        AITaskType::CustomProcessor
    }

    fn get_name(&self) -> &'static str {
        "CustomAIProcessor"
    }
}

impl Default for CustomProcessorConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            processors: vec![
                // 示例MCP工具处理器
                CustomProcessorDef {
                    id: "mcp_search".to_string(),
                    name: "MCP Search Tool".to_string(),
                    description: "Search using MCP tool".to_string(),
                    processor_type: CustomProcessorType::MCPTool {
                        tool_name: "search".to_string(),
                        tool_version: "1.0".to_string(),
                        tool_config: serde_json::json!({
                            "index": "default",
                            "fields": ["title", "content"]
                        }),
                    },
                    endpoint: "http://localhost:8081/mcp/tools/execute".to_string(),
                    api_key: "".to_string(),
                    headers: HashMap::new(),
                    timeout_seconds: 30,
                    max_retries: 3,
                    preprocessing: None,
                    postprocessing: None,
                    cache_enabled: true,
                    cache_ttl_seconds: 300,
                },
                // 示例知识库处理器
                CustomProcessorDef {
                    id: "kb_faq".to_string(),
                    name: "FAQ Knowledge Base".to_string(),
                    description: "Query FAQ knowledge base".to_string(),
                    processor_type: CustomProcessorType::KnowledgeBase {
                        kb_id: "faq_v1".to_string(),
                        search_type: "hybrid".to_string(),
                        max_results: 5,
                        min_score: 0.7,
                    },
                    endpoint: "http://localhost:8082/kb/search".to_string(),
                    api_key: "".to_string(),
                    headers: HashMap::new(),
                    timeout_seconds: 10,
                    max_retries: 2,
                    preprocessing: Some(PreprocessingConfig {
                        steps: vec![
                            PreprocessingStep::TextNormalize {
                                lowercase: true,
                                remove_punctuation: false,
                                remove_extra_spaces: true,
                            }
                        ],
                    }),
                    postprocessing: None,
                    cache_enabled: true,
                    cache_ttl_seconds: 600,
                },
            ],
        }
    }
}