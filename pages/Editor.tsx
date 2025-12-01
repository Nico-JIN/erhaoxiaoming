import React, { useState, useRef, useEffect } from 'react';
import { Save, Upload, Sparkles, Eye, EyeOff, Bold, Italic, Heading, Quote, Code, List, Link as LinkIcon, Image as ImageIcon, Terminal, X, Wand2, ArrowLeft, Video, FileText } from 'lucide-react';
import { enhanceContent, generateSummary } from '../services/geminiService';
import { marked } from 'marked';

// Configure marked to add no-referrer policy to images (for external hotlink protection bypass)
try {
  const renderer = new marked.Renderer();
  const originalImage = renderer.image;

  renderer.image = function (this: any, token: any) {
    const html = originalImage.call(this, token);
    if (typeof html === 'string') {
      return html.replace('<img', '<img referrerpolicy="no-referrer"');
    }
    return html;
  };

  marked.use({ renderer });
} catch (error) {
  console.warn('Failed to configure marked renderer:', error);
}

import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams } from 'react-router-dom';
import resourceService, { Resource } from '../services/resourceService';
import categoryService, { Category } from '../services/categoryService';
import uploadService from '../services/uploadService';
import ImageCropper from '../components/ImageCropper';

const ToolbarButton: React.FC<{ icon: React.ReactNode, onClick: () => void, label: string }> = ({ icon, onClick, label }) => (
  <button
    onClick={onClick}
    className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors tooltip-trigger relative group"
    aria-label={label}
  >
    {icon}
    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none shadow-md">
      {label}
    </span>
  </button>
);

