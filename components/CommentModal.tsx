import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  userAvatar?: string;
  username?: string;
  placeholder?: string;
  title?: string;
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userAvatar,
  username,
  placeholder = '写下你的想法...',
  title = '发表评论'
}) => {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    try {
      setSubmitting(true);
      await onSubmit(content.trim());
      setContent('');
      onClose();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex gap-3 mb-4">
            <img
              src={userAvatar || `https://ui-avatars.com/api/?name=${username || 'User'}&background=random`}
              alt="Avatar"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 mb-2">{username || 'User'}</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                rows={6}
                autoFocus
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-all"
            >
              {t('article.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <Send size={16} />
              {submitting ? t('article.posting') : t('article.post')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
