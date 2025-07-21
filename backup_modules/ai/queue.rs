use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque, BinaryHeap};
use std::cmp::Ordering;
use chrono::{DateTime, Utc};
use super::{AITask, AITaskStatus, AIResult, AITaskType};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueMetrics {
    pub total_tasks: u64,
    pub pending_tasks: u64,
    pub processing_tasks: u64,
    pub completed_tasks: u64,
    pub failed_tasks: u64,
    pub average_processing_time_ms: f64,
    pub tasks_per_type: HashMap<String, u64>,
}

// 优先级任务包装器
#[derive(Debug, Clone)]
struct PriorityTask {
    task: AITask,
    priority: u8,
    created_at: DateTime<Utc>,
}

impl PartialEq for PriorityTask {
    fn eq(&self, other: &Self) -> bool {
        self.priority == other.priority
    }
}

impl Eq for PriorityTask {}

impl PartialOrd for PriorityTask {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for PriorityTask {
    fn cmp(&self, other: &Self) -> Ordering {
        // 高优先级数字表示高优先级，所以reverse
        other.priority.cmp(&self.priority)
            .then_with(|| self.created_at.cmp(&other.created_at))
    }
}

// AI任务队列
pub struct AIQueue {
    pending_queue: BinaryHeap<PriorityTask>,
    processing_tasks: HashMap<String, AITask>,
    completed_tasks: HashMap<String, AIResult>,
    failed_tasks: HashMap<String, AITask>,
    retry_queue: VecDeque<AITask>,
    metrics: QueueMetrics,
    max_concurrent_tasks: usize,
    #[allow(dead_code)]
    max_completed_history: usize,
}

impl AIQueue {
    pub fn new() -> Self {
        Self {
            pending_queue: BinaryHeap::new(),
            processing_tasks: HashMap::new(),
            completed_tasks: HashMap::new(),
            failed_tasks: HashMap::new(),
            retry_queue: VecDeque::new(),
            metrics: QueueMetrics {
                total_tasks: 0,
                pending_tasks: 0,
                processing_tasks: 0,
                completed_tasks: 0,
                failed_tasks: 0,
                average_processing_time_ms: 0.0,
                tasks_per_type: HashMap::new(),
            },
            max_concurrent_tasks: 10,
            max_completed_history: 1000,
        }
    }

