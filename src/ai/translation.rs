use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use super::{AIProcessor, AITask, AITaskType, config::AIConfig};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationResult {
    pub original_text: String,
    pub translated_text: String,
    pub source_language: String,
    pub target_language: String,
    pub confidence: f32,
    pub provider: String,
    pub cached: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CachedTranslation {
    text: String,
    source_lang: String,
    target_lang: String,
    timestamp: DateTime<Utc>,
}

pub struct TranslationProcessor {
    config: Arc<RwLock<AIConfig>>,
    http_client: reqwest::Client,
    translation_cache: Arc<RwLock<HashMap<String, CachedTranslation>>>,
}

// 确保TranslationProcessor可以在线程间安全传递
unsafe impl Send for TranslationProcessor {}
unsafe impl Sync for TranslationProcessor {}

impl TranslationProcessor {
    pub fn new(config: Arc<RwLock<AIConfig>>) -> Self {
        Self {
            config,
            http_client: reqwest::Client::new(),
            translation_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    fn generate_cache_key(&self, text: &str, source_lang: &str, target_lang: &str) -> String {
        format!("{source_lang}:{target_lang}:{text}")
    }

    async fn check_cache(&self, text: &str, source_lang: &str, target_lang: &str) -> Option<CachedTranslation> {
        let config = self.config.read().await;
        if !config.translation.cache_translations {
            return None;
        }

        let cache = self.translation_cache.read().await;
        let key = self.generate_cache_key(text, source_lang, target_lang);
        
        if let Some(cached) = cache.get(&key) {
            let now = Utc::now();
            let cache_ttl = chrono::Duration::seconds(config.translation.cache_ttl_seconds as i64);
            
            if now.signed_duration_since(cached.timestamp) < cache_ttl {
                return Some(cached.clone());
            }
        }
        
        None
    }

    async fn save_to_cache(&self, text: &str, source_lang: &str, target_lang: &str, translated: &str) {
        let config = self.config.read().await;
        if !config.translation.cache_translations {
            return;
        }

        let mut cache = self.translation_cache.write().await;
        let key = self.generate_cache_key(text, source_lang, target_lang);
        
        cache.insert(key, CachedTranslation {
            text: translated.to_string(),
            source_lang: source_lang.to_string(),
            target_lang: target_lang.to_string(),
            timestamp: Utc::now(),
        });
    }

    async fn detect_language(&self, text: &str) -> Result<String> {
        // 简单的语言检测逻辑
        let chinese_chars = text.chars().filter(|c| {
            (*c as u32) >= 0x4e00 && (*c as u32) <= 0x9fff
        }).count();
        
        let english_chars = text.chars().filter(|c| {
            c.is_ascii_alphabetic()
        }).count();
        
        let japanese_chars = text.chars().filter(|c| {
            (*c as u32) >= 0x3040 && (*c as u32) <= 0x309f ||  // Hiragana
            (*c as u32) >= 0x30a0 && (*c as u32) <= 0x30ff     // Katakana
        }).count();
        
        let total_chars = text.chars().count();
        
        if chinese_chars > total_chars / 3 {
            Ok("zh".to_string())
        } else if japanese_chars > total_chars / 3 {
            Ok("ja".to_string())
        } else if english_chars > total_chars / 2 {
            Ok("en".to_string())
        } else {
            Ok("auto".to_string())
        }
    }

    async fn translate_google(&self, text: &str, source_lang: &str, target_lang: &str) -> Result<TranslationResult> {
        let config = self.config.read().await;
        let translation_config = &config.translation;
        
        let mut params = vec![
            ("q", text),
            ("target", target_lang),
            ("key", &translation_config.api_key),
        ];
        
        if source_lang != "auto" {
            params.push(("source", source_lang));
        }
        
        let response = self.http_client
            .post(&translation_config.api_endpoint)
            .form(&params)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Google翻译API请求失败: {}", response.status()));
        }
        
        let response_body: serde_json::Value = response.json().await?;
        
        let translations = response_body["data"]["translations"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("无法解析Google翻译响应"))?;
        
        let translation = &translations[0];
        let translated_text = translation["translatedText"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("无法获取翻译文本"))?;
        
        let detected_source_lang = translation["detectedSourceLanguage"]
            .as_str()
            .unwrap_or(source_lang);
        
        Ok(TranslationResult {
            original_text: text.to_string(),
            translated_text: translated_text.to_string(),
            source_language: detected_source_lang.to_string(),
            target_language: target_lang.to_string(),
            confidence: 0.9,
            provider: "google".to_string(),
            cached: false,
        })
    }

    async fn translate_baidu(&self, text: &str, source_lang: &str, target_lang: &str) -> Result<TranslationResult> {
        let config = self.config.read().await;
        let translation_config = &config.translation;
        
        let app_id = &translation_config.api_key;
        let secret_key = translation_config.api_secret.as_ref()
            .ok_or_else(|| anyhow::anyhow!("百度翻译需要secret_key"))?;
        
        let salt = format!("{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs());
        
        let sign_str = format!("{app_id}{text}{salt}{secret_key}");
        let sign = format!("{:x}", md5::compute(sign_str));
        
        let params = vec![
            ("q", text),
            ("from", source_lang),
            ("to", target_lang),
            ("appid", app_id),
            ("salt", &salt),
            ("sign", &sign),
        ];
        
        let response = self.http_client
            .post(&translation_config.api_endpoint)
            .form(&params)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("百度翻译API请求失败: {}", response.status()));
        }
        
        let response_body: serde_json::Value = response.json().await?;
        
        if let Some(error_code) = response_body["error_code"].as_str() {
            return Err(anyhow::anyhow!("百度翻译错误: {}", error_code));
        }
        
        let trans_result = response_body["trans_result"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("无法解析百度翻译响应"))?;
        
        let translation = &trans_result[0];
        let translated_text = translation["dst"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("无法获取翻译文本"))?;
        
        Ok(TranslationResult {
            original_text: text.to_string(),
            translated_text: translated_text.to_string(),
            source_language: source_lang.to_string(),
            target_language: target_lang.to_string(),
            confidence: 0.85,
            provider: "baidu".to_string(),
            cached: false,
        })
    }

    async fn translate_azure(&self, text: &str, source_lang: &str, target_lang: &str) -> Result<TranslationResult> {
        let config = self.config.read().await;
        let translation_config = &config.translation;
        
        let mut url = format!("{}/translate?api-version=3.0&to={}", 
            translation_config.api_endpoint, target_lang);
        
        if source_lang != "auto" {
            url = format!("{url}&from={source_lang}");
        }
        
        let body = serde_json::json!([{
            "Text": text
        }]);
        
        let response = self.http_client
            .post(&url)
            .header("Ocp-Apim-Subscription-Key", &translation_config.api_key)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Azure翻译API请求失败: {}", response.status()));
        }
        
        let response_body: serde_json::Value = response.json().await?;
        
        let translations = response_body[0]["translations"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("无法解析Azure翻译响应"))?;
        
        let translation = &translations[0];
        let translated_text = translation["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("无法获取翻译文本"))?;
        
        let detected_source_lang = response_body[0]["detectedLanguage"]["language"]
            .as_str()
            .unwrap_or(source_lang);
        
        Ok(TranslationResult {
            original_text: text.to_string(),
            translated_text: translated_text.to_string(),
            source_language: detected_source_lang.to_string(),
            target_language: target_lang.to_string(),
            confidence: 0.92,
            provider: "azure".to_string(),
            cached: false,
        })
    }

    async fn translate_local(&self, text: &str, source_lang: &str, target_lang: &str) -> Result<TranslationResult> {
        // 简单的本地翻译逻辑（示例）
        let translation_dict = HashMap::from([
            ("hello", "你好"),
            ("thank you", "谢谢"),
            ("goodbye", "再见"),
            ("yes", "是的"),
            ("no", "不是"),
        ]);
        
        let translated = if let Some(translation) = translation_dict.get(text.to_lowercase().as_str()) {
            (*translation).to_string()
        } else {
            format!("[本地翻译] {text}")
        };
        
        Ok(TranslationResult {
            original_text: text.to_string(),
            translated_text: translated,
            source_language: source_lang.to_string(),
            target_language: target_lang.to_string(),
            confidence: 0.3,
            provider: "local".to_string(),
            cached: false,
        })
    }

    async fn validate_language_support(&self, source_lang: &str, target_lang: &str) -> Result<()> {
        let config = self.config.read().await;
        let translation_config = &config.translation;
        
        let source_mapping = translation_config.supported_languages.iter()
            .find(|lang| lang.code == source_lang);
        
        if let Some(mapping) = source_mapping {
            if !mapping.supported_directions.contains(&target_lang.to_string()) {
                return Err(anyhow::anyhow!("不支持从{}到{}的翻译", source_lang, target_lang));
            }
        }
        
        Ok(())
    }
}

#[async_trait::async_trait]
impl AIProcessor for TranslationProcessor {
    async fn process(&self, task: &AITask) -> Result<serde_json::Value> {
        let text = task.input_data["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少文本输入"))?;
        
        let config = self.config.read().await;
        let translation_config = &config.translation;
        
        if text.len() > translation_config.max_text_length {
            return Err(anyhow::anyhow!("文本长度超过限制"));
        }
        
        let source_lang = task.input_data["source_language"]
            .as_str()
            .unwrap_or(&translation_config.default_source_language)
            .to_string();
        
        let target_lang = task.input_data["target_language"]
            .as_str()
            .unwrap_or(&translation_config.default_target_language)
            .to_string();
        
        let detected_source_lang = if source_lang == "auto" && translation_config.auto_detect_language {
            self.detect_language(text).await?
        } else {
            source_lang
        };
        
        // 检查是否支持这种语言组合
        if detected_source_lang != "auto" {
            self.validate_language_support(&detected_source_lang, &target_lang).await?;
        }
        
        // 检查缓存
        if let Some(cached) = self.check_cache(text, &detected_source_lang, &target_lang).await {
            return Ok(serde_json::to_value(TranslationResult {
                original_text: text.to_string(),
                translated_text: cached.text,
                source_language: cached.source_lang,
                target_language: cached.target_lang,
                confidence: 0.9,
                provider: translation_config.service_provider.clone(),
                cached: true,
            })?);
        }
        
        // 执行翻译
        let result = match translation_config.service_provider.as_str() {
            "google" => self.translate_google(text, &detected_source_lang, &target_lang).await?,
            "baidu" => self.translate_baidu(text, &detected_source_lang, &target_lang).await?,
            "azure" => self.translate_azure(text, &detected_source_lang, &target_lang).await?,
            _ => self.translate_local(text, &detected_source_lang, &target_lang).await?,
        };
        
        // 保存到缓存
        if result.confidence >= translation_config.confidence_threshold {
            self.save_to_cache(text, &result.source_language, &result.target_language, &result.translated_text).await;
        }
        
        Ok(serde_json::to_value(result)?)
    }

    fn get_task_type(&self) -> AITaskType {
        AITaskType::Translation
    }

    fn get_name(&self) -> &'static str {
        "翻译处理器"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::config::AIConfig;

    #[tokio::test]
    async fn test_language_detection() {
        let config = Arc::new(RwLock::new(AIConfig::default()));
        let processor = TranslationProcessor::new(config);
        
        assert_eq!(processor.detect_language("你好世界").await.unwrap(), "zh");
        assert_eq!(processor.detect_language("Hello World").await.unwrap(), "en");
        assert_eq!(processor.detect_language("こんにちは").await.unwrap(), "ja");
    }

    #[tokio::test]
    async fn test_local_translation() {
        let config = Arc::new(RwLock::new(AIConfig::default()));
        let processor = TranslationProcessor::new(config);
        
        let result = processor.translate_local("hello", "en", "zh").await.unwrap();
        assert_eq!(result.translated_text, "你好");
        assert_eq!(result.provider, "local");
    }
} 