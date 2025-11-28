import React, { useState, useRef } from 'react';
import { X, Camera, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import uploadService from '../services/uploadService';
import AvatarCropper from './AvatarCropper';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploading(true);
      setShowCropper(false);
      setSelectedImage(null);
      
      console.log('[ProfileModal] 开始上传裁剪后的头像，大小:', croppedBlob.size, 'bytes');
      
      // 创建文件对象
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      console.log('[ProfileModal] 创建文件对象:', file.name, file.type);
      
      // 上传到MinIO
      const uploaded = await uploadService.uploadImage(file);
      console.log('[ProfileModal] 上传响应:', uploaded);
      
      const imageUrl = uploaded.resolvedUrl || uploadService.getPublicUrl(uploaded.object_name);
      console.log('[ProfileModal] 解析后的图片URL:', imageUrl);
      
      if (imageUrl) {
        // 设置预览（这只是本地显示，还未保存到数据库）
        setAvatarPreview(imageUrl);
        console.log('[ProfileModal] 设置头像预览，URL:', imageUrl);
        console.log('[ProfileModal] 头像已上传到MinIO，等待用户点击"保存"按钮更新到数据库');
      } else {
        console.error('[ProfileModal] 图片URL为空');
        alert('头像上传失败：无法获取图片URL');
      }
      
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[ProfileModal] 头像上传失败:', error);
      alert('头像上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const updates: any = {
        full_name: formData.full_name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      };
      
      // 如果有新的头像预览，保存到数据库
      if (avatarPreview) {
        updates.avatar_url = avatarPreview;
        console.log('[ProfileModal] 包含avatar_url到更新请求:', avatarPreview);
      }
      
      await updateProfile(updates);
      console.log('[ProfileModal] 个人信息更新成功');
      onClose();
    } catch (error: any) {
      console.error('[ProfileModal] 更新失败:', error);
      alert(error?.response?.data?.detail || '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-slate-900">个人信息</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <img
                  src={avatarPreview || user.avatar_url || user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all group-hover:scale-110 disabled:opacity-50"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">点击相机图标上传头像</p>
              {uploading && <p className="mt-1 text-sm text-indigo-600">上传中...</p>}
            </div>

            {/* Username (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <User size={16} className="inline mr-2" />
                用户名
              </label>
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-400">用户名不可修改</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                姓名
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="输入您的姓名"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Mail size={16} className="inline mr-2" />
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Phone size={16} className="inline mr-2" />
                手机号
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="输入手机号"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && selectedImage && (
        <AvatarCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setSelectedImage(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        />
      )}
    </>
  );
};

export default ProfileModal;
