use std::sync::Arc;
use warp::{Filter, Reply};
use serde::{Deserialize, Serialize};
use crate::ai::{AIManager, AITask, AITaskType, config::AIConfig};
use anyhow::Result;

// API请求结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitTaskRequest {
    pub task_type: AITaskType,
    pub user_id: String,
    pub message_id: String,
    pub input_data: serde_json::Value,
    pub priority: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResponse {
    pub task_id: String,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStatusResponse {
    pub task_id: String,
    pub status: String,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigUpdateRequest {
    pub config: AIConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigResponse {
    pub config: AIConfig,
    pub enabled_features: Vec<String>,
}

pub struct AIHandler {
    ai_manager: Arc<AIManager>,
}

impl AIHandler {
    pub fn new(ai_manager: Arc<AIManager>) -> Self {
        Self { ai_manager }
    }

    pub fn routes(&self) -> impl Filter<Extract = impl Reply + use<>, Error = warp::Rejection> + Clone + use<> {
        let ai_manager = self.ai_manager.clone();
        
        warp::path("ai")
            .and(
                // 提交AI任务
                warp::path("tasks")
                    .and(warp::post())
                    .and(warp::body::json())
                    .and(with_ai_manager(ai_manager.clone()))
                    .and_then(submit_task)
                    .or(
                        // 获取任务状态
                        warp::path("tasks")
                            .and(warp::path::param::<String>())
                            .and(warp::get())
                            .and(with_ai_manager(ai_manager.clone()))
                            .and_then(get_task_status)
                    )
                    .or(
                        // 获取任务结果
                        warp::path("tasks")
                            .and(warp::path::param::<String>())
                            .and(warp::path("result"))
                            .and(warp::get())
                            .and(with_ai_manager(ai_manager.clone()))
                            .and_then(get_task_result)
                    )
                    .or(
                        // 取消任务
                        warp::path("tasks")
                            .and(warp::path::param::<String>())
                            .and(warp::delete())
                            .and(with_ai_manager(ai_manager.clone()))
                            .and_then(cancel_task)
                    )
                    .or(
                        // 获取配置
                        warp::path("config")
                            .and(warp::get())
                            .and(with_ai_manager(ai_manager.clone()))
                            .and_then(get_config)
                    )
                    .or(
                        // 更新配置
                        warp::path("config")
                            .and(warp::put())
                            .and(warp::body::json())
                            .and(with_ai_manager(ai_manager.clone()))
                            .and_then(update_config)
                    )
                    .or(
                        // 获取统计信息
                        warp::path("statistics")
                            .and(warp::get())
                            .and(with_ai_manager(ai_manager.clone()))
                            .and_then(get_statistics)
                    )
                    .or(
                        // 批量处理消息
                        warp::path("batch")
                            .and(warp::post())
                            .and(warp::body::json())
                            .and(with_ai_manager(ai_manager.clone()))
                            .and_then(batch_process)
                    )
            )
    }
}

fn with_ai_manager(ai_manager: Arc<AIManager>) -> impl Filter<Extract = (Arc<AIManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || ai_manager.clone())
}

async fn submit_task(
    request: SubmitTaskRequest,
    ai_manager: Arc<AIManager>,
) -> Result<impl Reply, warp::Rejection> {
    let task = AITask::new(
        request.task_type,
        request.user_id,
        request.message_id,
        request.input_data,
        request.priority.unwrap_or(5),
    );

    match ai_manager.submit_task(task).await {
        Ok(task_id) => {
            let response = TaskResponse {
                task_id,
                status: "submitted".to_string(),
                message: "任务已提交到AI处理队列".to_string(),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = TaskResponse {
                task_id: String::new(),
                status: "error".to_string(),
                message: e.to_string(),
            };
            Ok(warp::reply::json(&response))
        }
    }
}

async fn get_task_status(
    task_id: String,
    ai_manager: Arc<AIManager>,
) -> Result<impl Reply, warp::Rejection> {
    match ai_manager.get_task_status(&task_id).await {
        Ok(Some(status)) => {
            let response = TaskStatusResponse {
                task_id,
                status: format!("{:?}", status),
                result: None,
                error: None,
            };
            Ok(warp::reply::json(&response))
        }
        Ok(None) => {
            let response = TaskStatusResponse {
                task_id,
                status: "not_found".to_string(),
                result: None,
                error: Some("任务不存在".to_string()),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = TaskStatusResponse {
                task_id,
                status: "error".to_string(),
                result: None,
                error: Some(e.to_string()),
            };
            Ok(warp::reply::json(&response))
        }
    }
}

async fn get_task_result(
    task_id: String,
    ai_manager: Arc<AIManager>,
) -> Result<impl Reply, warp::Rejection> {
    match ai_manager.get_task_result(&task_id).await {
        Ok(Some(result)) => {
            let response = TaskStatusResponse {
                task_id,
                status: "completed".to_string(),
                result: Some(serde_json::to_value(result).unwrap()),
                error: None,
            };
            Ok(warp::reply::json(&response))
        }
        Ok(None) => {
            let response = TaskStatusResponse {
                task_id,
                status: "not_found".to_string(),
                result: None,
                error: Some("任务结果不存在".to_string()),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = TaskStatusResponse {
                task_id,
                status: "error".to_string(),
                result: None,
                error: Some(e.to_string()),
            };
            Ok(warp::reply::json(&response))
        }
    }
}

async fn cancel_task(
    task_id: String,
    ai_manager: Arc<AIManager>,
) -> Result<impl Reply, warp::Rejection> {
    match ai_manager.queue.write().await.cancel_task(&task_id).await {
        Ok(cancelled) => {
            let response = TaskResponse {
                task_id,
                status: if cancelled { "cancelled" } else { "not_found" }.to_string(),
                message: if cancelled { "任务已取消" } else { "任务不存在" }.to_string(),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = TaskResponse {
                task_id,
                status: "error".to_string(),
                message: e.to_string(),
            };
            Ok(warp::reply::json(&response))
        }
    }
}

async fn get_config(
    ai_manager: Arc<AIManager>,
) -> Result<impl Reply, warp::Rejection> {
    let config = ai_manager.get_config().await;
    let enabled_features = config.get_enabled_features();
    
    let response = ConfigResponse {
        config,
        enabled_features,
    };
    
    Ok(warp::reply::json(&response))
}

async fn update_config(
    request: ConfigUpdateRequest,
    ai_manager: Arc<AIManager>,
) -> Result<impl Reply, warp::Rejection> {
    match request.config.validate() {
        Ok(_) => {
            match ai_manager.update_config(request.config.clone()).await {
                Ok(_) => {
                    let response = ConfigResponse {
                        config: request.config.clone(),
                        enabled_features: request.config.get_enabled_features(),
                    };
                    Ok(warp::reply::json(&response))
                }
                Err(e) => {
                    let error_response = serde_json::json!({
                        "error": e.to_string(),
                        "status": "error"
                    });
                    Ok(warp::reply::json(&error_response))
                }
            }
        }
        Err(e) => {
            let error_response = serde_json::json!({
                "error": e,
                "status": "validation_error"
            });
            Ok(warp::reply::json(&error_response))
        }
    }
}

async fn get_statistics(
    ai_manager: Arc<AIManager>,
) -> Result<impl Reply, warp::Rejection> {
    match ai_manager.get_statistics().await {
        Ok(stats) => Ok(warp::reply::json(&stats)),
        Err(e) => {
            let error_response = serde_json::json!({
                "error": e.to_string(),
                "status": "error"
            });
            Ok(warp::reply::json(&error_response))
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchProcessRequest {
    pub messages: Vec<BatchMessage>,
    pub priority: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchMessage {
    pub user_id: String,
    pub message_id: String,
    pub text: String,
    pub task_types: Vec<AITaskType>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchProcessResponse {
    pub submitted_tasks: Vec<String>,
    pub failed_tasks: Vec<String>,
    pub total_messages: usize,
    pub success_rate: f32,
}

async fn batch_process(
    request: BatchProcessRequest,
    ai_manager: Arc<AIManager>,
) -> Result<impl Reply, warp::Rejection> {
    let mut submitted_tasks = Vec::new();
    let mut failed_tasks = Vec::new();
    let priority = request.priority.unwrap_or(5);

    let total_messages = request.messages.len();
    
    for message in &request.messages {
        for task_type in &message.task_types {
            let input_data = serde_json::json!({
                "text": message.text,
                "metadata": message.metadata
            });

            let task = AITask::new(
                task_type.clone(),
                message.user_id.clone(),
                message.message_id.clone(),
                input_data,
                priority,
            );

            match ai_manager.submit_task(task).await {
                Ok(task_id) => submitted_tasks.push(task_id),
                Err(_) => failed_tasks.push(format!("{}:{:?}", message.message_id, task_type)),
            }
        }
    }
    let success_rate = if total_messages > 0 {
        (submitted_tasks.len() as f32) / (submitted_tasks.len() + failed_tasks.len()) as f32
    } else {
        0.0
    };

    let response = BatchProcessResponse {
        submitted_tasks,
        failed_tasks,
        total_messages,
        success_rate,
    };

    Ok(warp::reply::json(&response))
}

// WebSocket集成的辅助函数
#[allow(dead_code)]
pub async fn process_message_with_ai(
    ai_manager: Arc<AIManager>,
    user_id: String,
    message_id: String,
    content: String,
    content_type: &str,
) -> Result<Vec<String>> {
    let mut task_ids = Vec::new();
    
    // 根据消息类型决定要执行的AI任务
    let task_types = determine_ai_tasks(content_type);
    
    for task_type in task_types {
        let input_data = match task_type {
            AITaskType::IntentRecognition => serde_json::json!({
                "text": content
            }),
            AITaskType::Translation => serde_json::json!({
                "text": content,
                "source_language": "auto",
                "target_language": "en"
            }),
            AITaskType::SpeechRecognition => serde_json::json!({
                "audio_file_path": content // 假设content是音频文件路径
            }),
            _ => serde_json::json!({
                "text": content
            }),
        };

        let task = AITask::new(
            task_type,
            user_id.clone(),
            message_id.clone(),
            input_data,
            5, // 默认优先级
        );

                    match ai_manager.submit_task(task).await {
                Ok(task_id) => {
                    tracing::info!("AI任务已提交: {} -> {}", message_id, &task_id);
                    task_ids.push(task_id);
                }
                Err(e) => {
                    tracing::error!("AI任务提交失败: {}", e);
                }
            }
    }

    Ok(task_ids)
}

#[allow(dead_code)]
fn determine_ai_tasks(content_type: &str) -> Vec<AITaskType> {
    match content_type {
        "text" => vec![
            AITaskType::IntentRecognition,
            AITaskType::Translation,
        ],
        "voice" => vec![
            AITaskType::SpeechRecognition,
            AITaskType::IntentRecognition,
        ],
        "image" => vec![], // 暂不支持图像处理
        _ => vec![AITaskType::IntentRecognition],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determine_ai_tasks() {
        assert_eq!(determine_ai_tasks("text"), vec![AITaskType::IntentRecognition, AITaskType::Translation]);
        assert_eq!(determine_ai_tasks("voice"), vec![AITaskType::SpeechRecognition, AITaskType::IntentRecognition]);
        assert_eq!(determine_ai_tasks("unknown"), vec![AITaskType::IntentRecognition]);
    }
} 