use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub enabled: bool,
    pub max_concurrent_tasks: usize,
    pub task_timeout_seconds: u64,
    pub intent_recognition: IntentRecognitionConfig,
    pub translation: TranslationConfig,
    pub speech_recognition: SpeechRecognitionConfig,
    pub sentiment_analysis: SentimentAnalysisConfig,
    pub auto_reply: AutoReplyConfig,
    pub react_component_generation: ReactComponentGenerationConfig,
    pub ai_service_integration: AIServiceIntegrationConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentRecognitionConfig {
    pub enabled: bool,
    pub model_type: String,
    pub api_endpoint: String,
    pub api_key: String,
    pub confidence_threshold: f32,
    pub max_retries: u32,
    pub timeout_seconds: u64,
    pub supported_languages: Vec<String>,
    pub custom_intents: Vec<CustomIntent>,
    pub preprocessing: PreprocessingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomIntent {
    pub name: String,
    pub description: String,
    pub keywords: Vec<String>,
    pub patterns: Vec<String>,
    pub confidence_boost: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationConfig {
    pub enabled: bool,
    pub service_provider: String, // "google", "azure", "aws", "baidu"
    pub api_endpoint: String,
    pub api_key: String,
    pub api_secret: Option<String>,
    pub default_source_language: String,
    pub default_target_language: String,
    pub supported_languages: Vec<LanguageMapping>,
    pub auto_detect_language: bool,
    pub confidence_threshold: f32,
    pub max_text_length: usize,
    pub cache_translations: bool,
    pub cache_ttl_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageMapping {
    pub code: String,
    pub name: String,
    pub supported_directions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeechRecognitionConfig {
    pub enabled: bool,
    pub service_provider: String, // "azure", "google", "aws", "baidu"
    pub api_endpoint: String,
    pub api_key: String,
    pub api_secret: Option<String>,
    pub default_language: String,
    pub supported_languages: Vec<String>,
    pub supported_formats: Vec<String>,
    pub max_audio_duration_seconds: u64,
    pub max_file_size_bytes: u64,
    pub confidence_threshold: f32,
    pub enable_punctuation: bool,
    pub enable_word_timestamps: bool,
    pub enable_speaker_diarization: bool,
    pub custom_vocabulary: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentimentAnalysisConfig {
    pub enabled: bool,
    pub model_type: String,
    pub api_endpoint: String,
    pub api_key: String,
    pub supported_languages: Vec<String>,
    pub confidence_threshold: f32,
    pub sentiment_categories: Vec<String>,
    pub custom_keywords: HashMap<String, f32>, // keyword -> sentiment_score
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoReplyConfig {
    pub enabled: bool,
    pub model_type: String,
    pub api_endpoint: String,
    pub api_key: String,
    pub max_response_length: usize,
    pub temperature: f32,
    pub top_p: f32,
    pub frequency_penalty: f32,
    pub presence_penalty: f32,
    pub reply_templates: Vec<ReplyTemplate>,
    pub context_window_size: usize,
    pub personalization: PersonalizationConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplyTemplate {
    pub intent: String,
    pub template: String,
    pub variables: Vec<String>,
    pub priority: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalizationConfig {
    pub enabled: bool,
    pub use_customer_history: bool,
    pub use_customer_preferences: bool,
    pub learning_rate: f32,
    pub max_history_messages: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreprocessingConfig {
    pub normalize_text: bool,
    pub remove_punctuation: bool,
    pub convert_to_lowercase: bool,
    pub remove_stopwords: bool,
    pub stemming: bool,
    pub lemmatization: bool,
    pub custom_filters: Vec<String>,
}

/// React组件生成配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReactComponentGenerationConfig {
    pub enabled: bool,
    pub model_type: String, // "gpt-4", "claude", "gemini", "custom"
    pub api_endpoint: String,
    pub api_key: String,
    pub max_tokens: usize,
    pub temperature: f32,
    pub top_p: f32,
    pub frequency_penalty: f32,
    pub presence_penalty: f32,
    pub supported_component_types: Vec<String>,
    pub component_templates: Vec<ComponentTemplate>,
    pub style_presets: Vec<StylePreset>,
    pub validation_rules: Vec<ValidationRule>,
    pub generation_prompts: GenerationPrompts,
    pub quality_control: QualityControlConfig,
}

/// 组件模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentTemplate {
    pub name: String,
    pub description: String,
    pub component_type: String,
    pub base_template: String,
    pub required_props: Vec<String>,
    pub optional_props: Vec<String>,
    pub default_styles: serde_json::Value,
    pub example_usage: String,
    pub tags: Vec<String>,
}

/// 样式预设
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StylePreset {
    pub name: String,
    pub description: String,
    pub styles: serde_json::Value,
    pub theme: String, // "light", "dark", "custom"
    pub responsive: bool,
    pub animations: Vec<String>,
}

/// 验证规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRule {
    pub name: String,
    pub rule_type: String, // "prop_validation", "style_validation", "accessibility"
    pub condition: String,
    pub error_message: String,
    pub severity: String, // "error", "warning", "info"
}

/// 生成提示词
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationPrompts {
    pub component_generation: String,
    pub style_generation: String,
    pub accessibility_improvement: String,
    pub responsive_design: String,
    pub performance_optimization: String,
    pub code_review: String,
}

/// 质量控制配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityControlConfig {
    pub enabled: bool,
    pub code_quality_check: bool,
    pub accessibility_check: bool,
    pub performance_check: bool,
    pub security_check: bool,
    pub auto_fix_issues: bool,
    pub review_threshold: f32,
}

/// AI服务集成配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIServiceIntegrationConfig {
    pub enabled: bool,
    pub openai: OpenAIConfig,
    pub anthropic: AnthropicConfig,
    pub google: GoogleAIConfig,
    pub azure: AzureAIConfig,
    pub custom_services: Vec<CustomAIService>,
    pub service_selection: ServiceSelectionStrategy,
    pub fallback_chain: Vec<String>,
    pub rate_limiting: RateLimitingConfig,
    pub caching: CachingConfig,
}

/// OpenAI配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIConfig {
    pub enabled: bool,
    pub api_key: String,
    pub organization_id: Option<String>,
    pub base_url: String,
    pub models: Vec<String>,
    pub max_tokens: usize,
    pub temperature: f32,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
}

/// Anthropic配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicConfig {
    pub enabled: bool,
    pub api_key: String,
    pub base_url: String,
    pub models: Vec<String>,
    pub max_tokens: usize,
    pub temperature: f32,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
}

/// Google AI配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleAIConfig {
    pub enabled: bool,
    pub api_key: String,
    pub base_url: String,
    pub models: Vec<String>,
    pub max_tokens: usize,
    pub temperature: f32,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
}

/// Azure AI配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AzureAIConfig {
    pub enabled: bool,
    pub api_key: String,
    pub endpoint: String,
    pub deployment_name: String,
    pub api_version: String,
    pub models: Vec<String>,
    pub max_tokens: usize,
    pub temperature: f32,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
}

