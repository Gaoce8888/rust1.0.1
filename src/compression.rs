use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use std::io::{Read, Write};

// 压缩配置
#[derive(Debug, Clone)]
pub struct CompressionConfig {
    pub enabled: bool,
    pub min_size: usize,        // 最小压缩大小（字节）
    pub compression_level: u32, // 压缩级别 0-9
    pub use_base64: bool,       // 是否使用base64编码
}

impl Default for CompressionConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            min_size: 1024,       // 1KB以上才压缩
            compression_level: 6, // 中等压缩级别，平衡速度和压缩率
            use_base64: true,
        }
    }
}

// 压缩结果 - 企业级性能分析
#[derive(Debug, Clone)]
pub struct CompressionResult {
    pub original_size: usize,
    pub compressed_size: usize,
    #[allow(dead_code)] // 企业级字段：compression_ratio用于性能监控和分析
    pub compression_ratio: f64,
    #[allow(dead_code)] // 企业级字段：compressed用于性能监控和分析
    pub compressed: bool,
    #[allow(dead_code)] // 企业级字段：processing_time_ms用于性能监控和分析
    pub processing_time_ms: f64,
}

// 消息压缩器
pub struct MessageCompressor {
    config: CompressionConfig,
}

impl MessageCompressor {
    # pub fn new(config: CompressionConfig) -> Self {
        Self { config }
    }

    // 压缩消息
    pub fn compress(&self, data: &str) -> Result<(String, CompressionResult)> {
        let start_time = std::time::Instant::now();
        let original_size = data.len();

        // 检查是否需要压缩
        if !self.config.enabled || original_size < self.config.min_size {
            let result = CompressionResult {
                original_size,
                compressed_size: original_size,
                compression_ratio: 1.0,
                compressed: false,
                processing_time_ms: start_time.elapsed().as_secs_f64() * 1000.0,
            };
            return Ok((data.to_string(), result));
        }

        // 执行压缩
        let mut encoder =
            GzEncoder::new(Vec::new(), Compression::new(self.config.compression_level));
        encoder.write_all(data.as_bytes())?;
        let compressed_bytes = encoder.finish()?;

        let compressed_size = compressed_bytes.len();

        // 如果压缩后反而更大，则不使用压缩
        if compressed_size >= original_size {
            let result = CompressionResult {
                original_size,
                compressed_size: original_size,
                compression_ratio: 1.0,
                compressed: false,
                processing_time_ms: start_time.elapsed().as_secs_f64() * 1000.0,
            };
            return Ok((data.to_string(), result));
        }

        let compression_ratio = compressed_size as f64 / original_size as f64;

        // 编码压缩数据
        let final_data = if self.config.use_base64 {
            // 添加压缩标识前缀
            format!(
                "GZIP:{}",
                general_purpose::STANDARD.encode(&compressed_bytes)
            )
        } else {
            // 直接使用二进制（需要WebSocket支持二进制消息）
            String::from_utf8_lossy(&compressed_bytes).to_string()
        };

        let result = CompressionResult {
            original_size,
            compressed_size,
            compression_ratio,
            compressed: true,
            processing_time_ms: start_time.elapsed().as_secs_f64() * 1000.0,
        };

        Ok((final_data, result))
    }

    // 解压缩数据
    #[allow(dead_code)] // 企业级功能：用于数据解压缩和历史消息处理
    pub fn decompress(&self, compressed_data: &str) -> Result<(String, CompressionResult)> {
        let start_time = std::time::Instant::now();

        // 检查是否为压缩数据
        if !compressed_data.starts_with("GZIP:") {
            let result = CompressionResult {
                original_size: compressed_data.len(),
                compressed_size: compressed_data.len(),
                compression_ratio: 1.0,
                compressed: false,
                processing_time_ms: start_time.elapsed().as_secs_f64() * 1000.0,
            };
            return Ok((compressed_data.to_string(), result));
        }

        // 移除 "GZIP:" 前缀并解码base64
        let base64_data = &compressed_data[5..];
        let compressed_bytes = general_purpose::STANDARD.decode(base64_data)?;

        // 使用std::io::Cursor包装Vec<u8>以实现Read trait
        let cursor = std::io::Cursor::new(compressed_bytes);
        let mut decoder = GzDecoder::new(cursor);
        let mut decompressed_data = Vec::new();
        decoder.read_to_end(&mut decompressed_data)?;

        let decompressed_string = String::from_utf8(decompressed_data)?;
        let process_time = start_time.elapsed();
        let decompressed_len = decompressed_string.len();
        let compressed_len = compressed_data.len();

        Ok((
            decompressed_string,
            CompressionResult {
                original_size: decompressed_len, // 原始数据大小
                compressed_size: compressed_len, // 压缩数据大小
                compression_ratio: compressed_len as f64 / decompressed_len as f64,
                compressed: true, // 解压成功
                processing_time_ms: process_time.as_secs_f64() * 1000.0,
            },
        ))
    }

    // 企业级批量压缩功能
    #[allow(dead_code)] // 企业级功能：用于大规模消息批处理和历史数据压缩
    pub fn batch_compress(&self, messages: &[String]) -> Result<Vec<(String, CompressionResult)>> {
        let mut results = Vec::new();
        let mut total_original_size = 0;
        let mut total_compressed_size = 0;

        for message in messages {
            let (compressed, result) = self.compress(message)?;
            total_original_size += result.original_size;
            total_compressed_size += result.compressed_size;
            results.push((compressed, result));
        }

        // 输出批量压缩统计
        if !messages.is_empty() {
            let overall_ratio = total_compressed_size as f64 / total_original_size as f64;
            tracing::info!(
                "Batch compression: {} messages, {:.1}% size reduction",
                messages.len(),
                (1.0 - overall_ratio) * 100.0
            );
        }

        Ok(results)
    }

    // 企业级智能压缩功能
    #[allow(dead_code)] // 企业级功能：用于智能压缩和消息类型优化
    pub fn smart_compress(
        &self,
        data: &str,
        message_type: &str,
    ) -> Result<(String, CompressionResult)> {
        // 根据消息类型调整压缩策略
        let should_compress = match message_type {
            "History" | "OnlineUsers" => true, // 历史消息和用户列表通常较大
            "Chat" => data.len() > 500,        // 聊天消息超过500字符才压缩
            "Heartbeat" | "Typing" => false,   // 心跳和打字指示器不压缩
            "System" => data.len() > 200,      // 系统消息超过200字符才压缩
            _ => data.len() > self.config.min_size,
        };

        if should_compress {
            self.compress(data)
        } else {
            let result = CompressionResult {
                original_size: data.len(),
                compressed_size: data.len(),
                compression_ratio: 1.0,
                compressed: false,
                processing_time_ms: 0.0,
            };
            Ok((data.to_string(), result))
        }
    }

    // 企业级配置获取功能
    #[allow(dead_code)] // 企业级功能：用于运行时配置查询和监控
    pub fn get_config(&self) -> &CompressionConfig {
        &self.config
    }

    // 更新配置
    #[allow(dead_code)] // 企业级功能：用于运行时配置更新和动态调整
    pub fn update_config(&mut self, config: CompressionConfig) {
        self.config = config;
    }
}

