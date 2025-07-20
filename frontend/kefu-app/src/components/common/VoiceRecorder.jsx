import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Progress, message } from 'antd';
import {
  AudioOutlined,
  AudioMutedOutlined,
  CloseOutlined,
  CheckOutlined,
  LoadingOutlined
} from '@ant-design/icons';

// 语音录制组件
const VoiceRecorder = ({
  maxDuration = 60, // 最大录制时长（秒）
  onRecordComplete,
  onCancel,
  autoStart = false,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // 检查浏览器支持
  const checkBrowserSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      message.error('您的浏览器不支持语音录制');
      return false;
    }
    
    if (!window.MediaRecorder) {
      message.error('您的浏览器不支持MediaRecorder');
      return false;
    }
    
    return true;
  };

  // 开始录音
  const startRecording = useCallback(async () => {
    if (!checkBrowserSupport()) return;

    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // 创建MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      // 设置事件处理
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = handleRecordingStop;
      
      // 开始录音
      mediaRecorder.start(100); // 每100ms收集一次数据
      setIsRecording(true);
      setDuration(0);
      
      // 启动计时器
      startTimer();
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (error.name === 'NotAllowedError') {
        message.error('请允许使用麦克风');
      } else {
        message.error('启动录音失败');
      }
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
    }
    
    // 停止音频流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // 暂停/恢复录音
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  }, [isPaused]);

  // 处理录音停止
  const handleRecordingStop = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      // 合并音频数据
      const audioBlob = new Blob(chunksRef.current, { 
        type: chunksRef.current[0]?.type || 'audio/webm' 
      });
      
      // 创建音频URL
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // 如果需要自动提交
      if (onRecordComplete && !audioUrl) {
        onRecordComplete(audioBlob);
      }
      
    } catch (error) {
      console.error('Failed to process recording:', error);
      message.error('处理录音失败');
    } finally {
      setIsProcessing(false);
    }
  }, [onRecordComplete, audioUrl]);

  // 重新录制
  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
    chunksRef.current = [];
    startRecording();
  }, [audioUrl, startRecording]);

  // 提交录音
  const submitRecording = useCallback(async () => {
    if (!audioUrl || !onRecordComplete) return;
    
    setIsProcessing(true);
    
    try {
      // 获取Blob数据
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // 回调
      await onRecordComplete(blob);
      
    } catch (error) {
      console.error('Failed to submit recording:', error);
      message.error('提交录音失败');
    } finally {
      setIsProcessing(false);
    }
  }, [audioUrl, onRecordComplete]);

  // 计时器
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => {
        const next = prev + 0.1;
        if (next >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        return next;
      });
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 清理
  useEffect(() => {
    return () => {
      stopTimer();
      stopRecording();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, stopRecording]);

  // 自动开始
  useEffect(() => {
    if (autoStart) {
      startRecording();
    }
  }, [autoStart, startRecording]);

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`voice-recorder ${className}`}>
      <div className="p-4 bg-white rounded-lg shadow-sm">
        {/* 录音中状态 */}
        {isRecording && !audioUrl && (
          <div className="text-center">
            <div className="mb-4">
              <div className="relative inline-block">
                <div className={`
                  w-24 h-24 rounded-full flex items-center justify-center
                  ${isPaused ? 'bg-orange-100' : 'bg-red-100 animate-pulse'}
                `}>
                  <AudioOutlined className="text-3xl text-red-500" />
                </div>
                {!isPaused && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-lg font-medium">{formatTime(duration)}</p>
              <Progress
                percent={(duration / maxDuration) * 100}
                showInfo={false}
                strokeColor="#ef4444"
                className="mb-2"
              />
              <p className="text-sm text-gray-500">
                最长录制 {maxDuration} 秒
              </p>
            </div>
            
            <div className="flex justify-center space-x-2">
              <Button
                type="default"
                icon={isPaused ? <AudioOutlined /> : <AudioMutedOutlined />}
                onClick={togglePause}
              >
                {isPaused ? '继续' : '暂停'}
              </Button>
              <Button
                type="primary"
                danger
                icon={<CheckOutlined />}
                onClick={stopRecording}
              >
                完成
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={() => {
                  stopRecording();
                  onCancel?.();
                }}
              >
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 预览状态 */}
        {audioUrl && !isProcessing && (
          <div className="text-center">
            <div className="mb-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full max-w-xs mx-auto"
              />
              <p className="text-sm text-gray-500 mt-2">
                时长: {formatTime(duration)}
              </p>
            </div>
            
            <div className="flex justify-center space-x-2">
              <Button
                type="default"
                onClick={resetRecording}
              >
                重新录制
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={submitRecording}
              >
                发送语音
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={() => {
                  URL.revokeObjectURL(audioUrl);
                  onCancel?.();
                }}
              >
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 开始录音 */}
        {!isRecording && !audioUrl && !autoStart && (
          <div className="text-center">
            <Button
              type="primary"
              size="large"
              icon={<AudioOutlined />}
              onClick={startRecording}
              className="mb-2"
            >
              开始录音
            </Button>
            <p className="text-sm text-gray-500">
              点击开始录制语音消息
            </p>
          </div>
        )}

        {/* 处理中 */}
        {isProcessing && (
          <div className="text-center">
            <LoadingOutlined className="text-2xl mb-2" />
            <p className="text-gray-500">处理中...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;