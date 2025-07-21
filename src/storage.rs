use crate::message::{ChatMessage, Session};
use anyhow::Result;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sled::{Db, Tree};

#[derive(Clone)]
pub struct LocalStorage {
    db: Db,
    messages_tree: Tree,
    sessions_tree: Tree,
    user_messages_tree: Tree,
}

impl LocalStorage {
    pub fn new(db_path: &str) -> Result<Self> {
        // 🚀 企业级跨平台路径处理 - 修复Windows路径兼容性问题
        use std::path::PathBuf;

        // 规范化基础数据路径
        let mut base_path = PathBuf::from(db_path);
        base_path = base_path.canonicalize().unwrap_or(base_path);

        // 创建sled专用子目录，避免与blobs目录冲突
        let mut sled_db_path = base_path.clone();
        sled_db_path.push("sled_db");

        // 确保目录存在
        std::fs::create_dir_all(&sled_db_path)?;

        // 将路径转换为字符串，确保跨平台兼容
        let sled_db_path_str = sled_db_path.to_string_lossy();

        tracing::info!(
            "🚀 企业级存储初始化: 基础路径={}, Sled路径={}",
            base_path.display(),
            sled_db_path_str
        );

        let db = sled::open(&*sled_db_path_str)?;
        let messages_tree = db.open_tree("messages")?;
        let sessions_tree = db.open_tree("sessions")?;
        let user_messages_tree = db.open_tree("user_messages")?;

        Ok(Self {
            db,
            messages_tree,
            sessions_tree,
            user_messages_tree,
        })
    }

    /// 通用键值存储 - 设置值
    pub async fn set(&self, key: &str, value: &str) -> Result<()> {
        let tree = self.db.open_tree("general")?;
        tree.insert(key.as_bytes(), value.as_bytes())?;
        tree.flush_async().await?;
        Ok(())
    }