// 压缩统计管理器
pub struct CompressionStats {
    total_messages: u64,
    compressed_messages: u64,
    total_original_bytes: u64,
    total_compressed_bytes: u64,
    total_processing_time_ms: f64,
}

impl CompressionStats {
    pub fn new() -> Self {
        Self {
            total_messages: 0,
            compressed_messages: 0,
            total_original_bytes: 0,
            total_compressed_bytes: 0,
            total_processing_time_ms: 0.0,
        }
    }

    // 记录压缩结果
    #[allow(dead_code)] // 企业级功能：用于性能监控和统计分析
    pub fn record(&mut self, result: &CompressionResult) {
        self.total_messages += 1;
        self.total_original_bytes += result.original_size as u64;
        self.total_compressed_bytes += result.compressed_size as u64;
        self.total_processing_time_ms += result.processing_time_ms;

        if result.compressed {
            self.compressed_messages += 1;
        }
    }

    // 获取统计信息
    pub fn get_stats(&self) -> CompressionStatsReport {
        let compression_ratio = if self.total_original_bytes > 0 {
            self.total_compressed_bytes as f64 / self.total_original_bytes as f64
        } else {
            1.0
        };

        let compression_percentage = if self.total_messages > 0 {
            (self.compressed_messages as f64 / self.total_messages as f64) * 100.0
        } else {
            0.0
        };

        let avg_processing_time = if self.total_messages > 0 {
            self.total_processing_time_ms / self.total_messages as f64
        } else {
            0.0
        };

        CompressionStatsReport {
            total_messages: self.total_messages,
            compressed_messages: self.compressed_messages,
            compression_percentage,
            total_original_bytes: self.total_original_bytes,
            total_compressed_bytes: self.total_compressed_bytes,
            compression_ratio,
            bytes_saved: self
                .total_original_bytes
                .saturating_sub(self.total_compressed_bytes),
            avg_processing_time_ms: avg_processing_time,
        }
    }

