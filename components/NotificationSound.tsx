import React, { useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Bell } from 'lucide-react';

interface NotificationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  playSound?: boolean;
  soundType?: 'success' | 'notification' | 'alert';
}

const NotificationSound: React.FC<NotificationProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  playSound = true,
  soundType = 'notification',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && playSound) {
      playNotificationSound(soundType);
    }
  }, [isOpen, playSound, soundType]);

  const playNotificationSound = (sound: string) => {
    // 创建音频上下文
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 根据类型设置不同的声音
    if (sound === 'success') {
      // 成功：两个上升音调
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (sound === 'alert') {
      // 警告：两个快速哔声
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      // 第二个哔声
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(800, audioContext.currentTime);
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.1);
      }, 150);
    } else {
      // 通知：单一柔和音调
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    }
  };

  if (!isOpen) return null;

  const iconMap = {
    success: <CheckCircle className="text-green-600" size={24} />,
    error: <XCircle className="text-red-600" size={24} />,
    warning: <AlertCircle className="text-amber-600" size={24} />,
    info: <Bell className="text-blue-600" size={24} />,
  };

  const bgMap = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border-2 ${bgMap[type]} animate-scale-in`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {iconMap[type]}
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSound;
