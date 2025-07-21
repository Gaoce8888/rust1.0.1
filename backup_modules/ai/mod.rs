pub mod config;
pub mod intent_recognition;
pub mod translation;
pub mod speech_recognition;
pub mod queue;
pub mod react_component_generator;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};

// AI处理任务类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AITaskType {
    IntentRecognition,
    Translation,
    SpeechRecognition,
    SentimentAnalysis,
    AutoReply,
}

// AI处理任务状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AITaskStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

// AI处理任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AITask {
    pub id: String,
    pub task_type: AITaskType,
    pub status: AITaskStatus,
    pub user_id: String,
    pub message_id: String,
    pub input_data: serde_json::Value,
    pub output_data: Option<serde_json::Value>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub priority: u8,
    pub retry_count: u32,
    pub max_retries: u32,
    pub metadata: std::collections::HashMap<String, String>,
}

impl AITask {
    pub fn new(
        task_type: AITaskType,
        user_id: String,
        message_id: String,
        input_data: serde_json::Value,
        priority: u8,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            task_type,
            status: AITaskStatus::Pending,
            user_id,
            message_id,
            input_data,
            output_data: None,
            error_message: None,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
            priority,
            retry_count: 0,
            max_retries: 3,
            metadata: std::collections::HashMap::new(),
        }
    }

    #[allow(dead_code)]
    pub fn start_processing(&mut self) {
        self.status = AITaskStatus::Processing;
        self.started_at = Some(Utc::now());
    }

    #[allow(dead_code)]
    pub fn complete(&mut self, output: serde_json::Value) {
        self.status = AITaskStatus::Completed;
        self.output_data = Some(output);
        self.completed_at = Some(Utc::now());
    }

    #[allow(dead_code)]
    pub fn fail(&mut self, error: String) {
        self.status = AITaskStatus::Failed;
        self.error_message = Some(error);
        self.completed_at = Some(Utc::now());
    }

    #[allow(dead_code)]
    pub fn can_retry(&self) -> bool {
        self.retry_count < self.max_retries
    }

    #[allow(dead_code)]
    pub fn retry(&mut self) {
        self.retry_count += 1;
        self.status = AITaskStatus::Pending;
        self.started_at = None;
        self.completed_at = None;
        self.error_message = None;
    }
}

// AI处理结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResult {
    pub task_id: String,
    pub task_type: AITaskType,
    pub user_id: String,
    pub message_id: String,
    pub result: serde_json::Value,
    pub confidence: f32,
    pub processing_time_ms: u64,
    pub created_at: DateTime<Utc>,
}

// AI处理器接口
#[async_trait::async_trait]
pub trait AIProcessor: Send + Sync {
    #[allow(dead_code)]
    async fn process(&self, task: &AITask) -> Result<serde_json::Value>;
    #[allow(dead_code)]
    fn get_task_type(&self) -> AITaskType;
    #[allow(dead_code)]
    fn get_name(&self) -> &'static str;
}

// AI管理器
pub struct AIManager {
    pub queue: Arc<RwLock<queue::AIQueue>>,
    #[allow(dead_code)]
    pub intent_processor: Arc<intent_recognition::IntentProcessor>,
    #[allow(dead_code)]
    pub translation_processor: Arc<translation::TranslationProcessor>,
    #[allow(dead_code)]
    pub speech_processor: Arc<speech_recognition::SpeechProcessor>,
    pub config: Arc<RwLock<config::AIConfig>>,
}

impl AIManager {
    pub fn new() -> Self {
        let config = Arc::new(RwLock::new(config::AIConfig::default()));
        
        Self {
            queue: Arc::new(RwLock::new(queue::AIQueue::new())),
            intent_processor: Arc::new(intent_recognition::IntentProcessor::new(config.clone())),
            translation_processor: Arc::new(translation::TranslationProcessor::new(config.clone())),
            speech_processor: Arc::new(speech_recognition::SpeechProcessor::new(config.clone())),
            config,
        }
    }

