import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createIntersectionObserver, lazyLoadImage } from '@utils/performance';

/**
 * 图片懒加载组件
 * 支持渐进式加载、占位符、错误处理等功能
 */
export const LazyImage = React.memo(({
  src,
  alt = '',
  className = '',
  style = {},
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OWE5YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmVlMmUyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2Q5NGE0YSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  onIntersect,
  progressive = true,
  blur = true,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // 加载图片
  const loadImage = useCallback(async () => {
    if (!src || isLoading) return;
    
    setIsLoading(true);
    setIsError(false);
    
    try {
      await lazyLoadImage(src, placeholder);
      setImageSrc(src);
      setIsLoaded(true);
      onLoad?.(src);
    } catch (error) {
      console.error('Failed to load image:', error);
      setImageSrc(fallback);
      setIsError(true);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [src, placeholder, fallback, onLoad, onError, isLoading]);

  // 创建Intersection Observer
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            onIntersect?.(entry);
            loadImage();
            // 一旦加载开始，就不再需要观察
            if (observerRef.current) {
              observerRef.current.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current = observer;
    observer.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, onIntersect, loadImage]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 计算样式
  const imageStyle = {
    ...style,
    transition: progressive ? 'filter 0.3s ease-in-out' : 'none',
    filter: progressive && blur && !isLoaded ? 'blur(5px)' : 'none',
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`lazy-image ${className} ${isLoaded ? 'loaded' : ''} ${isError ? 'error' : ''}`}
      style={imageStyle}
      onLoad={() => setIsLoaded(true)}
      onError={() => {
        setIsError(true);
        setImageSrc(fallback);
        onError?.(new Error('Image failed to load'));
      }}
      {...props}
    />
  );
});

LazyImage.displayName = 'LazyImage';

/**
 * 响应式图片组件
 * 支持不同屏幕尺寸的图片源
 */
export const ResponsiveImage = React.memo(({
  srcSet,
  sizes,
  src,
  alt = '',
  className = '',
  style = {},
  placeholder,
  fallback,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);

  // 根据屏幕尺寸选择合适的图片源
  useEffect(() => {
    if (!srcSet) return;

    const updateSrc = () => {
      const width = window.innerWidth;
      const sources = srcSet.split(',').map(s => s.trim());
      
      for (const source of sources) {
        const [url, size] = source.split(' ');
        const sizeNum = parseInt(size);
        
        if (width <= sizeNum) {
          setCurrentSrc(url);
          break;
        }
      }
    };

    updateSrc();
    window.addEventListener('resize', updateSrc);
    
    return () => {
      window.removeEventListener('resize', updateSrc);
    };
  }, [srcSet]);

  return (
    <LazyImage
      src={currentSrc}
      alt={alt}
      className={`responsive-image ${className}`}
      style={style}
      placeholder={placeholder}
      fallback={fallback}
      {...props}
    />
  );
});

ResponsiveImage.displayName = 'ResponsiveImage';

/**
 * 图片画廊组件
 * 支持多图片展示和懒加载
 */
export const ImageGallery = React.memo(({
  images = [],
  className = '',
  style = {},
  itemClassName = '',
  itemStyle = {},
  placeholder,
  fallback,
  columns = 3,
  gap = 8,
  ...props
}) => {
  const galleryStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
    ...style,
  };

  return (
    <div className={`image-gallery ${className}`} style={galleryStyle} {...props}>
      {images.map((image, index) => (
        <div
          key={`${image.src}-${index}`}
          className={`gallery-item ${itemClassName}`}
          style={itemStyle}
        >
          <LazyImage
            src={image.src}
            alt={image.alt || ''}
            placeholder={placeholder}
            fallback={fallback}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

/**
 * 图片预加载Hook
 * 用于预加载关键图片
 */
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
    hasFailed,
  };
};