    // 企业级统计重置功能
    #[allow(dead_code)] // 企业级功能：用于定期统计重置和性能分析周期管理
    pub fn reset(&mut self) {
        *self = Self::new();
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CompressionStatsReport {
    pub total_messages: u64,
    pub compressed_messages: u64,
    pub compression_percentage: f64,
    pub total_original_bytes: u64,
    pub total_compressed_bytes: u64,
    pub compression_ratio: f64,
    pub bytes_saved: u64,
    pub avg_processing_time_ms: f64,
}

// 动态压缩配置调整器
pub struct AdaptiveCompressor {
    #[allow(dead_code)] // 企业级字段：compressor用于动态压缩处理
    compressor: MessageCompressor,
    stats: CompressionStats,
    #[allow(dead_code)] // 企业级字段：adjustment_interval用于自适应调整
    adjustment_interval: u64,
    #[allow(dead_code)] // 企业级字段：last_adjustment用于自适应调整
    last_adjustment: u64,
}

impl AdaptiveCompressor {
    # pub fn new(config: CompressionConfig) -> Self {
        Self {
            compressor: MessageCompressor::new(config),
            stats: CompressionStats::new(),
            adjustment_interval: 1000, // 每1000条消息调整一次
            last_adjustment: 0,
        }
    }

    // 智能压缩并自适应调整
    #[allow(dead_code)] // 企业级功能：用于自适应压缩和性能优化
    pub fn compress_adaptive(
        &mut self,
        data: &str,
        message_type: &str,
    ) -> Result<(String, CompressionResult)> {
        let (compressed, result) = self.compressor.smart_compress(data, message_type)?;
        self.stats.record(&result);

        // 检查是否需要调整配置
        if self.stats.total_messages - self.last_adjustment >= self.adjustment_interval {
            self.adjust_config();
            self.last_adjustment = self.stats.total_messages;
        }

        Ok((compressed, result))
    }

    // 自适应调整压缩配置
    #[allow(dead_code)] // 企业级功能：用于自适应配置调整和性能优化
    fn adjust_config(&mut self) {
        let stats = self.stats.get_stats();
        let mut new_config = self.compressor.config.clone();

        // 根据压缩效果调整配置
        if stats.compression_ratio > 0.8 {
            // 压缩效果不佳，提高压缩阈值
            new_config.min_size = (new_config.min_size as f64 * 1.2) as usize;
        } else if stats.compression_ratio < 0.5 {
            // 压缩效果很好，降低压缩阈值
            new_config.min_size = (new_config.min_size as f64 * 0.8) as usize;
        }

        // 根据处理时间调整压缩级别
        if stats.avg_processing_time_ms > 10.0 {
            // 处理时间过长，降低压缩级别
            new_config.compression_level = new_config.compression_level.saturating_sub(1);
        } else if stats.avg_processing_time_ms < 2.0 && stats.compression_ratio > 0.7 {
            // 处理时间短且压缩效果一般，提高压缩级别
            new_config.compression_level = (new_config.compression_level + 1).min(9);
        }

        // 应用新配置
        if new_config.min_size != self.compressor.config.min_size
            || new_config.compression_level != self.compressor.config.compression_level
        {
            tracing::info!(
                "Adjusting compression config: min_size {} -> {}, level {} -> {}",
                self.compressor.config.min_size,
                new_config.min_size,
                self.compressor.config.compression_level,
                new_config.compression_level
            );
            self.compressor.update_config(new_config);
        }
    }

    // 企业级统计报告功能
    #[allow(dead_code)] // 企业级功能：用于性能监控和运营分析
    pub fn get_stats(&self) -> CompressionStatsReport {
        self.stats.get_stats()
    }

    // 解压消息
    #[allow(dead_code)] // 企业级功能：用于自适应解压缩处理
    pub fn decompress(&self, data: &str) -> Result<(String, CompressionResult)> {
        self.compressor.decompress(data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_basic() {
        let config = CompressionConfig::default();
        let compressor = MessageCompressor::new(config);

        let test_data = "a".repeat(2000); // 2KB的测试数据
        let (compressed, result) = compressor.compress(&test_data).unwrap();

        assert!(result.compressed);
        assert!(result.compressed_size < result.original_size);

        let (decompressed, _) = compressor.decompress(&compressed).unwrap();
        assert_eq!(decompressed, test_data);
    }

    #[test]
    fn test_small_message_no_compression() {
        let config = CompressionConfig::default();
        let compressor = MessageCompressor::new(config);

        let small_data = "Hello, World!";
        let (compressed, result) = compressor.compress(small_data).unwrap();

        assert!(!result.compressed);
        assert_eq!(compressed, small_data);
    }

    #[test]
    fn test_smart_compression() {
        let config = CompressionConfig::default();
        let compressor = MessageCompressor::new(config);

        // 心跳消息不应该被压缩
        let heartbeat = "a".repeat(2000);
        let (_, result) = compressor.smart_compress(&heartbeat, "Heartbeat").unwrap();
        assert!(!result.compressed);

        // 历史消息应该被压缩
        let history = "a".repeat(2000);
        let (_, result) = compressor.smart_compress(&history, "History").unwrap();
        assert!(result.compressed);
    }
}
