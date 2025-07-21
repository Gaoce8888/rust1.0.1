use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use super::{AIProcessor, AITask, AITaskType, config::AIConfig};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentResult {
    pub intent: String,
    pub confidence: f32,
    pub entities: Vec<Entity>,
    pub sentiment: Option<String>,
    pub language: String,
    pub original_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub name: String,
    pub value: String,
    pub confidence: f32,
    pub start_pos: usize,
    pub end_pos: usize,
}

pub struct IntentProcessor {
    config: Arc<RwLock<AIConfig>>,
    http_client: reqwest::Client,
}

// 确保IntentProcessor可以在线程间安全传递
unsafe impl Send for IntentProcessor {}
unsafe impl Sync for IntentProcessor {}

impl IntentProcessor {
    pub fn new(config: Arc<RwLock<AIConfig>>) -> Self {
        Self {
            config,
            http_client: reqwest::Client::new(),
        }
    }

    async fn preprocess_text(&self, text: &str) -> Result<String> {
        let config = self.config.read().await;
        let preprocessing = &config.intent_recognition.preprocessing;
        
        let mut processed = text.to_string();
        
        if preprocessing.normalize_text {
            processed = processed.trim().to_string();
        }
        
        if preprocessing.convert_to_lowercase {
            processed = processed.to_lowercase();
        }
        
        if preprocessing.remove_punctuation {
            processed = processed.chars()
                .filter(|c| c.is_alphanumeric() || c.is_whitespace())
                .collect();
        }
        
        // 应用自定义过滤器
        for filter in &preprocessing.custom_filters {
            processed = processed.replace(filter, "");
        }
        
        Ok(processed)
    }

    async fn detect_intent_openai(&self, text: &str) -> Result<IntentResult> {
        let config = self.config.read().await;
        let intent_config = &config.intent_recognition;
        
        let prompt = format!(
            "请分析以下文本的意图，并返回JSON格式的结果：\
            \n文本：{}\
            \n支持的意图类型：{}\
            \n返回格式：{{\
            \n  \"intent\": \"意图名称\",\
            \n  \"confidence\": 0.95,\
            \n  \"entities\": [],\
            \n  \"sentiment\": \"positive/negative/neutral\",\
            \n  \"language\": \"zh\"\
            \n}}",
            text,
            intent_config.custom_intents.iter()
                .map(|i| format!("{}({})", i.name, i.description))
                .collect::<Vec<_>>()
                .join(", ")
        );

        let request_body = serde_json::json!({
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": "你是一个专业的意图识别助手，请准确分析用户的意图。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 500
        });

        let response = self.http_client
            .post(&intent_config.api_endpoint)
            .header("Authorization", format!("Bearer {}", intent_config.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_secs(intent_config.timeout_seconds))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("OpenAI API 请求失败: {}", response.status()));
        }

        let response_body: serde_json::Value = response.json().await?;
        
        let content = response_body["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("无法解析OpenAI响应"))?;

        // 尝试解析JSON响应
        let intent_result: IntentResult = serde_json::from_str(content)
            .map_err(|e| anyhow::anyhow!("解析意图结果失败: {}", e))?;

        Ok(IntentResult {
            original_text: text.to_string(),
            ..intent_result
        })
    }

    async fn detect_intent_rule_based(&self, text: &str) -> Result<IntentResult> {
        let config = self.config.read().await;
        let intent_config = &config.intent_recognition;
        
        let processed_text = self.preprocess_text(text).await?;
        let mut best_intent = "unknown".to_string();
        let mut best_confidence = 0.0f32;
        
        // 基于规则的意图识别
        for custom_intent in &intent_config.custom_intents {
            let mut confidence = 0.0f32;
            
            // 检查关键词匹配
            for keyword in &custom_intent.keywords {
                if processed_text.contains(keyword) {
                    confidence += 0.3;
                }
            }
            
            // 检查模式匹配
            for pattern in &custom_intent.patterns {
                if processed_text.contains(pattern) {
                    confidence += 0.5;
                }
            }
            
            // 应用置信度提升
            confidence += custom_intent.confidence_boost;
            
            if confidence > best_confidence {
                best_confidence = confidence;
                best_intent = custom_intent.name.clone();
            }
        }
        
        // 如果置信度低于阈值，标记为未知
        if best_confidence < intent_config.confidence_threshold {
            best_intent = "unknown".to_string();
            best_confidence = 0.1;
        }
        
        Ok(IntentResult {
            intent: best_intent,
            confidence: best_confidence,
            entities: vec![], // 简单规则不提取实体
            sentiment: None,
            language: "zh".to_string(),
            original_text: text.to_string(),
        })
    }

