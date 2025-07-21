import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createIntersectionObserver, lazyLoadImage } from '@utils/performance';

// 懒加载图片组件
export const LazyImage = React.memo(({ 
  src, 
  alt = '', 
  className = '', 
  style = {},
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YWFhYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmVlMmUyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2Q5NzM3MyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==',
  onLoad,
  onError,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef(null);
  const observerRef = useRef(null);

  // 加载图片
  const loadImage = useCallback(async () => {
    if (!src) return;

    setIsLoading(true);
    setHasError(false);

    try {
      const loadedSrc = await lazyLoadImage(src, fallback);
      setImageSrc(loadedSrc);
      onLoad?.(loadedSrc);
    } catch (error) {
      console.error('Image load error:', error);
      setImageSrc(fallback);
      setHasError(true);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [src, fallback, onLoad, onError]);

  // 设置Intersection Observer
  useEffect(() => {
    if (!imageRef.current) return;

    observerRef.current = createIntersectionObserver((target) => {
      loadImage();
      observerRef.current?.unobserve(target);
    }, { threshold: 0.1 });

    observerRef.current.observe(imageRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadImage]);

  // 清理
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <img
      ref={imageRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}
      style={style}
      {...props}
    />
  );
});

// 响应式图片组件
export const ResponsiveImage = React.memo(({ 
  srcSet, 
  sizes, 
  src, 
  alt = '', 
  className = '', 
  style = {},
  onLoad,
  onError,
  ...props 
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  // 根据屏幕尺寸选择合适的图片
  const selectBestImage = useCallback(() => {
    if (!srcSet) return src;

    const mediaQueries = [
      { width: 1920, src: srcSet.large || srcSet.medium || src },
      { width: 1024, src: srcSet.medium || srcSet.small || src },
      { width: 768, src: srcSet.small || src },
      { width: 0, src: src }
    ];

    const screenWidth = window.innerWidth;
    const bestMatch = mediaQueries.find(mq => screenWidth >= mq.width);
    
    return bestMatch?.src || src;
  }, [srcSet, src]);

  // 加载最佳图片
  useEffect(() => {
    const bestSrc = selectBestImage();
    if (bestSrc !== currentSrc) {
      setIsLoading(true);
      setCurrentSrc(bestSrc);
    }
  }, [selectBestImage, currentSrc]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.(currentSrc);
  }, [currentSrc, onLoad]);

  const handleError = useCallback((error) => {
    setIsLoading(false);
    onError?.(error);
  }, [onError]);

  return (
    <img
      src={currentSrc}
      srcSet={srcSet ? Object.entries(srcSet).map(([size, url]) => `${url} ${size}w`).join(', ') : undefined}
      sizes={sizes}
      alt={alt}
      className={`${className} ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
});

// 图片画廊组件
export const ImageGallery = React.memo(({ 
  images = [], 
  className = '', 
  style = {},
  itemClassName = '',
  onImageClick,
  showThumbnails = true,
  thumbnailSize = 80,
  ...props 
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleImageClick = useCallback((index) => {
    setSelectedIndex(index);
    onImageClick?.(images[index], index);
  }, [images, onImageClick]);

  const handlePrevious = useCallback(() => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowLeft') {
      handlePrevious();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    } else if (event.key === 'Escape') {
      setIsFullscreen(false);
    }
  }, [handlePrevious, handleNext]);

  useEffect(() => {
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, handleKeyDown]);

  if (images.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`} style={style}>
        <p className="text-gray-500">暂无图片</p>
      </div>
    );
  }

  return (
    <div className={`image-gallery ${className}`} style={style} {...props}>
      {/* 主图片 */}
      <div className="relative">
        <LazyImage
          src={images[selectedIndex]?.src}
          alt={images[selectedIndex]?.alt || ''}
          className={`w-full h-64 object-cover rounded-lg ${itemClassName}`}
          onClick={() => setIsFullscreen(true)}
        />
        
        {/* 导航按钮 */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            >
              →
            </button>
          </>
        )}
        
        {/* 图片计数器 */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* 缩略图 */}
      {showThumbnails && images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {images.map((image, index) => (
            <LazyImage
              key={index}
              src={image.src}
              alt={image.alt || ''}
              className={`w-20 h-20 object-cover rounded cursor-pointer transition-opacity ${
                index === selectedIndex ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-60 hover:opacity-80'
              }`}
              onClick={() => handleImageClick(index)}
            />
          ))}
        </div>
      )}

      {/* 全屏模式 */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full">
            <LazyImage
              src={images[selectedIndex]?.src}
              alt={images[selectedIndex]?.alt || ''}
              className="max-w-full max-h-full object-contain"
            />
            
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            >
              ✕
            </button>
            
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-full hover:bg-opacity-75 transition-opacity"
                >
                  ←
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-full hover:bg-opacity-75 transition-opacity"
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// 图片预加载Hook
export const useImagePreload = (imageUrls = []) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [failedImages, setFailedImages] = useState(new Set());

  const preloadImage = useCallback(async (url) => {
    if (loadedImages.has(url) || loadingImages.has(url)) return;

    setLoadingImages(prev => new Set(prev).add(url));

    try {
      await lazyLoadImage(url);
      setLoadedImages(prev => new Set(prev).add(url));
    } catch (error) {
      setFailedImages(prev => new Set(prev).add(url));
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  }, [loadedImages, loadingImages]);

  const preloadAll = useCallback(async () => {
    const promises = imageUrls.map(url => preloadImage(url));
    await Promise.allSettled(promises);
  }, [imageUrls, preloadImage]);

  const isLoaded = useCallback((url) => {
    return loadedImages.has(url);
  }, [loadedImages]);

  const isLoading = useCallback((url) => {
    return loadingImages.has(url);
  }, [loadingImages]);

  const hasFailed = useCallback((url) => {
    return failedImages.has(url);
  }, [failedImages]);

  return {
    loadedImages: Array.from(loadedImages),
    loadingImages: Array.from(loadingImages),
    failedImages: Array.from(failedImages),
    preloadImage,
    preloadAll,
    isLoaded,
    isLoading,
    hasFailed
  };
};