const Editor: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { resourceId } = useParams<{ resourceId?: string }>();
  const isEditing = !!resourceId;  // If resourceId exists, we're editing
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(`# Welcome to the Editor

Start writing your knowledge here. 

## Features
  - Full Markdown Support
    - AI Enhancement
      - Split Preview
        - ** Image Uploads ** (Try dragging an image here!)

1. Type on the left
2. See result on the right
`);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(true);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceFileName, setResourceFileName] = useState('');
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  // Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [summary, setSummary] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isResourceLoading, setIsResourceLoading] = useState(false);
  const [currentResource, setCurrentResource] = useState<Resource | null>(null);

  // Cropper State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileType, setCropFileType] = useState<string>('image/jpeg');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);


  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Batch upload state
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    id: string;
    filename: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
  }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Debounce hook
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debouncedValue;
  };

  const debouncedContent = useDebounce(content, 300);

  const previewHtml = React.useMemo(() => {
    return marked.parse(debouncedContent);
  }, [debouncedContent]);

  // Scroll Synchronization: Editor -> Preview
  const handleScroll = () => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;

    if (!textarea || !preview) return;

    // Calculate scroll percentage
    const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);

    // Apply to preview
    if (!isNaN(scrollPercentage)) {
      preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
    }
  };

  // Helper to insert markdown at cursor position
  const insertMarkdown = (syntax: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selection = text.substring(start, end);

    let newText = '';
    let newCursorPos = 0;

    switch (syntax) {
      case 'b':
        newText = `${before}** ${selection || 'Bold Text'}** ${after} `;
        newCursorPos = selection ? end + 4 : start + 2 + 9;
        break;
      case 'i':
        newText = `${before}_${selection || 'Italic Text'}_${after} `;
        newCursorPos = selection ? end + 2 : start + 1 + 11;
        break;
      case 'h2':
        newText = `${before} \n## ${selection || 'Heading 2'} \n${after} `;
        newCursorPos = newText.length - after.length - 1;
        break;
      case 'quote':
        newText = `${before} \n > ${selection || 'Blockquote'} \n${after} `;
        newCursorPos = newText.length - after.length - 1;
        break;
      case 'code':
        newText = `${before}
\`\`\`
${selection || 'console.log("Code");'}
\`\`\`
${after}`;
        newCursorPos = newText.length - after.length - 4;
        break;
      case 'inlinecode':
        newText = `${before}\`${selection || 'code'}\`${after}`;
        newCursorPos = selection ? end + 2 : start + 1 + 4 + 1;
        break;
      case 'link':
        const linkText = prompt(t('editor.linkTextPrompt'), selection || 'Link');
        if (linkText === null) return; // Cancelled
        const linkUrl = prompt(t('editor.linkUrlPrompt'), 'https://');
        if (linkUrl === null) return; // Cancelled
        newText = `${before}[${linkText}](${linkUrl})${after}`;
        newCursorPos = start + 1 + linkText.length + 2 + linkUrl.length + 1;
        break;
      case 'list':
        newText = `${before}\n- ${selection || 'List Item'}${after}`;
        newCursorPos = newText.length - after.length;
        break;
      default:
        return;
    }

    setContent(newText);

    // Restore focus and set cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle Image Upload (File Input or Drop)
  const processImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    try {
      const uploaded = await uploadService.uploadImage(file, {
        onProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📸 图片上传进度: ${percentCompleted}%`);
          }
        },
      });
      const imageUrl = uploaded.resolvedUrl || uploadService.getPublicUrl(uploaded.object_name) || '';
      if (!imageUrl) {
        throw new Error('Image URL missing');
      }

      showToast('✅ 图片上传成功!', 'success');

      const markdown = `\n![${file.name}](${imageUrl})\n`;

      const textarea = textareaRef.current;
      if (!textarea) {
        setContent((prev) => prev + markdown);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;

      const newText = text.substring(0, start) + markdown + text.substring(end);
      setContent(newText);

      setTimeout(() => {
        textarea.focus();
        const newPos = start + markdown.length;
        textarea.setSelectionRange(newPos, newPos);
        handleScroll();
      }, 0);
    } catch (error) {
      console.error('Image upload failed', error);
      showToast('❌ 图片上传失败', 'error');
    }
  };

  // Handle Video Upload
  const processVideo = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file.');
      return;
    }

    try {
      const uploaded = await uploadService.uploadVideo(file, {
        onProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`🎥 视频上传进度: ${percentCompleted}%`);
          }
        },
      });
      const videoUrl = uploaded.resolvedUrl || uploadService.getPublicUrl(uploaded.object_name) || '';
      if (!videoUrl) {
        throw new Error('Video URL missing');
      }

      showToast('✅ 视频上传成功!', 'success');

      const videoMarkdown = `\n<video controls width="100%" style="max-width: 800px; border-radius: 8px;">\n  <source src="${videoUrl}" type="${file.type}">\n  Your browser does not support the video tag.\n</video>\n`;

      const textarea = textareaRef.current;
      if (!textarea) {
        setContent((prev) => prev + videoMarkdown);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;

      const newText = text.substring(0, start) + videoMarkdown + text.substring(end);
      setContent(newText);

      setTimeout(() => {
        textarea.focus();
        const newPos = start + videoMarkdown.length;
        textarea.setSelectionRange(newPos, newPos);
        handleScroll();
      }, 0);
    } catch (error) {
      console.error('Video upload failed:', error);
      showToast('Video upload failed', 'error');
    }
  };

  const handleBatchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    if (!currentResource?.id) {
      alert('Please save the article first before uploading attachments.');
      return;
    }

    const newUploads = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Upload files in parallel
    await Promise.all(files.map(async (file, index) => {
      const uploadId = newUploads[index].id;
      try {
        const updatedResource = await resourceService.uploadAttachment(currentResource.id, file, (progress) => {
          setUploadingFiles(prev => prev.map(u =>
            u.id === uploadId ? { ...u, progress } : u
          ));
        });

        setUploadingFiles(prev => prev.map(u =>
          u.id === uploadId ? { ...u, status: 'completed', progress: 100 } : u
        ));

        // Update current resource to show new attachment
        setCurrentResource(updatedResource);

        // Remove from uploading list after a delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(u => u.id !== uploadId));
        }, 2000);

      } catch (error) {
        console.error(`Failed to upload ${file.name}`, error);
        setUploadingFiles(prev => prev.map(u =>
          u.id === uploadId ? { ...u, status: 'error' } : u
        ));
        showToast(`Failed to upload ${file.name}`, 'error');
      }
    }));

    e.target.value = ''; // Reset input
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await resourceService.deleteAttachment(attachmentId);
      // Refresh resource
      if (currentResource) {
        const updated = await resourceService.getResource(currentResource.id);
        setCurrentResource(updated);
      }
      showToast('Attachment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete attachment', error);
      showToast('Failed to delete attachment', 'error');
    }
  };

  const handleVideoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processVideo(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processImage(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processImage(file);
        }
        return;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); insertMarkdown('b'); break;
        case 'i': e.preventDefault(); insertMarkdown('i'); break;
        case 's':
          e.preventDefault();
          setShowPublishModal(true); // Ctrl+S triggers modal
          break;
      }
    }

    if (e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'h': e.preventDefault(); insertMarkdown('h2'); break;
        case 'l': e.preventDefault(); insertMarkdown('list'); break;
        case 'c': e.preventDefault(); insertMarkdown('code'); break;
        case 'q': e.preventDefault(); insertMarkdown('quote'); break;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + '  ' + text.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleAiEnhance = async () => {
    if (!content) return;
    setIsEnhancing(true);
    const improved = await enhanceContent(content, "Fix grammar, improve flow, and format with Markdown headers and lists where appropriate. Keep the tone professional.");
    setContent(improved);
    setIsEnhancing(false);
  };

  const handleGenerateSummary = async () => {
    if (!content) return;
    setIsGeneratingSummary(true);
    const summaryText = await generateSummary(content);
    setSummary(summaryText);
    setIsGeneratingSummary(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResourceFile(file);
      setResourceFileName(file.name);
      setUploadProgress(0);
    }
    e.target.value = '';
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!(e.target.files && e.target.files[0])) {
      return;
    }

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      e.target.value = '';
      return;
    }

    // Instead of uploading immediately, read for cropping
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result?.toString() || null);
      setCropFileType(file.type);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setCoverUploading(true);
      setCropImageSrc(null); // Close cropper

      const file = new File([croppedBlob], "cover.jpg", { type: "image/jpeg" });

      const uploaded = await uploadService.uploadImage(file);
      const imageUrl = uploaded.resolvedUrl || uploadService.getPublicUrl(uploaded.object_name);
      if (!imageUrl) {
        throw new Error('Cover upload failed');
      }
      setCoverImage(imageUrl);
      setCoverImageKey(uploaded.object_name);
    } catch (error) {
      console.error('Failed to upload cover image', error);
      alert('Failed to upload cover image. Please try again.');
    } finally {
      setCoverUploading(false);
    }
  };

  const uploadAttachmentForResource = async (resourceId: string | number): Promise<Resource | null> => {
    if (!resourceFile) {
      return null;
    }

    try {
      const updated = await resourceService.uploadFile(resourceId, resourceFile, (progress) => {
        setUploadProgress(progress);
      });
      setUploadProgress(100);
      showToast('✅ 附件上传成功!', 'success');
      setResourceFile(null);
      setResourceFileName('');
      setTimeout(() => setUploadProgress(0), 800);
      return updated;
    } catch (error) {
      console.error('Failed to upload resource file', error);
      setUploadProgress(0);
      showToast('❌ 附件上传失败', 'error');
      throw error;
    }
  };

  const handleFinalPublish = async () => {
    if (!title.trim()) {
      alert('Title is required.');
      return;
    }
    if (!selectedCategoryId) {
      alert('Please choose a category first.');
      return;
    }
    if (isPaid && price <= 0) {
      alert('Please set a positive point price for paid resources.');
      return;
    }

    try {
      setIsPublishing(true);
      const cleanDescription = summary.trim() || content.replace(/[#*_`>\n]/g, ' ').slice(0, 180) || 'Resource description';
      const tagList = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const payload = {
        title: title.trim(),
        description: cleanDescription,
        content,
        category_id: selectedCategoryId,
        is_free: !isPaid,
        points_required: isPaid ? Math.max(price, 0) : 0,
        tags: tagList,
        thumbnail_url: coverImageKey || undefined,
      };

      let savedResource: Resource;
      if (isEditing && resourceId) {
        savedResource = await resourceService.updateResource(resourceId, payload);  // Use resourceId (string UUID)
      } else {
        savedResource = await resourceService.createResource(payload);
      }

      const uploadedResource = await uploadAttachmentForResource(savedResource.id);
      if (uploadedResource) {
        savedResource = uploadedResource;
      }

      setCurrentResource(savedResource);
      setCoverImage(savedResource.thumbnail_url || null);
      setCoverImageKey(savedResource.thumbnail_key || null);

      alert(isEditing ? 'Resource updated successfully!' : t('editor.published'));
      setShowPublishModal(false);
      navigate('/admin');
    } catch (error: any) {
      console.error('Failed to publish resource', error);
      const detail = error?.response?.data?.detail || 'Unable to publish resource.';
      alert(detail);
    } finally {
      setIsPublishing(false);
    }
  };

  // Removed automatic scroll sync to prevent flicker and scroll lock
  // Users can scroll independently in editor and preview

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryService.listCategories(true);
        setCategories(data);
        if (data.length) {
          setSelectedCategoryId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (!isEditing || !resourceId) {
      return;
    }

    const loadResource = async () => {
      try {
        setIsResourceLoading(true);
        const data = await resourceService.getResource(resourceId);  // Use resourceId (string UUID) directly
        setCurrentResource(data);
        setTitle(data.title);
        setContent(data.content || data.description || '');
        setSummary(data.description || '');
        setIsPaid(!data.is_free && data.points_required > 0);
        setPrice(data.points_required || 0);
        setSelectedCategoryId(data.category_id || null);
        setTags(data.tags.join(', '));
        setCoverImage(data.thumbnail_url || null);
        setCoverImageKey(data.thumbnail_key || null);
      } catch (error) {
        console.error('Failed to load resource details', error);
        alert('Unable to load resource for editing.');
        navigate('/admin');
      } finally {
        setIsResourceLoading(false);
      }
    };

    loadResource();
  }, [isEditing, resourceId, navigate]);  // Changed dependency from resourceNumericId to resourceId

  if (isEditing && isResourceLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Loading resource…
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-[100] animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
          <p className="font-medium text-sm">{toast.message}</p>
        </div>
      )}

      {/* Hidden Inputs */}
      <input type="file" ref={imageInputRef} onChange={handleImageInput} accept="image/*" className="hidden" />
      <input type="file" ref={videoInputRef} onChange={handleVideoInput} accept="video/*" className="hidden" />
      <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />

      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 z-20 relative shadow-sm">
        <div className="flex items-center gap-4 flex-1 mr-8">
          <button onClick={() => navigate('/admin')} className="text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-50">
            <ArrowLeft size={20} />
          </button>
          <input
            type="text"
            placeholder={t('editor.placeholderTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-slate-900 placeholder-slate-300 outline-none flex-1 bg-transparent"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-4 mr-4 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <span className="flex items-center gap-1"><kbd className="font-sans bg-white border rounded px-1 shadow-sm text-slate-600">Ctrl+B</kbd> {t('editor.bold')}</span>
            <span className="flex items-center gap-1"><kbd className="font-sans bg-white border rounded px-1 shadow-sm text-slate-600">Ctrl+I</kbd> {t('editor.italic')}</span>
            <span className="flex items-center gap-1"><kbd className="font-sans bg-white border rounded px-1 shadow-sm text-slate-600">Alt+H</kbd> {t('editor.header')}</span>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
          {isEditing && currentResource && !isResourceLoading && (
            <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
              Editing: {currentResource.title}
            </span>
          )}

          <button
            onClick={handleAiEnhance}
            disabled={isEnhancing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Sparkles size={16} className={isEnhancing ? "animate-pulse" : ""} />
            {isEnhancing ? t('editor.polishing') : t('editor.aiPolish')}
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            disabled={isResourceLoading}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isResourceLoading ? 'Loading…' : isEditing ? 'Update' : t('editor.publish')}
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative bg-white">

        {/* Editor Pane */}
        <div className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 relative z-10 ${showPreview ? 'w-1/2' : 'w-full max-w-4xl mx-auto border-x'}`}>
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar bg-white z-20">
            <ToolbarButton icon={<Bold size={18} />} onClick={() => insertMarkdown('b')} label={`${t('editor.bold')} (Ctrl+B)`} />
            <ToolbarButton icon={<Italic size={18} />} onClick={() => insertMarkdown('i')} label={`${t('editor.italic')} (Ctrl+I)`} />
            <ToolbarButton icon={<Heading size={18} />} onClick={() => insertMarkdown('h2')} label={`${t('editor.header')} (Alt+H)`} />
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <ToolbarButton icon={<Quote size={18} />} onClick={() => insertMarkdown('quote')} label={`${t('editor.quote')} (Alt+Q)`} />
            <ToolbarButton icon={<Code size={18} />} onClick={() => insertMarkdown('code')} label={`${t('editor.code')} (Alt+C)`} />
            <ToolbarButton icon={<Terminal size={18} />} onClick={() => insertMarkdown('inlinecode')} label={t('editor.inlineCode')} />
            <ToolbarButton icon={<List size={18} />} onClick={() => insertMarkdown('list')} label={`${t('editor.list')} (Alt+L)`} />
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <ToolbarButton icon={<LinkIcon size={18} />} onClick={() => insertMarkdown('link')} label={t('editor.link')} />
            <ToolbarButton icon={<ImageIcon size={18} />} onClick={() => imageInputRef.current?.click()} label="Insert Image" />
            <ToolbarButton icon={<Video size={18} />} onClick={() => videoInputRef.current?.click()} label="Insert Video" />

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowPreview(!showPreview)} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title={showPreview ? t('editor.hidePreview') : t('editor.showPreview')}>
                {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Text Area Container */}
          <div className="flex-1 relative w-full h-full bg-white overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onPaste={handlePaste}
              placeholder="Start typing your markdown content here... (Drag & Drop or Paste images)"
              className="absolute inset-0 w-full h-full px-8 py-6 font-mono text-base leading-relaxed text-slate-900 bg-white resize-none outline-none custom-scrollbar"
              style={{
                fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                fontSize: '15px',
                lineHeight: '1.8',
                tabSize: 2,
              }}
              spellCheck={false}
            />
          </div>

          {/* File & Settings Footer (Quick Access) */}
          <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between gap-6 shrink-0 z-10">
            {/* Left: Attachments */}
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <div className="relative group">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors font-medium text-sm">
                  <Upload size={16} />
                  <span>{t('editor.attach')}</span>
                  <input type="file" multiple className="hidden" onChange={handleBatchFileUpload} />
                </label>

                {/* Upload Progress Popover */}
                {uploadingFiles.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-50 animate-fade-in">
                    <div className="space-y-2">
                      {uploadingFiles.map(file => (
                        <div key={file.id} className="text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="truncate max-w-[150px]">{file.filename}</span>
                            <span>{file.progress}%</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${file.status === 'error' ? 'bg-red-500' : 'bg-indigo-500'}`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Attachment List (Horizontal Scroll) */}
              {currentResource?.attachments && currentResource.attachments.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {currentResource.attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700 shrink-0 group">
                      <FileText size={12} className="text-indigo-500" />
                      <span className="max-w-[100px] truncate">{att.file_name}</span>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Paid Settings */}
            <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isPaid ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="hidden" />
                <span className={`text-sm font-medium transition-colors ${isPaid ? 'text-indigo-600' : 'text-slate-600'}`}>
                  {t('editor.premium')}
                </span>
              </label>

              {isPaid && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <div className="relative">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-24 pl-3 pr-8 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold text-slate-700"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">Pts</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative bg-white">

        {/* Preview Pane */}
        {showPreview && (
          <div className="w-1/2 bg-slate-50 flex flex-col overflow-hidden border-l border-slate-200">
            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-slate-200 shrink-0 bg-white">
              <span>{t('editor.preview')}</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">{t('editor.readMode')}</span>
            </div>
            <div
              ref={previewRef}
              className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white"
            >
              <article className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-indigo-600 prose-img:rounded-xl prose-img:shadow-lg prose-img:border prose-img:border-slate-100">
                <h1 className="mb-4 text-4xl tracking-tight text-slate-900">{title || "Untitled Article"}</h1>
                <div dangerouslySetInnerHTML={{ __html: previewHtml as string }} />
              </article>
            </div>
          </div>
        )}
      </div>

      {/* Publish Modal */}
      {
        showPublishModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800">{t('editor.publishModalTitle')}</h2>
                <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Col: Cover & Metadata */}
                  <div className="space-y-6">
                    {/* Cover Image */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{t('editor.coverImage')}</label>
                      <div
                        onClick={() => coverInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors overflow-hidden relative group"
                      >
                        {coverImage ? (
                          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <ImageIcon size={32} className="text-slate-300 mb-2 group-hover:text-indigo-500" />
                            <span className="text-xs text-slate-500 font-medium">{t('editor.uploadCover')}</span>
                          </>
                        )}
                        {coverImage && !coverUploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-sm font-bold">{t('editor.uploadCover')}</span>
                          </div>
                        )}
                        {coverUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">
                            {t('editor.uploading')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{t('editor.category')}</label>
                      <select
                        value={selectedCategoryId ?? ''}
                        onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                      >
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Col: Summary & Tags */}
                  <div className="space-y-6">
                    {/* Summary */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">{t('editor.summary')}</label>
                        <button
                          onClick={handleGenerateSummary}
                          disabled={isGeneratingSummary}
                          className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                        >
                          <Wand2 size={12} />
                          {isGeneratingSummary ? t('editor.generating') : t('editor.aiGenerate')}
                        </button>
                      </div>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder={t('editor.summaryPlaceholder')}
                        className="w-full h-32 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none text-sm resize-none"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{t('editor.tags')}</label>
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder={t('editor.tagsPlaceholder')}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                      />
                    </div>



                    {/* Price Confirmation */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{t('editor.premium')}</span>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded border-slate-300 text-indigo-600" />
                          {isPaid && (
                            <input
                              type="number"
                              value={price}
                              onChange={(e) => setPrice(Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm border border-slate-300 rounded text-center"
                            />
                          )}
                          {isPaid && <span className="text-sm text-slate-500">Pts</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-4">
                {/* Upload Progress Bar */}
                {uploadProgress > 0 && (
                  <div className="w-full">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('editor.uploadingAttachment')}...</span>
                      <span className="text-indigo-600 font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                  >
                    {t('editor.cancel')}
                  </button>
                  <button
                    onClick={handleFinalPublish}
                    disabled={isPublishing}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    {isPublishing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {isPublishing ? 'Saving…' : isEditing ? 'Save Changes' : t('editor.confirmPublish')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Image Cropper Modal */}
      {
        cropImageSrc && (
          <ImageCropper
            image={cropImageSrc}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropImageSrc(null)}
            aspectRatio={16 / 10}
          />
        )
      }
    </div >
  );
};



export default Editor;