/// 自定义AI服务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomAIService {
    pub name: String,
    pub enabled: bool,
    pub api_endpoint: String,
    pub api_key: Option<String>,
    pub auth_type: String, // "api_key", "bearer", "oauth", "none"
    pub request_format: String, // "json", "form", "xml"
    pub response_format: String, // "json", "text", "xml"
    pub models: Vec<String>,
    pub max_tokens: usize,
    pub temperature: f32,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
    pub custom_headers: std::collections::HashMap<String, String>,
}

/// 服务选择策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceSelectionStrategy {
    pub strategy: String, // "round_robin", "load_balanced", "cost_optimized", "quality_optimized"
    pub weights: std::collections::HashMap<String, f32>,
    pub cost_limits: std::collections::HashMap<String, f32>,
    pub quality_thresholds: std::collections::HashMap<String, f32>,
}

/// 速率限制配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitingConfig {
    pub enabled: bool,
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
    pub requests_per_day: u32,
    pub burst_limit: u32,
    pub retry_after_seconds: u64,
}

/// 缓存配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachingConfig {
    pub enabled: bool,
    pub cache_type: String, // "memory", "redis", "file"
    pub ttl_seconds: u64,
    pub max_cache_size: usize,
    pub cache_key_pattern: String,
    pub invalidate_on_update: bool,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_concurrent_tasks: 10,
            task_timeout_seconds: 30,
            intent_recognition: IntentRecognitionConfig::default(),
            translation: TranslationConfig::default(),
            speech_recognition: SpeechRecognitionConfig::default(),
            sentiment_analysis: SentimentAnalysisConfig::default(),
            auto_reply: AutoReplyConfig::default(),
            react_component_generation: ReactComponentGenerationConfig::default(),
            ai_service_integration: AIServiceIntegrationConfig::default(),
        }
    }
}

