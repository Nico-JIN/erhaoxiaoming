import React, { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface AvatarCropperProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

const AvatarCropper: React.FC<AvatarCropperProps> = ({
  image,
  onCropComplete,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerSize = 600;
  const cropRadius = 200;

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => {
      setImgElement(img);
      // 计算初始缩放，确保图片能覆盖裁剪框
      const imgAspect = img.width / img.height;
      const minScale = Math.max(
        (cropRadius * 2) / Math.min(img.width, containerSize),
        (cropRadius * 2) / Math.min(img.height, containerSize)
      );
      setImageScale(Math.max(1, minScale * 1.2));
    };
  }, [image]);

  // 绘制canvas
  useEffect(() => {
    if (!canvasRef.current || !imgElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空canvas
    ctx.clearRect(0, 0, containerSize, containerSize);

    // 计算图片显示尺寸（保持宽高比）
    const imgAspect = imgElement.width / imgElement.height;
    let displayWidth, displayHeight;
    
    if (imgAspect > 1) {
      displayWidth = containerSize;
      displayHeight = containerSize / imgAspect;
    } else {
      displayHeight = containerSize;
      displayWidth = containerSize * imgAspect;
    }

    // 应用缩放
    displayWidth *= imageScale;
    displayHeight *= imageScale;

    // 计算图片居中位置
    const imgX = (containerSize - displayWidth) / 2 + imagePosition.x;
    const imgY = (containerSize - displayHeight) / 2 + imagePosition.y;

    // 绘制图片
    ctx.drawImage(imgElement, imgX, imgY, displayWidth, displayHeight);

    // 绘制遮罩层（整个canvas变暗）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, containerSize, containerSize);

    // 清除圆形区域的遮罩（框内亮）
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(containerSize / 2, containerSize / 2, cropRadius, 0, Math.PI * 2);
    ctx.fill();

    // 恢复正常渲染模式
    ctx.globalCompositeOperation = 'source-over';

    // 重新绘制圆形区域内的图片（框内清晰明亮）
    ctx.save();
    ctx.beginPath();
    ctx.arc(containerSize / 2, containerSize / 2, cropRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgElement, imgX, imgY, displayWidth, displayHeight);
    ctx.restore();

    // 绘制圆形边框
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(containerSize / 2, containerSize / 2, cropRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制十字线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(containerSize / 2, containerSize / 2 - cropRadius);
    ctx.lineTo(containerSize / 2, containerSize / 2 + cropRadius);
    ctx.moveTo(containerSize / 2 - cropRadius, containerSize / 2);
    ctx.lineTo(containerSize / 2 + cropRadius, containerSize / 2);
    ctx.stroke();
  }, [imgElement, imageScale, imagePosition]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });
    setImagePosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const getCroppedImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!imgElement) {
        reject(new Error('Image not loaded'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const OUTPUT_SIZE = 400;
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      // 计算图片显示尺寸
      const imgAspect = imgElement.width / imgElement.height;
      let displayWidth, displayHeight;
      
      if (imgAspect > 1) {
        displayWidth = containerSize;
        displayHeight = containerSize / imgAspect;
      } else {
        displayHeight = containerSize;
        displayWidth = containerSize * imgAspect;
      }

      displayWidth *= imageScale;
      displayHeight *= imageScale;

      // 计算图片居中位置
      const imgX = (containerSize - displayWidth) / 2 + imagePosition.x;
      const imgY = (containerSize - displayHeight) / 2 + imagePosition.y;

      // 计算裁剪区域在图片中的位置
      const cropLeft = containerSize / 2 - cropRadius;
      const cropTop = containerSize / 2 - cropRadius;
      const cropSize = cropRadius * 2;

      // 计算裁剪区域相对于图片的位置
      const srcX = (cropLeft - imgX) / displayWidth * imgElement.width;
      const srcY = (cropTop - imgY) / displayHeight * imgElement.height;
      const srcSize = (cropSize / displayWidth) * imgElement.width;

      // 创建圆形裁剪路径
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // 绘制裁剪后的图片
      ctx.drawImage(
        imgElement,
        srcX,
        srcY,
        srcSize,
        srcSize,
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

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-4 bg-black/50 border-b border-white/10">
        <div>
          <h3 className="text-white text-lg font-semibold">裁剪头像</h3>
          <p className="text-slate-400 text-sm mt-1">滚轮缩放 | 拖动图片调整位置</p>
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
        <canvas
          ref={canvasRef}
          width={containerSize}
          height={containerSize}
          className="cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
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
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
            >
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropper;
