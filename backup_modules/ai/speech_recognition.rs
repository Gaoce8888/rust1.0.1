use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use base64::{Engine, engine::general_purpose::STANDARD};
use super::{AIProcessor, AITask, AITaskType, config::AIConfig};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeechRecognitionResult {
    pub text: String,
    pub confidence: f32,
    pub language: String,
    pub duration_ms: u64,
    pub word_timestamps: Vec<WordTimestamp>,
    pub speaker_segments: Vec<SpeakerSegment>,
    pub provider: String,
    pub audio_format: String,
    pub sample_rate: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordTimestamp {
    pub word: String,
    pub start_time_ms: u64,
    pub end_time_ms: u64,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeakerSegment {
    pub speaker_id: String,
    pub start_time_ms: u64,
    pub end_time_ms: u64,
    pub text: String,
    pub confidence: f32,
}

pub struct SpeechProcessor {
    config: Arc<RwLock<AIConfig>>,
    http_client: reqwest::Client,
}

// 确保SpeechProcessor可以在线程间安全传递
unsafe impl Send for SpeechProcessor {}
unsafe impl Sync for SpeechProcessor {}

impl SpeechProcessor {
    pub fn new(config: Arc<RwLock<AIConfig>>) -> Self {
        Self {
            config,
            http_client: reqwest::Client::new(),
        }
    }

    async fn validate_audio_file(&self, file_path: &str) -> Result<AudioMetadata> {
        let config = self.config.read().await;
        let speech_config = &config.speech_recognition;
        
        let metadata = std::fs::metadata(file_path)?;
        let file_size = metadata.len();
        
        if file_size > speech_config.max_file_size_bytes {
            return Err(anyhow::anyhow!("音频文件大小超过限制"));
        }
        
        let extension = std::path::Path::new(file_path)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");
        
        if !speech_config.supported_formats.contains(&extension.to_lowercase()) {
            return Err(anyhow::anyhow!("不支持的音频格式: {}", extension));
        }
        
        // 读取音频文件基本信息
        let audio_data = std::fs::read(file_path)?;
        let duration_ms = self.estimate_audio_duration(&audio_data, extension).await?;
        
        if duration_ms > speech_config.max_audio_duration_seconds * 1000 {
            return Err(anyhow::anyhow!("音频时长超过限制"));
        }
        
        Ok(AudioMetadata {
            file_size,
            duration_ms,
            format: extension.to_string(),
            sample_rate: 16000, // 默认采样率
        })
    }

    async fn estimate_audio_duration(&self, _audio_data: &[u8], _format: &str) -> Result<u64> {
        // 简单的音频时长估算，实际应该使用专业的音频处理库
        Ok(5000) // 默认返回5秒
    }

    async fn recognize_speech_azure(&self, audio_data: &[u8], language: &str, format: &str) -> Result<SpeechRecognitionResult> {
        let config = self.config.read().await;
        let speech_config = &config.speech_recognition;
        
        let url = format!("{}/speech/recognition/conversation/cognitiveservices/v1?language={}&format=detailed", 
            speech_config.api_endpoint, language);
        
        let content_type = match format.to_lowercase().as_str() {
            "wav" => "audio/wav",
            "mp3" => "audio/mpeg",
            "ogg" => "audio/ogg",
            _ => "audio/wav",
        };
        
        let response = self.http_client
            .post(&url)
            .header("Ocp-Apim-Subscription-Key", &speech_config.api_key)
            .header("Content-Type", content_type)
            .body(audio_data.to_vec())
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Azure语音识别API请求失败: {}", response.status()));
        }
        
        let response_body: serde_json::Value = response.json().await?;
        
        let display_text = response_body["DisplayText"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("无法获取识别文本"))?;
        
        let confidence = response_body["NBest"][0]["Confidence"]
            .as_f64()
            .unwrap_or(0.0) as f32;
        
        let duration_ms = response_body["Duration"]
            .as_u64()
            .unwrap_or(0) / 10_000; // 转换为毫秒
        
        // 解析词级时间戳
        let mut word_timestamps = Vec::new();
        if let Some(words) = response_body["NBest"][0]["Words"].as_array() {
            for word in words {
                if let (Some(word_text), Some(offset), Some(duration)) = (
                    word["Word"].as_str(),
                    word["Offset"].as_u64(),
                    word["Duration"].as_u64(),
                ) {
                    word_timestamps.push(WordTimestamp {
                        word: word_text.to_string(),
                        start_time_ms: offset / 10_000,
                        end_time_ms: (offset + duration) / 10_000,
                        confidence: word["Confidence"].as_f64().unwrap_or(0.0) as f32,
                    });
                }
            }
        }
        
        Ok(SpeechRecognitionResult {
            text: display_text.to_string(),
            confidence,
            language: language.to_string(),
            duration_ms,
            word_timestamps,
            speaker_segments: vec![], // Azure需要额外的API调用才能获取说话人信息
            provider: "azure".to_string(),
            audio_format: format.to_string(),
            sample_rate: 16000,
        })
    }

    async fn recognize_speech_google(&self, audio_data: &[u8], language: &str, format: &str) -> Result<SpeechRecognitionResult> {
        let config = self.config.read().await;
        let speech_config = &config.speech_recognition;
        
        let audio_base64 = STANDARD.encode(audio_data);
        
        let request_body = serde_json::json!({
            "config": {
                "encoding": format.to_uppercase(),
                "sampleRateHertz": 16000,
                "languageCode": language,
                "enableWordTimeOffsets": speech_config.enable_word_timestamps,
                "enableAutomaticPunctuation": speech_config.enable_punctuation,
                "enableSpeakerDiarization": speech_config.enable_speaker_diarization,
                "diarizationSpeakerCount": if speech_config.enable_speaker_diarization { 2 } else { 0 },
                "speechContexts": if !speech_config.custom_vocabulary.is_empty() {
                    vec![serde_json::json!({
                        "phrases": speech_config.custom_vocabulary
                    })]
                } else {
                    vec![]
                }
            },
            "audio": {
                "content": audio_base64
            }
        });
        
        let response = self.http_client
            .post(&speech_config.api_endpoint)
            .header("Authorization", format!("Bearer {}", speech_config.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Google语音识别API请求失败: {}", response.status()));
        }
        
        let response_body: serde_json::Value = response.json().await?;
        
        let results = response_body["results"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("无法解析Google语音识别响应"))?;
        
        if results.is_empty() {
            return Err(anyhow::anyhow!("语音识别无结果"));
        }
        
        let best_result = &results[0];
        let alternative = &best_result["alternatives"][0];
        
        let text = alternative["transcript"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("无法获取识别文本"))?;
        
        let confidence = alternative["confidence"]
            .as_f64()
            .unwrap_or(0.0) as f32;
        
        // 解析词级时间戳
        let mut word_timestamps = Vec::new();
        if let Some(words) = alternative["words"].as_array() {
            for word in words {
                if let (Some(word_text), Some(start_time), Some(end_time)) = (
                    word["word"].as_str(),
                    word["startTime"].as_str(),
                    word["endTime"].as_str(),
                ) {
                    #[allow(clippy::redundant_field_names)]
                    word_timestamps.push(WordTimestamp {
                        word: word_text.to_string(),
                        start_time_ms: Self::parse_google_timestamp(start_time),
                        end_time_ms: Self::parse_google_timestamp(end_time),
                        confidence: confidence,
                    });
                }
            }
        }
        
        Ok(SpeechRecognitionResult {
            text: text.to_string(),
            confidence,
            language: language.to_string(),
            duration_ms: word_timestamps.last().map(|w| w.end_time_ms).unwrap_or(0),
            word_timestamps,
            speaker_segments: vec![], // 需要额外解析
            provider: "google".to_string(),
            audio_format: format.to_string(),
            sample_rate: 16000,
        })
    }

    async fn recognize_speech_baidu(&self, audio_data: &[u8], language: &str, format: &str) -> Result<SpeechRecognitionResult> {
        let config = self.config.read().await;
        let speech_config = &config.speech_recognition;
        
        let audio_base64 = STANDARD.encode(audio_data);
        
        let request_body = serde_json::json!({
            "format": format,
            "rate": 16000,
            "channel": 1,
            "cuid": "rust_speech_client",
            "token": speech_config.api_key,
            "speech": audio_base64,
            "len": audio_data.len()
        });
        
        let response = self.http_client
            .post(&speech_config.api_endpoint)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("百度语音识别API请求失败: {}", response.status()));
        }
        
        let response_body: serde_json::Value = response.json().await?;
        
        let err_no = response_body["err_no"].as_i64().unwrap_or(-1);
        if err_no != 0 {
            return Err(anyhow::anyhow!("百度语音识别错误: {}", err_no));
        }
        
        let results = response_body["result"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("无法解析百度语音识别响应"))?;
        
        if results.is_empty() {
            return Err(anyhow::anyhow!("语音识别无结果"));
        }
        
        let text = results[0]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("无法获取识别文本"))?;
        
        Ok(SpeechRecognitionResult {
            text: text.to_string(),
            confidence: 0.8, // 百度API不返回置信度
            language: language.to_string(),
            duration_ms: 0, // 百度API不返回时长
            word_timestamps: vec![],
            speaker_segments: vec![],
            provider: "baidu".to_string(),
            audio_format: format.to_string(),
            sample_rate: 16000,
        })
    }

    async fn recognize_speech_local(&self, _audio_data: &[u8], language: &str, format: &str) -> Result<SpeechRecognitionResult> {
        // 简单的本地语音识别逻辑（示例）
        let mock_text = match language {
            "zh-CN" => "这是一个本地语音识别的示例结果",
            "en-US" => "This is a local speech recognition example result",
            _ => "Local speech recognition result",
        };
        
        Ok(SpeechRecognitionResult {
            text: mock_text.to_string(),
            confidence: 0.5,
            language: language.to_string(),
            duration_ms: 3000,
            word_timestamps: vec![],
            speaker_segments: vec![],
            provider: "local".to_string(),
            audio_format: format.to_string(),
            sample_rate: 16000,
        })
    }

    fn parse_google_timestamp(timestamp: &str) -> u64 {
        // 解析Google的时间戳格式 "1.200s" -> 1200ms
        if let Some(s_pos) = timestamp.find('s') {
            let time_str = &timestamp[..s_pos];
            if let Ok(seconds) = time_str.parse::<f64>() {
                return (seconds * 1000.0) as u64;
            }
        }
        0
    }

    async fn post_process_result(&self, mut result: SpeechRecognitionResult) -> Result<SpeechRecognitionResult> {
        let config = self.config.read().await;
        let speech_config = &config.speech_recognition;
        
        // 应用置信度阈值过滤
        if result.confidence < speech_config.confidence_threshold {
            result.text = "[低置信度] ".to_string() + &result.text;
        }
        
        // 过滤低置信度的单词
        result.word_timestamps.retain(|word| word.confidence >= speech_config.confidence_threshold);
        
        Ok(result)
    }
}

