
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, FileText, Download, List, Heart, MessageCircle, Send, Eye } from 'lucide-react';
import { marked } from 'marked';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import resourceService, { Resource } from '../services/resourceService';
import interactionsService, { Comment } from '../services/interactionsService';
import CommentModal from '../components/CommentModal';
import ChatModal from '../components/ChatModal';

// 格式化数字显示（超过1000显示K，超过1000000显示M）
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

const getFilename = (url?: string | null): string => {
  if (!url) return 'Package.zip';
  try {
    // Handle full URLs
    const path = url.split('?')[0]; // Remove query params
    const filename = path.split('/').pop();
    return decodeURIComponent(filename || 'Package.zip');
  } catch (e) {
    return 'Package.zip';
  }
};

const ArticleView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { user, refreshUser, applyUserPatch } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTOC, setShowTOC] = useState(true);
  const [activeHeading, setActiveHeading] = useState<string>('');

  // 点赞和评论状态
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);

  // Config marked renderer and add IDs to headings
  const htmlContent = useMemo(() => {
    if (!resource?.content && !resource?.description) return '';
    const rawHtml = marked.parse(resource.content || resource.description);
    if (typeof rawHtml === 'string') {
      const div = document.createElement('div');
      div.innerHTML = rawHtml;
      const headings = div.querySelectorAll('h1, h2, h3, h4');
      headings.forEach((heading, index) => {
        heading.id = `heading - ${index} `;
      });
      return div.innerHTML;
    }
    return rawHtml;
  }, [resource?.content, resource?.description]);

  // Extract TOC from HTML content
  const tocItems = useMemo(() => {
    if (!htmlContent) return [];
    const div = document.createElement('div');
    div.innerHTML = htmlContent as string;
    const headings = div.querySelectorAll('h1, h2, h3, h4');
    return Array.from(headings).map((heading, index) => ({
      id: `heading - ${index} `,
      text: heading.textContent || '',
      level: parseInt(heading.tagName.substring(1))
    }));
  }, [htmlContent]);
  // Track if we've already incremented views for this article in this session
  const viewCountedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isCleanedUp = false;

    const loadResource = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        // Check if we've already counted this view
        const shouldIncrement = !viewCountedRef.current.has(id);

        const data = await resourceService.getResource(id, shouldIncrement);

        // Only update state and mark as counted if not cleaned up
        if (!isCleanedUp) {
          if (shouldIncrement) {
            viewCountedRef.current.add(id);
          }

          setResource(data);
          setIsUnlocked(data.is_free || data.points_required === 0 || data.is_purchased_by_user === true);

          setLikeCount(data.like_count || 0);
          setIsLiked(data.is_liked_by_user || false);

          const commentsData = await interactionsService.getComments(id);
          setComments(commentsData);
        }

      } catch (err) {
        if (!isCleanedUp) {
          console.error('Failed to load resource', err);
          setError('Article not found or unavailable.');
        }
      } finally {
        if (!isCleanedUp) {
          setLoading(false);
        }
      }
    };

    loadResource();

    // Cleanup function to handle StrictMode double-invocation
    return () => {
      isCleanedUp = true;
    };
  }, [id]);

  // Monitor scroll to highlight active heading
  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
      let current = '';

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 150) {
          current = heading.id;
        }
      });

      setActiveHeading(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [htmlContent]);

  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUnlock = async () => {
    if (!resource) return;
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }
    try {
      const { balance } = await resourceService.downloadResource(resource.id);
      // Don't open download_url directly, just unlock the content
      if (typeof balance === 'number') {
        applyUserPatch({ points: balance });
      } else {
        await refreshUser();
      }
      setIsUnlocked(true);
      setShowPaymentModal(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Unable to unlock resource.';
      alert(detail);
    }
  };

  const handleDownload = async (attachmentId?: number) => {
    if (!resource) return;
    try {
      console.log('📥 Starting download...', { attachmentId, resourceId: resource.id });

      // Construct the API endpoint
      const apiEndpoint = attachmentId
        ? `/api/resources/attachments/${attachmentId}/download`
        : `/api/resources/${resource.id}/download`;

      console.log('🔗 API Endpoint:', apiEndpoint);

      // Get the filename
      const filename = attachmentId
        ? (resource.attachments?.find(a => a.id === attachmentId)?.file_name || 'download')
        : getFilename(resource.file_url);

      console.log('📄 Filename:', filename);

      // Get token for authorization
      const token = localStorage.getItem('access_token');
      const baseURL = api.defaults.baseURL || '';
      const fullUrl = `${baseURL}${apiEndpoint}`;

      console.log('🌐 Full URL:', fullUrl);
      console.log('🔑 Has token:', !!token);

      // Use fetch instead of axios for better blob handling
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('open-auth-modal'));
          return;
        } else if (response.status === 402) {
          setShowPaymentModal(true);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      console.log('📦 Content-Type:', contentType);

      // Check if it's a JSON response (external URL case)
      if (contentType.includes('application/json')) {
        console.log('🔄 Handling as JSON (external URL)');
        const data = await response.json();
        console.log('📄 JSON data:', data);
        if (data.download_url) {
          // External URL - redirect download
          const link = document.createElement('a');
          link.href = data.download_url;
          link.download = filename;
          document.body.appendChild(link);
          console.log('🔗 Clicking external link:', data.download_url);
          link.click();
          document.body.removeChild(link);
          console.log('✅ External link download triggered');
        }
      } else {
        console.log('📦 Handling as binary response');
        // Binary response - create download from blob
        const blob = await response.blob();
        console.log('📦 Blob created:', { size: blob.size, type: blob.type });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        console.log('🖱️ Clicking download link');
        link.click();
        console.log('✅ Download link clicked');
        document.body.removeChild(link);

        // Clean up
        setTimeout(() => {
          console.log('🧹 Cleaning up blob URL');
          window.URL.revokeObjectURL(url);
        }, 100);
      }

      // Update local count
      setResource(prev => prev ? { ...prev, downloads: (prev.downloads || 0) + 1 } : null);
      console.log('✅ Download completed successfully');
    } catch (error: any) {
      console.error('❌ Download failed:', error);

      // Handle authentication/payment errors
      if (error?.response?.status === 401) {
        window.dispatchEvent(new CustomEvent('open-auth-modal'));
      } else if (error?.response?.status === 402) {
        setShowPaymentModal(true);
      } else if (resource.points_required > 0 && !user) {
        alert(t('auth.loginRequired'));
      } else if (resource.points_required > 0 && user && user.points < resource.points_required) {
        setShowPaymentModal(true);
      } else {
        alert('下载失败，请重试');
      }
    }
  };

  // 点赞处理
  const handleLike = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }
    if (!resource) return;

    try {
      if (isLiked) {
        await interactionsService.unlikeResource(resource.id);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await interactionsService.likeResource(resource.id);
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // 评论处理
  const handleSubmitComment = async (content: string) => {
    if (!resource) return;

    try {
      const newComment = await interactionsService.createComment(resource.id, content);
      setComments(prev => [newComment, ...prev]);
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert(t('article.commentFailed'));
      throw error;
    }
  };

  // 回复评论
  const handleSubmitReply = async (content: string) => {
    if (!resource || !replyToComment) return;

    try {
      await interactionsService.createComment(resource.id, content, replyToComment.id);
      // 重新加载评论
      const updatedComments = await interactionsService.getComments(resource.id);
      setComments(updatedComments);
    } catch (error) {
      console.error('Failed to post reply:', error);
      alert(t('article.replyFailed'));
      throw error;
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      await interactionsService.deleteComment(commentId);
      const updatedComments = await interactionsService.getComments(resource!.id);
      setComments(updatedComments);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('删除失败，请重试');
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">Loading article…</div>;
  }

  if (error || !resource) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">{error || 'Article not found.'}</div>;
  }

  const isPaid = !resource.is_free && resource.points_required > 0;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-12 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex gap-2 mb-6">
            {resource.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium uppercase tracking-wide">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
            {resource.title}
          </h1>

          {/* 元数据区域：发布时间和阅读量 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">
                {new Date(resource.published_at || resource.created_at).toLocaleDateString(language === 'zh' ? 'zh-CN' : undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="w-1 h-1 rounded-full bg-slate-300"></div>

            <div className="flex items-center gap-2 text-slate-500">
              <Eye size={16} className="text-indigo-500" />
              <span className="text-sm font-semibold text-slate-700">{formatCount(resource.views || 0)}</span>
              <span className="text-sm font-medium text-slate-500">阅读</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
            <div className="flex items-center gap-3">
              <img
                src={resource.author_avatar || `https://ui-avatars.com/api/?name=${resource.author_username || 'Admin'}&background=random`}
                alt="Author"
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div>
                <p className="font-medium text-slate-900">{resource.author_username || 'Lemind Team'}</p>
                {(!user || user.id !== resource.author_id) && (
                  <button
                    onClick={() => {
                      if (!user) {
                        window.dispatchEvent(new CustomEvent('open-auth-modal'));
                        return;
                      }
                      setShowChatModal(true);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 mt-1"
                  >
                    <MessageCircle size={14} />
                    私聊
                  </button>
                )}
              </div>
            </div>
            {isPaid && (
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold text-indigo-600">{resource.points_required}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Points</span>
              </div>
            )}
          </div>
        </div>

        {/* Cover Image */}
        <div className="rounded-3xl overflow-hidden mb-16">
          <img
            src={resource.thumbnail_url || `https://picsum.photos/seed/${resource.id}/800/400`}
            alt="Cover"
            className="w-full h-auto object-cover"
          />
        </div>

        {/* TOC Sidebar - 左侧固定 */}
        {tocItems.length > 0 && (
          <div className="hidden xl:block fixed left-8 top-32 w-72 z-20 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                    <List size={16} className="text-white" />
                  </div>
                  目录导航
                </h3>
                <button
                  onClick={() => setShowTOC(!showTOC)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                >
                  {showTOC ? '收起' : '展开'}
                </button>
              </div>
              {showTOC && (
                <div className="relative">
                  {/* 藤蔓主干 */}
                  <div className="absolute left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 via-violet-500 to-purple-400 rounded-full shadow-sm"></div>
                  <div className="absolute left-[5px] top-0 w-3 h-3 rounded-full bg-purple-600 shadow-md"></div>
                  <div className="absolute left-[5px] bottom-0 w-3 h-3 rounded-full bg-purple-600 shadow-md"></div>

                  {/* 藤蔓叶子装饰 */}
                  <div className="absolute left-[-2px] top-[20%] w-4 h-5 rounded-full bg-purple-300 opacity-70 shadow-sm" style={{ transform: 'rotate(-45deg)' }}></div>
                  <div className="absolute left-[-2px] top-[40%] w-3 h-4 rounded-full bg-violet-300 opacity-70 shadow-sm" style={{ transform: 'rotate(30deg)' }}></div>
                  <div className="absolute left-[-2px] top-[60%] w-4 h-5 rounded-full bg-purple-300 opacity-70 shadow-sm" style={{ transform: 'rotate(-60deg)' }}></div>
                  <div className="absolute left-[-2px] top-[80%] w-3 h-4 rounded-full bg-violet-300 opacity-70 shadow-sm" style={{ transform: 'rotate(20deg)' }}></div>

                  <ul className="pl-6 space-y-1">
                    {tocItems.map((item, index) => (
                      <li
                        key={item.id}
                        className="group cursor-pointer transition-all"
                        style={{ paddingLeft: `${(item.level - 1) * 16}px` }}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToHeading(item.id);
                          }}
                          className={`text-sm w-full text-left py-2 px-3 rounded-lg transition-all relative ${activeHeading === item.id
                            ? 'text-slate-900 font-semibold bg-slate-100 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                          <span className={`absolute left-[-20px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full transition-all ${activeHeading === item.id
                            ? 'bg-purple-600 scale-125 shadow-md'
                            : 'bg-purple-400 opacity-0 group-hover:opacity-100'
                            }`}></span>
                          {item.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Wrapper */}
        <div className="relative">
          <div className={`prose prose-lg max-w-none ${!isUnlocked && isPaid ? 'locked-content-blur h-[400px] overflow-hidden' : ''}`}>
            <div dangerouslySetInnerHTML={{ __html: htmlContent as string }} />
          </div>

          {/* Paywall Overlay */}
          {!isUnlocked && isPaid && (
            <div className="absolute inset-0 z-10 flex items-end justify-center pb-20 pointer-events-none">
              <div className="bg-white/90 backdrop-blur-md border border-white/50 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full pointer-events-auto transform hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('article.premiumContent')}</h3>
                <p className="text-slate-600 mb-6">{t('article.unlockMsg')}</p>

                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 mb-6 border border-slate-100">
                  <span className="text-sm font-medium text-slate-600">{t('article.price') || 'Price'}</span>
                  <span className="text-lg font-bold text-indigo-600">{resource.points_required} Pts</span>
                </div>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
                >
                  {t('article.unlockNow')}
                </button>
                <p className="mt-3 text-xs text-slate-400">{t('article.yourBalance')}: {user ? user.points : 0} Pts</p>
              </div>
            </div>
          )}
        </div>



        <div className="max-w-4xl mx-auto">

          {/* 附件区域 - 统一显示在文章底部 */}
          {isUnlocked && ((resource.attachments && resource.attachments.length > 0) || resource.file_url) && (
            <div className="mt-16 border-t-2 border-slate-200 pt-12">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Download size={20} />
                </div>
                {t('article.attachedResources')}
              </h3>
              <div className={`grid grid-cols-1 ${resource.attachments && resource.attachments.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
                {/* Legacy File URL Support */}
                {resource.file_url && (!resource.attachments || resource.attachments.length === 0) && (
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 hover:border-indigo-300 transition-all group shadow-sm hover:shadow-lg">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-3 bg-white text-indigo-600 rounded-lg shadow-md">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-base truncate">{getFilename(resource.file_url)}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <span>{resource.file_size || 'Unknown'}</span>
                          <span>•</span>
                          <span>{formatCount(resource.downloads || 0)} 次下载</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all transform hover:scale-[1.02]"
                    >
                      <Download size={18} />
                      {t('article.download')}
                    </button>
                  </div>
                )}

                {/* New Attachments List */}
                {resource.attachments?.map(att => (
                  <div key={att.id} className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all group shadow-sm hover:shadow-md flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 text-sm truncate" title={att.file_name}>{att.file_name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{att.file_size || 'Unknown'}</span>
                          <span>•</span>
                          <span>{formatCount(att.download_count || 0)} {t('article.downloads') || 'downloads'}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(att.id)}
                      className="shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title={t('article.download')}
                    >
                      <Download size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 点赞和评论区域 */}
          <div className="mt-16 border-t-2 border-slate-200 pt-12">
            {/* 点赞和评论按钮 */}
            <div className="flex items-center gap-4 mb-12">
              <button
                onClick={handleLike}
                className={`flex items-center gap-3 px-6 py-3 rounded-full font-semibold transition-all shadow-md ${isLiked
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-200 hover:shadow-lg'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-pink-500 hover:text-pink-500'
                  }`}
              >
                <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                <span>{isLiked ? t('article.liked') : t('article.like')}</span>
                <span className="font-bold">{formatCount(likeCount)}</span>
              </button>

              <button
                onClick={() => {
                  if (!user) {
                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                    return;
                  }
                  setShowCommentModal(true);
                }}
                className="flex items-center gap-3 px-6 py-3 rounded-full font-semibold transition-all shadow-md bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-500"
              >
                <MessageCircle size={20} />
                <span>{t('article.comment')}</span>
                <span className="font-bold">{formatCount(comments.length)}</span>
              </button>
            </div>

            {/* 评论列表 */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900">{t('article.comments')} ({comments.length})</h3>

              {comments.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
                  <p>还没有评论，来发表第一条吧！</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex gap-4">
                      <img
                        src={comment.avatar_url || `https://ui-avatars.com/api/?name=${comment.username || 'User'}&background=random`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-slate-900">{comment.username || 'Anonymous'}</span>
                            <span className="text-sm text-slate-400 ml-3">
                              {new Date(comment.created_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          {user && user.id === comment.user_id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-sm text-red-500 hover:text-red-700 font-medium"
                            >
                              {t('article.delete')}
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 mb-3 leading-relaxed">{comment.content}</p>

                        <button
                          onClick={() => {
                            if (!user) {
                              window.dispatchEvent(new CustomEvent('open-auth-modal'));
                              return;
                            }
                            setReplyToComment(comment);
                            setShowReplyModal(true);
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          {t('article.reply')}
                        </button>

                        {/* 嵌套回复 */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-100">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-3">
                                <img
                                  src={reply.avatar_url || `https://ui-avatars.com/api/?name=${reply.username || 'User'}&background=random`}
                                  alt="Avatar"
                                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <div>
                                      <span className="font-semibold text-slate-900 text-sm">{reply.username || 'Anonymous'}</span>
                                      <span className="text-xs text-slate-400 ml-2">
                                        {new Date(reply.created_at).toLocaleString('zh-CN')}
                                      </span>
                                    </div>
                                    {user && user.id === reply.user_id && (
                                      <button
                                        onClick={() => handleDeleteComment(reply.id)}
                                        className="text-xs text-red-500 hover:text-red-700"
                                      >
                                        {t('article.delete')}
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-slate-700 text-sm leading-relaxed">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Confirmation Modal */}
          {showPaymentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">{t('article.confirmTitle')}</h3>
                <p className="text-slate-600 mb-6">
                  {t('article.confirmMsg', { price: resource.points_required || 0 })}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    {t('article.cancel')}
                  </button>
                  <button
                    onClick={handleUnlock}
                    className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
                  >
                    {t('article.confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 评论弹窗 */}
          <CommentModal
            isOpen={showCommentModal}
            onClose={() => setShowCommentModal(false)}
            onSubmit={handleSubmitComment}
            userAvatar={user?.avatar_url || user?.avatar}
            username={user?.username}
            title={t('article.postComment')}
            placeholder={t('article.writeComment')}
          />

          {/* 回复弹窗 */}
          <CommentModal
            isOpen={showReplyModal}
            onClose={() => {
              setShowReplyModal(false);
              setReplyToComment(null);
            }}
            onSubmit={handleSubmitReply}
            userAvatar={user?.avatar_url || user?.avatar}
            username={user?.username}
            title={t('article.replyTo', { username: replyToComment?.username || '' })}
            placeholder={t('article.writeReply')}
          />

          {/* 私信弹窗 */}
          <ChatModal
            isOpen={showChatModal}
            onClose={() => setShowChatModal(false)}
            recipientId={resource.author_id}
            recipientName={resource.author_username || 'Author'}
            recipientAvatar={resource.author_avatar}
          />
        </div>
      </div>
    </div>
  );
};

export default ArticleView;
