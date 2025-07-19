-- 企业级客服系统数据库优化脚本
-- 适用于PostgreSQL

-- 1. 创建消息表（如果不存在）
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    sender_id VARCHAR(50) NOT NULL,
    receiver_id VARCHAR(50),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB
);

-- 2. 创建会话表
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY,
    kehu_id VARCHAR(50) NOT NULL,
    kefu_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- 3. 创建用户活动表
CREATE TABLE IF NOT EXISTS user_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 添加索引优化查询性能

-- 消息表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_session_created 
    ON messages(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_created 
    ON messages(sender_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_created 
    ON messages(receiver_id, created_at DESC) 
    WHERE receiver_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread 
    ON messages(receiver_id, is_read) 
    WHERE is_read = FALSE;

-- 会话表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_kehu 
    ON sessions(kehu_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_kefu 
    ON sessions(kefu_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status 
    ON sessions(status) 
    WHERE status = 'active';

-- 用户活动表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_user_created 
    ON user_activities(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_type 
    ON user_activities(activity_type, created_at DESC);

-- 5. 创建分区表（按月分区）
-- 仅当消息量很大时使用

-- 创建分区函数
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;

-- 6. 创建自动清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- 删除90天前的消息
    DELETE FROM messages 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
    AND session_id IN (
        SELECT id FROM sessions 
        WHERE status = 'closed' 
        AND closed_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
    );
    
    -- 删除180天前的用户活动记录
    DELETE FROM user_activities 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- 7. 创建统计信息更新函数
CREATE OR REPLACE FUNCTION update_statistics()
RETURNS void AS $$
BEGIN
    ANALYZE messages;
    ANALYZE sessions;
    ANALYZE user_activities;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建定时任务（需要pg_cron扩展）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data()');
-- SELECT cron.schedule('update-statistics', '0 */6 * * *', 'SELECT update_statistics()');

-- 9. 查询优化提示
COMMENT ON INDEX idx_messages_session_created IS '用于按会话查询消息历史';
COMMENT ON INDEX idx_messages_sender_created IS '用于查询用户发送的消息';
COMMENT ON INDEX idx_messages_receiver_created IS '用于查询用户接收的消息';
COMMENT ON INDEX idx_messages_unread IS '用于查询未读消息数量';
COMMENT ON INDEX idx_sessions_kehu IS '用于查询客户的会话列表';
COMMENT ON INDEX idx_sessions_kefu IS '用于查询客服的会话列表';
COMMENT ON INDEX idx_sessions_status IS '用于查询活跃会话';