    pub async fn enqueue(&mut self, task: AITask) -> Result<()> {
        let task_type = format!("{:?}", task.task_type);
        
        self.pending_queue.push(PriorityTask {
            priority: task.priority,
            created_at: task.created_at,
            task,
        });

        self.metrics.total_tasks += 1;
        self.metrics.pending_tasks += 1;
        *self.metrics.tasks_per_type.entry(task_type).or_insert(0) += 1;

        tracing::debug!("任务已入队: {}", self.pending_queue.len());
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn dequeue(&mut self) -> Result<Option<AITask>> {
        // 检查并发限制
        if self.processing_tasks.len() >= self.max_concurrent_tasks {
            return Ok(None);
        }

        // 先检查重试队列
        if let Some(mut task) = self.retry_queue.pop_front() {
            task.start_processing();
            let task_id = task.id.clone();
            self.processing_tasks.insert(task_id, task.clone());
            self.metrics.processing_tasks += 1;
            return Ok(Some(task));
        }

        // 从主队列获取任务
        if let Some(priority_task) = self.pending_queue.pop() {
            let mut task = priority_task.task;
            task.start_processing();
            let task_id = task.id.clone();
            self.processing_tasks.insert(task_id, task.clone());
            
            self.metrics.pending_tasks = self.metrics.pending_tasks.saturating_sub(1);
            self.metrics.processing_tasks += 1;
            
            return Ok(Some(task));
        }

        Ok(None)
    }

    #[allow(dead_code)]
    pub async fn complete_task(&mut self, task_id: &str, output: serde_json::Value) -> Result<()> {
        if let Some(mut task) = self.processing_tasks.remove(task_id) {
            task.complete(output.clone());
            
            let processing_time = task.completed_at.unwrap_or_else(Utc::now)
                .signed_duration_since(task.started_at.unwrap_or_else(Utc::now))
                .num_milliseconds() as u64;

            let result = AIResult {
                task_id: task_id.to_string(),
                task_type: task.task_type.clone(),
                user_id: task.user_id.clone(),
                message_id: task.message_id.clone(),
                result: output,
                confidence: 0.8, // 默认置信度，实际应该从处理结果获取
                processing_time_ms: processing_time,
                created_at: Utc::now(),
            };

            self.completed_tasks.insert(task_id.to_string(), result);
            
            // 限制历史记录大小
            if self.completed_tasks.len() > self.max_completed_history {
                let oldest_keys: Vec<String> = self.completed_tasks.keys()
                    .take(self.completed_tasks.len() - self.max_completed_history)
                    .cloned()
                    .collect();
                for key in oldest_keys {
                    self.completed_tasks.remove(&key);
                }
            }

            self.metrics.processing_tasks = self.metrics.processing_tasks.saturating_sub(1);
            self.metrics.completed_tasks += 1;
            
            // 更新平均处理时间
            self.update_average_processing_time(processing_time);
            
            tracing::debug!("任务完成: {}", task_id);
        }

        Ok(())
    }

    #[allow(dead_code)]
    pub async fn fail_task(&mut self, task_id: &str, error: String) -> Result<()> {
        if let Some(mut task) = self.processing_tasks.remove(task_id) {
            if task.can_retry() {
                task.retry();
                let retry_count = task.retry_count;
                self.retry_queue.push_back(task);
                tracing::warn!("任务失败，加入重试队列: {} (重试次数: {})", task_id, retry_count);
            } else {
                task.fail(error);
                self.failed_tasks.insert(task_id.to_string(), task);
                self.metrics.failed_tasks += 1;
                tracing::error!("任务最终失败: {}", task_id);
            }
            
            self.metrics.processing_tasks = self.metrics.processing_tasks.saturating_sub(1);
        }

        Ok(())
    }

    pub async fn get_task_status(&self, task_id: &str) -> Option<AITaskStatus> {
        if self.processing_tasks.contains_key(task_id) {
            Some(AITaskStatus::Processing)
        } else if self.completed_tasks.contains_key(task_id) {
            Some(AITaskStatus::Completed)
        } else if self.failed_tasks.contains_key(task_id) {
            Some(AITaskStatus::Failed)
        } else if self.retry_queue.iter().any(|t| t.id == task_id) {
            Some(AITaskStatus::Pending)
        } else if self.pending_queue.iter().any(|pt| pt.task.id == task_id) {
            Some(AITaskStatus::Pending)
        } else {
            None
        }
    }

    pub async fn get_task_result(&self, task_id: &str) -> Result<Option<AIResult>> {
        Ok(self.completed_tasks.get(task_id).cloned())
    }

    pub async fn get_statistics(&self) -> serde_json::Value {
        serde_json::json!({
            "total_tasks": self.metrics.total_tasks,
            "pending_tasks": self.metrics.pending_tasks,
            "processing_tasks": self.metrics.processing_tasks,
            "completed_tasks": self.metrics.completed_tasks,
            "failed_tasks": self.metrics.failed_tasks,
            "retry_queue_size": self.retry_queue.len(),
            "average_processing_time_ms": self.metrics.average_processing_time_ms,
            "tasks_per_type": self.metrics.tasks_per_type,
            "queue_health": {
                "max_concurrent_tasks": self.max_concurrent_tasks,
                "current_concurrent_tasks": self.processing_tasks.len(),
                "utilization_rate": self.processing_tasks.len() as f64 / self.max_concurrent_tasks as f64,
            }
        })
    }

    pub async fn cancel_task(&mut self, task_id: &str) -> Result<bool> {
        // 从处理中任务取消
        if let Some(mut task) = self.processing_tasks.remove(task_id) {
            task.status = AITaskStatus::Cancelled;
            self.failed_tasks.insert(task_id.to_string(), task);
            self.metrics.processing_tasks = self.metrics.processing_tasks.saturating_sub(1);
            return Ok(true);
        }

        // 从重试队列取消
        if let Some(pos) = self.retry_queue.iter().position(|t| t.id == task_id) {
            let mut task = self.retry_queue.remove(pos).unwrap();
            task.status = AITaskStatus::Cancelled;
            self.failed_tasks.insert(task_id.to_string(), task);
            return Ok(true);
        }

        // 从待处理队列取消（需要重建堆）
        let tasks: Vec<PriorityTask> = self.pending_queue.drain().collect();
        let mut found = false;
        
        for pt in tasks {
            if pt.task.id == task_id {
                let mut task = pt.task;
                task.status = AITaskStatus::Cancelled;
                self.failed_tasks.insert(task_id.to_string(), task);
                self.metrics.pending_tasks = self.metrics.pending_tasks.saturating_sub(1);
                found = true;
            } else {
                self.pending_queue.push(pt);
            }
        }

        Ok(found)
    }

    #[allow(dead_code)]
    pub async fn clear_completed(&mut self) -> usize {
        let count = self.completed_tasks.len();
        self.completed_tasks.clear();
        count
    }

    #[allow(dead_code)]
    pub async fn clear_failed(&mut self) -> usize {
        let count = self.failed_tasks.len();
        self.failed_tasks.clear();
        count
    }

    #[allow(dead_code)]
    pub async fn get_tasks_by_user(&self, user_id: &str) -> Vec<AITask> {
        let mut tasks = Vec::new();
        
        // 从各个队列收集用户任务
        for pt in &self.pending_queue {
            if pt.task.user_id == user_id {
                tasks.push(pt.task.clone());
            }
        }
        
        for task in self.processing_tasks.values() {
            if task.user_id == user_id {
                tasks.push(task.clone());
            }
        }
        
        for task in self.failed_tasks.values() {
            if task.user_id == user_id {
                tasks.push(task.clone());
            }
        }
        
        for task in &self.retry_queue {
            if task.user_id == user_id {
                tasks.push(task.clone());
            }
        }
        
        tasks
    }

    #[allow(dead_code)]
    pub async fn get_tasks_by_type(&self, task_type: &AITaskType) -> Vec<AITask> {
        let mut tasks = Vec::new();
        
        for pt in &self.pending_queue {
            if pt.task.task_type == *task_type {
                tasks.push(pt.task.clone());
            }
        }
        
        for task in self.processing_tasks.values() {
            if task.task_type == *task_type {
                tasks.push(task.clone());
            }
        }
        
        tasks
    }

    #[allow(dead_code)]
    fn update_average_processing_time(&mut self, new_time: u64) {
        let current_avg = self.metrics.average_processing_time_ms;
        let completed_count = self.metrics.completed_tasks;
        
        if completed_count == 1 {
            self.metrics.average_processing_time_ms = new_time as f64;
        } else {
            // 计算移动平均
            self.metrics.average_processing_time_ms = 
                (current_avg * (completed_count - 1) as f64 + new_time as f64) / completed_count as f64;
        }
    }
}

impl Default for AIQueue {
    fn default() -> Self {
        Self::new()
    }
} 