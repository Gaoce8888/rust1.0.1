import React, { useRef, useState } from 'react';
import { Button, Tooltip, Progress, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

/**
 * FileUploadButton - 文件上传按钮组件
 * @param {Object} props
 * @param {Function} props.onFileSelect - 文件选择回调
 * @param {Array<string>} props.acceptedTypes - 接受的文件类型
 * @param {number} props.maxSize - 最大文件大小（MB）
 * @param {boolean} props.multiple - 是否支持多选
 * @param {boolean} props.isDisabled - 是否禁用
 */
const FileUploadButton = ({
  onFileSelect,
  acceptedTypes = ['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  maxSize = 10, // MB
  multiple = false,
  isDisabled = false,
  variant = 'flat',
  size = 'sm'
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return 'ph:image';
    if (fileType === 'application/pdf') return 'ph:file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'ph:file-doc';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'ph:file-xls';
    if (fileType.includes('text')) return 'ph:file-text';
    if (fileType.includes('video')) return 'ph:video';
    if (fileType.includes('audio')) return 'ph:speaker-high';
    return 'ph:file';
  };

  const validateFile = (file) => {
    // 检查文件大小
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `文件大小超过限制（最大 ${maxSize}MB）`
      };
    }

    // 检查文件类型
    const isAcceptedType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type || file.name.endsWith(type);
    });

    if (!isAcceptedType) {
      return {
        valid: false,
        error: '不支持的文件类型'
      };
    }

    return { valid: true };
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const validFiles = [];
    const errors = [];

    // 验证所有文件
    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push({ file: file.name, error: validation.error });
      }
    });

    if (errors.length > 0) {
      // 这里可以显示错误提示
      console.error('文件验证错误:', errors);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setUploading(true);
      
      // 模拟上传进度
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploadProgress(0);
          
          // 调用回调函数
          onFileSelect?.(validFiles);
          
          // 清空选择
          setTimeout(() => {
            setSelectedFiles([]);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }, 1000);
        }
      }, 200);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isDisabled || uploading}
      />
      
      <Tooltip content="上传文件" placement="top">
        <Button
          isIconOnly={!uploading}
          variant={variant}
          size={size}
          onClick={handleButtonClick}
          isDisabled={isDisabled || uploading}
          className={clsx(
            uploading && "min-w-[120px]"
          )}
        >
          {uploading ? (
            <div className="flex items-center gap-2">
              <Icon icon="ph:upload" className="w-4 h-4 animate-pulse" />
              <span className="text-xs">上传中 {uploadProgress}%</span>
            </div>
          ) : (
            <Icon icon="ph:paperclip" className="w-5 h-5" />
          )}
        </Button>
      </Tooltip>
      
      {uploading && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-50">
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon 
                      icon={getFileIcon(file.type)} 
                      className="w-4 h-4 flex-shrink-0 text-primary" 
                    />
                    <span className="text-xs truncate">{file.name}</span>
                  </div>
                  <Chip size="sm" variant="flat">
                    {formatFileSize(file.size)}
                  </Chip>
                </div>
                <Progress 
                  value={uploadProgress} 
                  size="sm"
                  color="primary"
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default FileUploadButton;