impl Default for IntentRecognitionConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            model_type: "openai".to_string(),
            api_endpoint: "https://api.openai.com/v1/chat/completions".to_string(),
            api_key: "".to_string(),
            confidence_threshold: 0.7,
            max_retries: 3,
            timeout_seconds: 10,
            supported_languages: vec!["zh".to_string(), "en".to_string()],
            custom_intents: vec![
                CustomIntent {
                    name: "complaint".to_string(),
                    description: "客户投诉".to_string(),
                    keywords: vec!["投诉".to_string(), "不满".to_string(), "问题".to_string()],
                    patterns: vec!["我要投诉".to_string(), "这个有问题".to_string()],
                    confidence_boost: 0.1,
                },
                CustomIntent {
                    name: "inquiry".to_string(),
                    description: "咨询问询".to_string(),
                    keywords: vec!["询问".to_string(), "咨询".to_string(), "了解".to_string()],
                    patterns: vec!["我想了解".to_string(), "请问".to_string()],
                    confidence_boost: 0.05,
                },
                CustomIntent {
                    name: "order".to_string(),
                    description: "订单相关".to_string(),
                    keywords: vec!["订单".to_string(), "购买".to_string(), "下单".to_string()],
                    patterns: vec!["我要买".to_string(), "下单".to_string()],
                    confidence_boost: 0.1,
                },
            ],
            preprocessing: PreprocessingConfig::default(),
        }
    }
}

impl Default for TranslationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            service_provider: "google".to_string(),
            api_endpoint: "https://translation.googleapis.com/language/translate/v2".to_string(),
            api_key: "".to_string(),
            api_secret: None,
            default_source_language: "auto".to_string(),
            default_target_language: "en".to_string(),
            supported_languages: vec![
                LanguageMapping {
                    code: "zh".to_string(),
                    name: "中文".to_string(),
                    supported_directions: vec!["en".to_string(), "ja".to_string()],
                },
                LanguageMapping {
                    code: "en".to_string(),
                    name: "English".to_string(),
                    supported_directions: vec!["zh".to_string(), "ja".to_string()],
                },
                LanguageMapping {
                    code: "ja".to_string(),
                    name: "日本語".to_string(),
                    supported_directions: vec!["zh".to_string(), "en".to_string()],
                },
            ],
            auto_detect_language: true,
            confidence_threshold: 0.8,
            max_text_length: 5000,
            cache_translations: true,
            cache_ttl_seconds: 3600,
        }
    }
}