    pub async fn submit_task(&self, task: AITask) -> Result<String> {
        let task_id = task.id.clone();
        let mut queue = self.queue.write().await;
        queue.enqueue(task).await?;
        Ok(task_id)
    }

    pub async fn get_task_status(&self, task_id: &str) -> Result<Option<AITaskStatus>> {
        let queue = self.queue.read().await;
        Ok(queue.get_task_status(task_id).await)
    }

    pub async fn get_task_result(&self, task_id: &str) -> Result<Option<AIResult>> {
        let queue = self.queue.read().await;
        queue.get_task_result(task_id).await
    }

    #[allow(dead_code)]
    pub async fn start_processing(&self) -> Result<()> {
        let queue = self.queue.clone();
        let intent_processor = self.intent_processor.clone();
        let translation_processor = self.translation_processor.clone();
        let speech_processor = self.speech_processor.clone();

        tokio::spawn(async move {
            loop {
                let task = {
                    let mut queue_lock = queue.write().await;
                    match queue_lock.dequeue().await {
                        Ok(Some(task)) => task,
                        Ok(None) => {
                            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                            continue;
                        }
                        Err(e) => {
                            tracing::error!("队列处理错误: {}", e);
                            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                            continue;
                        }
                    }
                };

                let processor: Arc<dyn AIProcessor> = match task.task_type {
                    AITaskType::IntentRecognition => intent_processor.clone(),
                    AITaskType::Translation => translation_processor.clone(),
                    AITaskType::SpeechRecognition => speech_processor.clone(),
                    _ => {
                        tracing::warn!("未支持的AI任务类型: {:?}", task.task_type);
                        continue;
                    }
                };

                let task_id = task.id.clone();
                let result = processor.process(&task).await;

                let mut queue_lock = queue.write().await;
                match result {
                    Ok(output) => {
                        if let Err(e) = queue_lock.complete_task(&task_id, output).await {
                            tracing::error!("完成任务失败: {}", e);
                        }
                    }
                    Err(e) => {
                        tracing::error!("处理任务失败: {}", e);
                        if let Err(e) = queue_lock.fail_task(&task_id, e.to_string()).await {
                            tracing::error!("标记任务失败: {}", e);
                        }
                    }
                }
            }
        });

        Ok(())
    }

    pub async fn update_config(&self, config: config::AIConfig) -> Result<()> {
        let mut config_lock = self.config.write().await;
        *config_lock = config;
        Ok(())
    }

    pub async fn get_config(&self) -> config::AIConfig {
        let config_lock = self.config.read().await;
        config_lock.clone()
    }

    pub async fn get_statistics(&self) -> Result<serde_json::Value> {
        let queue = self.queue.read().await;
        Ok(queue.get_statistics().await)
    }
}

// AI消息处理结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIMessageResult {
    pub message_id: String,
    pub user_id: String,
    pub intent: Option<String>,
    pub intent_confidence: Option<f32>,
    pub translation: Option<String>,
    pub translation_source_lang: Option<String>,
    pub translation_target_lang: Option<String>,
    pub speech_text: Option<String>,
    pub speech_confidence: Option<f32>,
    pub sentiment: Option<String>,
    pub sentiment_score: Option<f32>,
    pub auto_reply: Option<String>,
    pub processing_time_ms: u64,
    pub created_at: DateTime<Utc>,
}

impl AIMessageResult {
    #[allow(dead_code)]
    pub fn new(message_id: String, user_id: String) -> Self {
        Self {
            message_id,
            user_id,
            intent: None,
            intent_confidence: None,
            translation: None,
            translation_source_lang: None,
            translation_target_lang: None,
            speech_text: None,
            speech_confidence: None,
            sentiment: None,
            sentiment_score: None,
            auto_reply: None,
            processing_time_ms: 0,
            created_at: Utc::now(),
        }
    }
} 