    async fn extract_entities(&self, text: &str) -> Result<Vec<Entity>> {
        // 简单的实体提取逻辑
        let mut entities = Vec::new();
        
        // 提取订单号（简单模式）
        if let Some(captures) = regex::Regex::new(r"订单号[:：]\s*(\w+)")
            .unwrap()
            .captures(text) {
            if let Some(order_match) = captures.get(1) {
                entities.push(Entity {
                    name: "order_number".to_string(),
                    value: order_match.as_str().to_string(),
                    confidence: 0.9,
                    start_pos: order_match.start(),
                    end_pos: order_match.end(),
                });
            }
        }
        
        // 提取电话号码
        if let Some(captures) = regex::Regex::new(r"1[3-9]\d{9}")
            .unwrap()
            .captures(text) {
            if let Some(phone_match) = captures.get(0) {
                entities.push(Entity {
                    name: "phone_number".to_string(),
                    value: phone_match.as_str().to_string(),
                    confidence: 0.8,
                    start_pos: phone_match.start(),
                    end_pos: phone_match.end(),
                });
            }
        }
        
        // 提取金额
        if let Some(captures) = regex::Regex::new(r"(\d+(?:\.\d+)?)\s*(?:元|块|钱)")
            .unwrap()
            .captures(text) {
            if let Some(amount_match) = captures.get(1) {
                entities.push(Entity {
                    name: "amount".to_string(),
                    value: amount_match.as_str().to_string(),
                    confidence: 0.8,
                    start_pos: amount_match.start(),
                    end_pos: amount_match.end(),
                });
            }
        }
        
        Ok(entities)
    }

    async fn detect_language(&self, text: &str) -> String {
        // 简单的语言检测
        let chinese_chars = text.chars().filter(|c| {
            (*c as u32) >= 0x4e00 && (*c as u32) <= 0x9fff
        }).count();
        
        let total_chars = text.chars().count();
        
        if chinese_chars > total_chars / 2 {
            "zh".to_string()
        } else {
            "en".to_string()
        }
    }

    async fn detect_sentiment(&self, text: &str) -> Option<String> {
        // 简单的情感分析
        let positive_words = vec!["好", "棒", "赞", "喜欢", "满意", "excellent", "good", "great"];
        let negative_words = vec!["不好", "差", "烂", "讨厌", "不满意", "bad", "terrible", "awful"];
        
        let mut positive_count = 0;
        let mut negative_count = 0;
        
        for word in positive_words {
            if text.contains(word) {
                positive_count += 1;
            }
        }
        
        for word in negative_words {
            if text.contains(word) {
                negative_count += 1;
            }
        }
        
        match positive_count.cmp(&negative_count) {
            std::cmp::Ordering::Greater => Some("positive".to_string()),
            std::cmp::Ordering::Less => Some("negative".to_string()),
            std::cmp::Ordering::Equal => Some("neutral".to_string()),
        }
    }
}

#[async_trait::async_trait]
impl AIProcessor for IntentProcessor {
    async fn process(&self, task: &AITask) -> Result<serde_json::Value> {
        let text = task.input_data["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少文本输入"))?;

        let config = self.config.read().await;
        let intent_config = &config.intent_recognition;
        
        let mut result = if intent_config.model_type == "openai" && !intent_config.api_key.is_empty() {
            self.detect_intent_openai(text).await
        } else {
            self.detect_intent_rule_based(text).await
        }?;

        // 提取实体
        result.entities = self.extract_entities(text).await?;
        
        // 检测语言
        result.language = self.detect_language(text).await;
        
        // 检测情感
        if result.sentiment.is_none() {
            result.sentiment = self.detect_sentiment(text).await;
        }
        
        Ok(serde_json::to_value(result)?)
    }

    fn get_task_type(&self) -> AITaskType {
        AITaskType::IntentRecognition
    }

    fn get_name(&self) -> &'static str {
        "意图识别处理器"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::config::AIConfig;

    #[tokio::test]
    async fn test_intent_recognition_basic() {
        let config = Arc::new(RwLock::new(AIConfig::default()));
        let processor = IntentProcessor::new(config);
        
        let task = AITask::new(
            AITaskType::IntentRecognition,
            "user1".to_string(),
            "msg1".to_string(),
            serde_json::json!({
                "text": "我要投诉这个产品质量有问题"
            }),
            5,
        );

        let result = processor.process(&task).await.unwrap();
        let intent_result: IntentResult = serde_json::from_value(result).unwrap();
        
        assert_eq!(intent_result.intent, "complaint");
        assert!(intent_result.confidence > 0.0);
        assert_eq!(intent_result.language, "zh");
    }

    #[tokio::test]
    async fn test_entity_extraction() {
        let config = Arc::new(RwLock::new(AIConfig::default()));
        let processor = IntentProcessor::new(config);
        
        let entities = processor.extract_entities("我的订单号：ABC123456，金额是99.9元").await.unwrap();
        
        assert_eq!(entities.len(), 2);
        assert_eq!(entities[0].name, "order_number");
        assert_eq!(entities[0].value, "ABC123456");
        assert_eq!(entities[1].name, "amount");
        assert_eq!(entities[1].value, "99.9");
    }
} 