impl Default for SpeechRecognitionConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            service_provider: "azure".to_string(),
            api_endpoint: "https://speech.microsoft.com/cognitiveservices/v1".to_string(),
            api_key: "".to_string(),
            api_secret: None,
            default_language: "zh-CN".to_string(),
            supported_languages: vec![
                "zh-CN".to_string(),
                "en-US".to_string(),
                "ja-JP".to_string(),
            ],
            supported_formats: vec![
                "wav".to_string(),
                "mp3".to_string(),
                "ogg".to_string(),
                "flac".to_string(),
            ],
            max_audio_duration_seconds: 300,
            max_file_size_bytes: 10_000_000, // 10MB
            confidence_threshold: 0.6,
            enable_punctuation: true,
            enable_word_timestamps: false,
            enable_speaker_diarization: false,
            custom_vocabulary: vec![],
        }
    }
}

impl Default for SentimentAnalysisConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            model_type: "transformer".to_string(),
            api_endpoint: "https://api.huggingface.co/models".to_string(),
            api_key: String::new(),
            supported_languages: vec!["zh".to_string(), "en".to_string()],
            confidence_threshold: 0.7,
            sentiment_categories: vec![
                "positive".to_string(),
                "negative".to_string(),
                "neutral".to_string(),
            ],
            custom_keywords: HashMap::new(),
        }
    }
}

impl Default for AutoReplyConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            model_type: "openai".to_string(),
            api_endpoint: "https://api.openai.com/v1/chat/completions".to_string(),
            api_key: String::new(),
            max_response_length: 500,
            temperature: 0.7,
            top_p: 0.9,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            reply_templates: vec![
                ReplyTemplate {
                    intent: "greeting".to_string(),
                    template: "您好！欢迎咨询，我是您的专属客服，很高兴为您服务！".to_string(),
                    variables: vec![],
                    priority: 10,
                },
                ReplyTemplate {
                    intent: "complaint".to_string(),
                    template: "非常抱歉给您带来了不便，我会立即为您处理这个问题。".to_string(),
                    variables: vec![],
                    priority: 9,
                },
                ReplyTemplate {
                    intent: "inquiry".to_string(),
                    template: "感谢您的咨询，我来为您详细解答。".to_string(),
                    variables: vec![],
                    priority: 7,
                },
            ],
            context_window_size: 10,
            personalization: PersonalizationConfig::default(),
        }
    }
}

impl Default for PersonalizationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            use_customer_history: true,
            use_customer_preferences: true,
            learning_rate: 0.1,
            max_history_messages: 20,
        }
    }
}

impl Default for PreprocessingConfig {
    fn default() -> Self {
        Self {
            normalize_text: true,
            remove_punctuation: false,
            convert_to_lowercase: false,
            remove_stopwords: false,
            stemming: false,
            lemmatization: false,
            custom_filters: vec![],
        }
    }
}

impl AIConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.max_concurrent_tasks == 0 {
            return Err("max_concurrent_tasks must be greater than 0".to_string());
        }

        if self.task_timeout_seconds == 0 {
            return Err("task_timeout_seconds must be greater than 0".to_string());
        }

        if self.intent_recognition.enabled && self.intent_recognition.api_key.is_empty() {
            return Err("intent_recognition.api_key is required when enabled".to_string());
        }

        if self.translation.enabled && self.translation.api_key.is_empty() {
            return Err("translation.api_key is required when enabled".to_string());
        }

        if self.speech_recognition.enabled && self.speech_recognition.api_key.is_empty() {
            return Err("speech_recognition.api_key is required when enabled".to_string());
        }

        if self.auto_reply.enabled && self.auto_reply.api_key.is_empty() {
            return Err("auto_reply.api_key is required when enabled".to_string());
        }

        Ok(())
    }

    pub fn get_enabled_features(&self) -> Vec<String> {
        let mut features = Vec::new();
        
        if self.intent_recognition.enabled {
            features.push("intent_recognition".to_string());
        }
        if self.translation.enabled {
            features.push("translation".to_string());
        }
        if self.speech_recognition.enabled {
            features.push("speech_recognition".to_string());
        }
        if self.sentiment_analysis.enabled {
            features.push("sentiment_analysis".to_string());
        }
        if self.auto_reply.enabled {
            features.push("auto_reply".to_string());
        }
        
        features
    }
} 