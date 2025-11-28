import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  image,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 图片位置和缩放
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [imageDragStart, setImageDragStart] = useState({ x: 0, y: 0 });
  
  // 裁剪框状态
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, width: 300, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      // 初始化裁剪框大小 - 强制正方形，默认较大以显示更多内容
      const size = Math.min(500, 600 * 0.8);
      setCropBox({
        x: (600 - size) / 2,
        y: (600 - size) / 2,
        width: size,
        height: size // 强制1:1正方形
      });
    };
  }, [image, aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    if (type === 'move') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (type === 'image') {
      setIsDraggingImage(true);
      setImageDragStart({ x: e.clientX, y: e.clientY });
    } else {
      setIsResizing(type);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing && !isDraggingImage) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (isDraggingImage) {
      const imageDx = e.clientX - imageDragStart.x;
      const imageDy = e.clientY - imageDragStart.y;
      setImageDragStart({ x: e.clientX, y: e.clientY });
      setImagePosition(prev => ({
        x: prev.x + imageDx,
        y: prev.y + imageDy
      }));
      return;
    }

    setDragStart({ x: e.clientX, y: e.clientY });

    if (isDragging) {
      setCropBox(prev => ({
        ...prev,
        x: Math.max(0, Math.min(600 - prev.width, prev.x + dx)),
        y: Math.max(0, Math.min(600 - prev.height, prev.y + dy))
      }));
    } else if (isResizing) {
      setCropBox(prev => {
        let newBox = { ...prev };
        
        // 强制1:1正方形裁剪
        if (isResizing.includes('e')) {
          const newWidth = Math.max(50, Math.min(600 - prev.x, prev.width + dx));
          newBox.width = newWidth;
          newBox.height = newWidth; // 1:1
        }
        if (isResizing.includes('w')) {
          const newWidth = Math.max(50, prev.width - dx);
          const widthDiff = prev.width - newWidth;
          newBox.x = Math.max(0, prev.x + widthDiff);
          newBox.width = newWidth;
          newBox.height = newWidth; // 1:1
        }
        if (isResizing.includes('s')) {
          const newHeight = Math.max(50, Math.min(600 - prev.y, prev.height + dy));
          newBox.height = newHeight;
          newBox.width = newHeight; // 1:1
        }
        if (isResizing.includes('n')) {
          const newHeight = Math.max(50, prev.height - dy);
          const heightDiff = prev.height - newHeight;
          newBox.y = Math.max(0, prev.y + heightDiff);
          newBox.height = newHeight;
          newBox.width = newHeight; // 1:1
        }
        
        // 确保不超出边界
        if (newBox.x + newBox.width > 600) {
          newBox.width = 600 - newBox.x;
          newBox.height = newBox.width;
        }
        if (newBox.y + newBox.height > 600) {
          newBox.height = 600 - newBox.y;
          newBox.width = newBox.height;
        }
        
        return newBox;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
    setIsDraggingImage(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const getCroppedImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // 固定输出尺寸：400x400
        const OUTPUT_SIZE = 400;
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;

        // 容器大小
        const containerSize = 600;
        
        // 计算图片在容器中的实际显示尺寸（保持宽高比）
        const imgAspect = img.width / img.height;
        let displayWidth, displayHeight;
        
        if (imgAspect > 1) {
          // 图片更宽，以宽度为准
          displayWidth = containerSize;
          displayHeight = containerSize / imgAspect;
        } else {
          // 图片更高，以高度为准
          displayHeight = containerSize;
          displayWidth = containerSize * imgAspect;
        }
        
        // 应用缩放
        displayWidth *= imageScale;
        displayHeight *= imageScale;
        
        // 计算图片居中后的起始位置（object-contain 居中效果）
        const imageStartX = (containerSize - displayWidth) / 2;
        const imageStartY = (containerSize - displayHeight) / 2;
        
        // 计算缩放比例（原图尺寸 / 显示尺寸）
        const scaleX = img.width / displayWidth;
        const scaleY = img.height / displayHeight;
        
        // 计算裁剪框相对于图片的位置（考虑图片位置偏移 + 居中偏移）
        const cropX = (cropBox.x - imagePosition.x - imageStartX) * scaleX;
        const cropY = (cropBox.y - imagePosition.y - imageStartY) * scaleY;
        const cropWidth = cropBox.width * scaleX;
        const cropHeight = cropBox.height * scaleY;

        // 绘制并缩放到固定尺寸
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          OUTPUT_SIZE,
          OUTPUT_SIZE
        );

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.95);
      };
    });
  };

  const handleCropComplete = async () => {
    try {
      const croppedImage = await getCroppedImage();
      onCropComplete(croppedImage);
    } catch (e) {
      console.error('Failed to crop image:', e);
    }
  };

  const ResizeHandle = ({ position }: { position: string }) => {
    const getPositionClass = () => {
      const base = 'absolute w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-';
      switch (position) {
        case 'nw': return base + 'nw-resize -top-1.5 -left-1.5';
        case 'ne': return base + 'ne-resize -top-1.5 -right-1.5';
        case 'sw': return base + 'sw-resize -bottom-1.5 -left-1.5';
        case 'se': return base + 'se-resize -bottom-1.5 -right-1.5';
        case 'n': return base + 'n-resize -top-1.5 left-1/2 -translate-x-1/2';
        case 's': return base + 's-resize -bottom-1.5 left-1/2 -translate-x-1/2';
        case 'w': return base + 'w-resize top-1/2 -translate-y-1/2 -left-1.5';
        case 'e': return base + 'e-resize top-1/2 -translate-y-1/2 -right-1.5';
        default: return base + 'move';
      }
    };

    return (
      <div
        className={getPositionClass()}
        onMouseDown={(e) => handleMouseDown(e, position)}
      />
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-[100] flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-4 bg-black/50 border-b border-white/10">
        <div>
          <h3 className="text-white text-lg font-semibold">裁剪图片</h3>
          <p className="text-slate-400 text-sm mt-1">滚轮缩放 | 拖动图片调整位置 | 拖动边框调整裁剪区域</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <X size={18} />
            取消
          </button>
          <button
            onClick={handleCropComplete}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Check size={18} />
            确认
          </button>
        </div>
      </div>

      {/* 主体区域 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div 
          ref={containerRef}
          className="relative overflow-hidden"
          style={{ width: 600, height: 600 }}
        >
          {/* 图片 - 可拖动 */}
          <div
            className="absolute inset-0 cursor-move"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
                handleMouseDown(e, 'image');
              }
            }}
            style={{
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`
            }}
          >
            <img
              ref={imageRef}
              src={image}
              alt="Crop"
              className="w-full h-full object-contain pointer-events-none select-none"
              style={{
                transform: `scale(${imageScale})`,
                transformOrigin: 'center'
              }}
              draggable={false}
            />
          </div>

          {/* 遮罩层 */}
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />

          {/* 裁剪框 */}
          <div
            className="absolute border-2 border-indigo-500 cursor-move shadow-lg"
            style={{
              left: cropBox.x,
              top: cropBox.y,
              width: cropBox.width,
              height: cropBox.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
            }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
          >
            {/* 网格线 */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/30" />
              ))}
            </div>

            {/* 拖动句柄 */}
            <ResizeHandle position="nw" />
            <ResizeHandle position="ne" />
            <ResizeHandle position="sw" />
            <ResizeHandle position="se" />
            <ResizeHandle position="n" />
            <ResizeHandle position="s" />
            <ResizeHandle position="w" />
            <ResizeHandle position="e" />
          </div>
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="p-4 bg-black/50 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="text-white text-sm">
              缩放: {imageScale.toFixed(1)}x (滚轮缩放)
            </div>
            <button
              onClick={() => {
                setImagePosition({ x: 0, y: 0 });
                setImageScale(1);
              }}
              className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
            >
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