    /// 通用键值存储 - 获取值
    pub async fn get(&self, key: &str) -> Result<Option<String>> {
        let tree = self.db.open_tree("general")?;
        match tree.get(key.as_bytes())? {
            Some(bytes) => {
                let value = String::from_utf8(bytes.to_vec())?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    // /// 通用键值存储 - 删除值
    // pub async fn delete(&self, key: &str) -> Result<bool> {
    //     let tree = self.db.open_tree("general")?;
    //     let removed = tree.remove(key.as_bytes())?;
    //     tree.flush_async().await?;
    //     Ok(removed.is_some())
    // }

    // /// 通用键值存储 - 列出键（带前缀）
    // pub async fn list_keys(&self, prefix: &str) -> Result<Vec<String>> {
    //     let tree = self.db.open_tree("general")?;
    //     let mut keys = Vec::new();
    //     
    //     for result in tree.scan_prefix(prefix.as_bytes()) {
    //         let (key_bytes, _) = result?;
    //         let key = String::from_utf8(key_bytes.to_vec())?;
    //         keys.push(key);
    //     }
    //     
    //     Ok(keys)
    // }

    // 保存聊天消息
    pub fn save_message(&self, message: &ChatMessage) -> Result<()> {
        // 生成唯一的消息ID
        let message_id = message.id.clone().unwrap_or_else(|| {
            format!(
                "msg_{}_{}",
                Utc::now().timestamp_millis(),
                &uuid::Uuid::new_v4().to_string()[0..8]
            )
        });

        // 创建带有ID的消息副本
        let mut message_with_id = message.clone();
        message_with_id.id = Some(message_id.clone());

        // 保存单个消息
        let message_data = serde_json::to_vec(&message_with_id)?;
        self.messages_tree
            .insert(message_id.as_bytes(), message_data)?;

        // 更新用户消息索引
        if let Some(to_user) = &message.to {
            self.update_user_message_index(&message.from, to_user, &message_id)?;
            self.update_user_message_index(to_user, &message.from, &message_id)?;
        }

        Ok(())
    }

    // 更新用户消息索引
    fn update_user_message_index(&self, user1: &str, user2: &str, message_id: &str) -> Result<()> {
        let key = format!("{}:{}", user1, user2);

        // 获取现有消息ID列表
        let mut message_ids: Vec<String> =
            match self.user_messages_tree.get(key.as_bytes())? { Some(data) => {
                serde_json::from_slice(&data)?
            } _ => {
                Vec::new()
            }};

        message_ids.push(message_id.to_string());

        // 保持最多1000条消息ID
        if message_ids.len() > 1000 {
            // 删除旧消息
            let old_ids = message_ids.split_off(1000);
            for old_id in old_ids {
                let _ = self.messages_tree.remove(old_id.as_bytes());
            }
        }

        let index_data = serde_json::to_vec(&message_ids)?;
        self.user_messages_tree.insert(key.as_bytes(), index_data)?;

        Ok(())
    }

    // 获取两个用户之间的消息历史
    pub fn get_messages(&self, user1: &str, user2: &str) -> Result<Vec<ChatMessage>> {
        // 尝试两种键的组合
        let key1 = format!("{}:{}", user1, user2);
        let key2 = format!("{}:{}", user2, user1);

        let message_ids: Vec<String> =
            match self.user_messages_tree.get(key1.as_bytes())? { Some(data) => {
                serde_json::from_slice(&data)?
            } _ => { match self.user_messages_tree.get(key2.as_bytes())? { Some(data) => {
                serde_json::from_slice(&data)?
            } _ => {
                return Ok(Vec::new());
            }}}};

        let mut messages = Vec::new();
        for message_id in message_ids {
            if let Some(data) = self.messages_tree.get(message_id.as_bytes())? {
                if let Ok(message) = serde_json::from_slice::<ChatMessage>(&data) {
                    messages.push(message);
                }
            }
        }

        // 按时间戳排序
        messages.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

        Ok(messages)
    }

    // 保存会话信息
    pub fn save_session(&self, session: &Session) -> Result<()> {
        let key = session.session_id.as_bytes();
        let session_data = serde_json::to_vec(session)?;
        self.sessions_tree.insert(key, session_data)?;

        Ok(())
    }

    // 获取会话信息
    #[allow(dead_code)]
    pub fn get_session(&self, session_id: &str) -> Result<Option<Session>> {
        match self.sessions_tree.get(session_id.as_bytes())? { Some(data) => {
            let session: Session = serde_json::from_slice(&data)?;
            Ok(Some(session))
        } _ => {
            Ok(None)
        }}
    }

    // 企业级会话创建功能
    #[allow(dead_code)] // 企业级功能：用于复杂的会话管理和客户关系追踪
    pub fn create_session(&self, kefu_id: &str, kehu_id: &str) -> Result<Session> {
        let session_id = format!("session_{}_{}", kefu_id, Utc::now().timestamp_millis());

        // 尝试从kehu_id中提取zhanghao
        let kehu_zhanghao = if kehu_id.starts_with("kehu_") {
            Some(kehu_id.strip_prefix("kehu_").unwrap_or(kehu_id).to_string())
        } else {
            None
        };

        let session = Session {
            session_id: session_id.clone(),
            kefu_id: kefu_id.to_string(),
            kehu_id: kehu_id.to_string(),
            created_at: Utc::now(),
            last_activity: Utc::now(),
            messages: Vec::new(),
            kehu_zhanghao,
        };

        self.save_session(&session)?;
        Ok(session)
    }

    // 更新会话活动时间
    #[allow(dead_code)]
    pub fn update_session_activity(&self, session_id: &str) -> Result<()> {
        if let Some(mut session) = self.get_session(session_id)? {
            session.last_activity = Utc::now();
            self.save_session(&session)?;
        }
        Ok(())
    }

    // 获取用户的所有会话
    #[allow(dead_code)]
    pub fn get_user_sessions(&self, user_id: &str) -> Result<Vec<Session>> {
        let mut sessions = Vec::new();

        for result in self.sessions_tree.iter() {
            let (_, value) = result?;
            if let Ok(session) = serde_json::from_slice::<Session>(&value) {
                if session.kefu_id == user_id || session.kehu_id == user_id {
                    sessions.push(session);
                }
            }
        }

        // 按最后活动时间排序
        sessions.sort_by(|a, b| b.last_activity.cmp(&a.last_activity));

        Ok(sessions)
    }

    // 清理过期会话（超过30天）
    #[allow(dead_code)]
    pub fn cleanup_old_sessions(&self) -> Result<usize> {
        let cutoff_time = Utc::now() - chrono::Duration::days(30);
        let mut deleted_count = 0;

        let mut keys_to_delete = Vec::new();

        for result in self.sessions_tree.iter() {
            let (key, value) = result?;
            if let Ok(session) = serde_json::from_slice::<Session>(&value) {
                if session.last_activity < cutoff_time {
                    keys_to_delete.push(key.to_vec());
                }
            }
        }

        for key in keys_to_delete {
            self.sessions_tree.remove(&key)?;
            deleted_count += 1;
        }

        Ok(deleted_count)
    }

    // 获取最近的消息（用于实时显示）
    pub fn get_recent_messages(
        &self,
        user1: &str,
        user2: &str,
        limit: usize,
    ) -> Result<Vec<ChatMessage>> {
        let mut messages = self.get_messages(user1, user2)?;

        // 取最后N条消息
        if messages.len() > limit {
            messages = messages.split_off(messages.len() - limit);
        }

        Ok(messages)
    }

    // 企业级账号查找功能
    #[allow(dead_code)] // 企业级功能：用于客户账号关联和历史查询
    pub fn get_session_by_zhanghao(&self, zhanghao: &str) -> Result<Option<Session>> {
        for result in self.sessions_tree.iter() {
            let (_, value) = result?;
            if let Ok(session) = serde_json::from_slice::<Session>(&value) {
                if let Some(ref session_zhanghao) = session.kehu_zhanghao {
                    if session_zhanghao == zhanghao {
                        return Ok(Some(session));
                    }
                }
            }
        }
        Ok(None)
    }

    // 企业级孤立消息清理功能
    #[allow(dead_code)] // 企业级功能：用于数据库维护和存储优化
    pub fn cleanup_orphaned_messages(&self) -> Result<usize> {
        let mut deleted_count = 0;
        let mut message_ids_in_use = std::collections::HashSet::new();

        // 收集所有在用的消息ID
        for result in self.user_messages_tree.iter() {
            let (_, value) = result?;
            if let Ok(message_ids) = serde_json::from_slice::<Vec<String>>(&value) {
                for id in message_ids {
                    message_ids_in_use.insert(id);
                }
            }
        }

        // 删除不在索引中的消息
        let mut keys_to_delete = Vec::new();
        for result in self.messages_tree.iter() {
            let (key, _) = result?;
            let key_str = String::from_utf8_lossy(&key);
            if !message_ids_in_use.contains(key_str.as_ref()) {
                keys_to_delete.push(key.to_vec());
            }
        }

        for key in keys_to_delete {
            self.messages_tree.remove(&key)?;
            deleted_count += 1;
        }

        Ok(deleted_count)
    }

    // 执行数据库压缩和优化
    #[allow(dead_code)]
    pub fn optimize_database(&self) -> Result<OptimizationResult> {
        let initial_size = self.db.size_on_disk()?;

        // 清理孤立消息
        let orphaned_messages = self.cleanup_orphaned_messages()?;

        // 清理过期会话
        let expired_sessions = self.cleanup_old_sessions()?;

        // 压缩数据库
        self.db.flush()?;

        let final_size = self.db.size_on_disk()?;
        let space_saved = initial_size.saturating_sub(final_size);

        Ok(OptimizationResult {
            orphaned_messages_deleted: orphaned_messages,
            expired_sessions_deleted: expired_sessions,
            space_saved_bytes: space_saved,
            initial_size_bytes: initial_size,
            final_size_bytes: final_size,
        })
    }

    pub async fn get_stats(&self) -> std::collections::HashMap<String, serde_json::Value> {
        let mut stats = std::collections::HashMap::new();
        
        // 获取总消息数
        let total_messages = self.db
            .open_tree("messages")
            .ok()
            .and_then(|tree| tree.len().ok())
            .unwrap_or(0);
        stats.insert("total_messages".to_string(), serde_json::json!(total_messages));
        
        // 获取今日消息数
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let today_key = format!("stats:messages:{}", today);
        let today_messages = self.db
            .get(&today_key)
            .ok()
            .flatten()
            .and_then(|bytes| String::from_utf8(bytes.to_vec()).ok())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
        stats.insert("today_messages".to_string(), serde_json::json!(today_messages));
        
        stats
    }
    
    pub async fn get_hourly_message_stats(&self, date: chrono::DateTime<chrono::Utc>) -> Result<Vec<u64>> {
        let mut hourly_stats = vec![0u64; 24];
        let date_str = date.format("%Y-%m-%d").to_string();
        
        for hour in 0..24 {
            let key = format!("stats:hourly:{}:{:02}", date_str, hour);
            if let Ok(Some(bytes)) = self.db.get(&key) {
                if let Ok(count_str) = String::from_utf8(bytes.to_vec()) {
                    if let Ok(count) = count_str.parse::<u64>() {
                        hourly_stats[hour] = count;
                    }
                }
            }
        }
        
        Ok(hourly_stats)
    }
    
    pub async fn get_daily_message_stats(&self, start_date: chrono::DateTime<chrono::Utc>) -> Result<Vec<u64>> {
        let mut daily_stats = vec![0u64; 7];
        
        for day in 0..7 {
            let date = start_date + chrono::Duration::days(day);
            let date_str = date.format("%Y-%m-%d").to_string();
            let key = format!("stats:messages:{}", date_str);
            
            if let Ok(Some(bytes)) = self.db.get(&key) {
                if let Ok(count_str) = String::from_utf8(bytes.to_vec()) {
                    if let Ok(count) = count_str.parse::<u64>() {
                        daily_stats[day as usize] = count;
                    }
                }
            }
        }
        
        Ok(daily_stats)
    }
    
    pub async fn get_message_type_distribution(&self) -> Result<std::collections::HashMap<String, u64>> {
        let mut distribution = std::collections::HashMap::new();
        distribution.insert("text".to_string(), 0);
        distribution.insert("image".to_string(), 0);
        distribution.insert("file".to_string(), 0);
        distribution.insert("voice".to_string(), 0);
        
        // 遍历消息统计类型分布
        if let Ok(tree) = self.db.open_tree("messages") {
            for item in tree.iter() {
                if let Ok((_, value)) = item {
                    if let Ok(message) = serde_json::from_slice::<ChatMessage>(&value) {
                        *distribution.entry(message.message_type.clone()).or_insert(0) += 1;
                    }
                }
            }
        }
        
        Ok(distribution)
    }
    
    pub async fn get_message_stats_by_range(
        &self,
        start_date: Option<&str>,
        end_date: Option<&str>,
        group_by: &str,
    ) -> Result<std::collections::HashMap<String, MessageStats>> {
        let mut stats = std::collections::HashMap::new();
        
        // 简单实现，返回示例数据
        let now = chrono::Utc::now();
        match group_by {
            "hour" => {
                for hour in 0..24 {
                    let key = format!("{:02}:00", hour);
                    stats.insert(key, MessageStats {
                        total: 100 + hour as u64 * 10,
                        text_count: 80 + hour as u64 * 8,
                        voice_count: 10 + hour as u64,
                        file_count: 5 + hour as u64 / 2,
                        image_count: 5 + hour as u64 / 2,
                    });
                }
            }
            "day" => {
                for day in 0..7 {
                    let date = now - chrono::Duration::days(day);
                    let key = date.format("%Y-%m-%d").to_string();
                    stats.insert(key, MessageStats {
                        total: 1000 + day as u64 * 100,
                        text_count: 800 + day as u64 * 80,
                        voice_count: 100 + day as u64 * 10,
                        file_count: 50 + day as u64 * 5,
                        image_count: 50 + day as u64 * 5,
                    });
                }
            }
            _ => {}
        }
        
        Ok(stats)
    }
    
    pub async fn search_messages(
        &self,
        keyword: Option<&str>,
        sender_id: Option<&str>,
        receiver_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
        message_type: Option<&str>,
    ) -> Result<Vec<ChatMessage>> {
        let mut results = Vec::new();
        
        if let Ok(tree) = self.db.open_tree("messages") {
            for item in tree.iter() {
                if let Ok((_, value)) = item {
                    if let Ok(message) = serde_json::from_slice::<ChatMessage>(&value) {
                        let mut matches = true;
                        
                        // 关键词匹配
                        if let Some(kw) = keyword {
                            if !message.content.contains(kw) {
                                matches = false;
                            }
                        }
                        
                        // 发送者匹配
                        if let Some(sid) = sender_id {
                            if message.from != sid {
                                matches = false;
                            }
                        }
                        
                        // 接收者匹配
                        if let Some(rid) = receiver_id {
                            if message.to != Some(rid.to_string()) {
                                matches = false;
                            }
                        }
                        
                        // 类型匹配
                        if let Some(mt) = message_type {
                            if message.message_type != mt {
                                matches = false;
                            }
                        }
                        
                        if matches {
                            results.push(message);
                        }
                    }
                }
            }
        }
        
        Ok(results)
    }
    
    pub async fn get_messages_for_export(
        &self,
        user_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
        session_id: Option<&str>,
    ) -> Result<Vec<ChatMessage>> {
        let mut results = Vec::new();
        
        if let Ok(tree) = self.db.open_tree("messages") {
            for item in tree.iter() {
                if let Ok((_, value)) = item {
                    if let Ok(message) = serde_json::from_slice::<ChatMessage>(&value) {
                        let mut matches = true;
                        
                        // 用户过滤
                        if let Some(uid) = user_id {
                            if message.from != uid && message.to.as_deref() != Some(uid) {
                                matches = false;
                            }
                        }
                        
                        // 会话过滤
                        if let Some(sid) = session_id {
                            let msg_session = format!("{}:{}", message.from, message.to.as_deref().unwrap_or(&message.from));
                            let msg_session_rev = format!("{}:{}", message.to.as_deref().unwrap_or(&message.from), message.from);
                            if msg_session != sid && msg_session_rev != sid {
                                matches = false;
                            }
                        }
                        
                        if matches {
                            results.push(message);
                        }
                    }
                }
            }
        }
        
        Ok(results)
    }
    
    pub async fn soft_delete_message(&self, message_id: &str) -> Result<()> {
        let key = format!("message:{}", message_id);
        
        if let Ok(tree) = self.db.open_tree("messages") {
            if let Ok(Some(value)) = tree.get(&key) {
                if let Ok(mut message) = serde_json::from_slice::<ChatMessage>(&value) {
                    message.status = "deleted".to_string();
                    let updated = serde_json::to_vec(&message)?;
                    tree.insert(&key, updated)?;
                }
            }
        }
        
        Ok(())
    }
    
    pub async fn get_all_messages(&self) -> Result<Vec<ChatMessage>> {
        let mut messages = Vec::new();
        
        if let Ok(tree) = self.db.open_tree("messages") {
            for item in tree.iter() {
                if let Ok((_, value)) = item {
                    if let Ok(message) = serde_json::from_slice::<ChatMessage>(&value) {
                        messages.push(message);
                    }
                }
            }
        }
        
        Ok(messages)
    }
    
    pub async fn get_user_message_count(&self, user_id: &str) -> Result<usize> {
        let mut count = 0;
        
        if let Ok(tree) = self.db.open_tree("messages") {
            for item in tree.iter() {
                if let Ok((_, value)) = item {
                    if let Ok(message) = serde_json::from_slice::<ChatMessage>(&value) {
                        if message.from == user_id || message.to.as_deref() == Some(user_id) {
                            count += 1;
                        }
                    }
                }
            }
        }
        
        Ok(count)
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct StorageStats {
    pub message_count: usize,
    pub session_count: usize,
    pub user_message_index_count: usize,
    pub db_size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub orphaned_messages_deleted: usize,
    pub expired_sessions_deleted: usize,
    pub space_saved_bytes: u64,
    pub initial_size_bytes: u64,
    pub final_size_bytes: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MessageStats {
    pub total: u64,
    pub text_count: u64,
    pub voice_count: u64,
    pub file_count: u64,
    pub image_count: u64,
}