#[derive(Debug)]
#[allow(dead_code)]
struct AudioMetadata {
    file_size: u64,
    duration_ms: u64,
    format: String,
    sample_rate: u32,
}

#[async_trait::async_trait]
impl AIProcessor for SpeechProcessor {
    async fn process(&self, task: &AITask) -> Result<serde_json::Value> {
        let audio_file_path = task.input_data["audio_file_path"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少音频文件路径"))?;
        
        let config = self.config.read().await;
        let speech_config = &config.speech_recognition;
        
        let language = task.input_data["language"]
            .as_str()
            .unwrap_or(&speech_config.default_language)
            .to_string();
        
        // 验证音频文件
        let audio_metadata = self.validate_audio_file(audio_file_path).await?;
        
        // 读取音频文件
        let audio_data = std::fs::read(audio_file_path)?;
        
        // 执行语音识别
        let result = match speech_config.service_provider.as_str() {
            "azure" => self.recognize_speech_azure(&audio_data, &language, &audio_metadata.format).await?,
            "google" => self.recognize_speech_google(&audio_data, &language, &audio_metadata.format).await?,
            "baidu" => self.recognize_speech_baidu(&audio_data, &language, &audio_metadata.format).await?,
            _ => self.recognize_speech_local(&audio_data, &language, &audio_metadata.format).await?,
        };
        
        // 后处理结果
        let processed_result = self.post_process_result(result).await?;
        
        Ok(serde_json::to_value(processed_result)?)
    }

    fn get_task_type(&self) -> AITaskType {
        AITaskType::SpeechRecognition
    }

    fn get_name(&self) -> &'static str {
        "语音识别处理器"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::config::AIConfig;

    #[tokio::test]
    async fn test_parse_google_timestamp() {
        assert_eq!(SpeechProcessor::parse_google_timestamp("1.200s"), 1200);
        assert_eq!(SpeechProcessor::parse_google_timestamp("0.500s"), 500);
        assert_eq!(SpeechProcessor::parse_google_timestamp("invalid"), 0);
    }

    #[tokio::test]
    async fn test_local_speech_recognition() {
        let config = Arc::new(RwLock::new(AIConfig::default()));
        let processor = SpeechProcessor::new(config);
        
        let result = processor.recognize_speech_local(&[], "zh-CN", "wav").await.unwrap();
        assert_eq!(result.provider, "local");
        assert_eq!(result.language, "zh-CN");
        assert!(result.text.contains("本地语音识别"));
    }
} 