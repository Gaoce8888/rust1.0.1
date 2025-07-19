"use client";

import React, {useRef, useState} from "react";
import {
  Button, 
  Tooltip, 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Image,
  Chip,
} from "@heroui/react";
import {Icon} from "@iconify/react";
import {cn} from "@heroui/react";

import PromptInput from "./prompt-input";

/**
 * 增强版输入框组件
 * 支持文字、图片、文件、语音等多种消息类型
 * 
 * 功能特点：
 * - 文本输入和发送
 * - 图片选择和预览
 * - 文件选择和上传
 * - 语音录制功能
 * - 输入状态通知
 * - 快捷键支持（Enter发送）
 * - 附件管理
 * 
 * @param {Function} onSendMessage - 发送消息回调函数
 * @param {Function} onTyping - 输入状态回调函数
 * @param {string} placeholder - 输入框占位符文本
 * @param {Object} classNames - 自定义样式类名
 * @param {Object} props - 其他属性
 */
export default function EnhancedPromptInput({
  onSendMessage,
  onTyping,
  placeholder = "输入消息...",
  classNames = {},
  ...props
}) {
  // ========== 状态管理 ==========
  const [prompt, setPrompt] = useState("");  // 输入文本
  const [isRecording, setIsRecording] = useState(false);  // 是否正在录音
  const [recordingTime, setRecordingTime] = useState(0);  // 录音时长
  const [selectedFiles, setSelectedFiles] = useState([]);  // 选中的文件列表
  const [previewImage, setPreviewImage] = useState(null);  // 预览图片
  
  // ========== Refs ==========
  const fileInputRef = useRef(null);  // 文件输入框引用
  const imageInputRef = useRef(null);  // 图片输入框引用
  const recordingIntervalRef = useRef(null);  // 录音计时器引用
  
  // ========== Modal控制 ==========
  const {isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose} = useDisclosure();

  /**
   * 发送文本消息
   * 检查输入内容，调用发送回调，清空输入框
   */
  const handleSendText = () => {
    if (!prompt.trim()) return;
    
    onSendMessage({
      type: 'text',
      content: prompt.trim(),
    });
    
    setPrompt("");
  };

  // 处理文件选择
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    files.forEach(file => {
      // 检查文件大小
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`文件 ${file.name} 超过10MB限制`);
        return;
      }
      
      // 发送文件消息
      onSendMessage({
        type: 'file',
        file: file,
        fileName: file.name,
        fileSize: file.size,
      });
    });
    
    // 清空input
    e.target.value = '';
  };

  // 处理图片选择
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const file = files[0];
    
    // 检查是否为图片
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    
    // 检查文件大小
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('图片大小不能超过5MB');
      return;
    }
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage({
        url: e.target.result,
        file: file,
      });
      onImageModalOpen();
    };
    reader.readAsDataURL(file);
    
    // 清空input
    e.target.value = '';
  };

  // 发送图片
  const handleSendImage = () => {
    if (!previewImage) return;
    
    onSendMessage({
      type: 'image',
      file: previewImage.file,
      imageUrl: previewImage.url,
    });
    
    setPreviewImage(null);
    onImageModalClose();
  };

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 这里需要实现实际的录音逻辑
      // 使用 MediaRecorder API
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // 开始计时
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  // 停止录音
  const stopRecording = () => {
    setIsRecording(false);
    
    // 停止计时
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    // 发送语音消息
    // 这里需要获取实际的录音数据
    onSendMessage({
      type: 'voice',
      voiceDuration: recordingTime,
      // voiceBlob: recordingBlob,
    });
    
    setRecordingTime(0);
  };

  // 格式化录音时间
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理输入变化
  const handleInputChange = (value) => {
    setPrompt(value);
    
    // 触发正在输入事件
    if (onTyping) {
      onTyping();
    }
  };

  return (
    <>
      <form 
        className="flex w-full items-start gap-2" 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendText();
        }}
      >
        {/* 文件上传按钮 */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          multiple
        />
        
        {/* 图片上传按钮 */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        <PromptInput
          {...props}
          placeholder={isRecording ? "正在录音..." : placeholder}
          disabled={isRecording}
          classNames={{
            innerWrapper: cn("items-center", classNames?.innerWrapper),
            input: cn(
              "text-medium data-[has-start-content=true]:ps-0 data-[has-start-content=true]:pe-0",
              classNames?.input,
            ),
          }}
          endContent={
            <div className="flex gap-2">
              {/* 录音时显示录音时长 */}
              {isRecording && (
                <Chip size="sm" color="danger" variant="flat">
                  <Icon icon="solar:record-circle-bold" width={16} className="animate-pulse" />
                  <span className="ml-1">{formatRecordingTime(recordingTime)}</span>
                </Chip>
              )}
              
              {/* 语音输入按钮 */}
              {!prompt && !isRecording && (
                <Tooltip showArrow content="按住录音">
                  <Button 
                    isIconOnly 
                    radius="full" 
                    variant="light"
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                  >
                    <Icon className="text-default-500" icon="solar:microphone-3-linear" width={20} />
                  </Button>
                </Tooltip>
              )}

              {/* 停止录音按钮 */}
              {isRecording && (
                <Tooltip showArrow content="停止录音">
                  <Button
                    isIconOnly
                    color="danger"
                    radius="full"
                    variant="solid"
                    onClick={stopRecording}
                  >
                    <Icon icon="solar:stop-circle-linear" width={20} />
                  </Button>
                </Tooltip>
              )}

              {/* 发送消息按钮 */}
              {!isRecording && (
                <Tooltip showArrow content="发送消息">
                  <Button
                    isIconOnly
                    className={props?.classNames?.button || ""}
                    color={!prompt ? "default" : "primary"}
                    isDisabled={!prompt}
                    radius="full"
                    variant={!prompt ? "flat" : "solid"}
                    onClick={handleSendText}
                  >
                    <Icon
                      className={cn(
                        "[&>path]:stroke-[2px]",
                        !prompt ? "text-default-500" : "text-primary-foreground",
                        props?.classNames?.buttonIcon || "",
                      )}
                      icon="solar:arrow-up-linear"
                      width={20}
                    />
                  </Button>
                </Tooltip>
              )}
            </div>
          }
          startContent={
            /* 附件菜单 */
            <Popover placement="top">
              <PopoverTrigger>
                <Button isIconOnly className="p-[10px]" radius="full" variant="light">
                  <Icon className="text-default-500" icon="solar:paperclip-linear" width={20} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-1">
                <div className="flex flex-col">
                  <Button
                    className="justify-start"
                    variant="light"
                    startContent={
                      <Icon icon="solar:gallery-linear" width={20} />
                    }
                    onClick={() => imageInputRef.current?.click()}
                  >
                    发送图片
                  </Button>
                  <Button
                    className="justify-start"
                    variant="light"
                    startContent={
                      <Icon icon="solar:document-linear" width={20} />
                    }
                    onClick={() => fileInputRef.current?.click()}
                  >
                    发送文件
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          }
          value={prompt}
          onValueChange={handleInputChange}
        />
      </form>

      {/* 图片预览Modal */}
      <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="lg">
        <ModalContent>
          <ModalHeader>发送图片</ModalHeader>
          <ModalBody>
            {previewImage && (
              <Image
                alt="Preview"
                src={previewImage.url}
                className="w-full h-auto max-h-[400px] object-contain"
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onImageModalClose}>
              取消
            </Button>
            <Button color="primary" onPress={handleSendImage}>
              发送
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}