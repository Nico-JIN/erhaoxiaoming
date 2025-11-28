
import React, { useState, useRef, useEffect } from 'react';
import { Save, Upload, Sparkles, Eye, EyeOff, Bold, Italic, Heading, Quote, Code, List, Link as LinkIcon, Image as ImageIcon, Terminal, X, Wand2, ArrowLeft } from 'lucide-react';
import { enhanceContent, generateSummary } from '../services/geminiService';
import { marked } from 'marked';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams } from 'react-router-dom';
import resourceService, { Resource } from '../services/resourceService';
import categoryService, { Category } from '../services/categoryService';
import uploadService from '../services/uploadService';
import ImageCropper from '../components/ImageCropper';

const Editor: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { resourceId } = useParams<{ resourceId?: string }>();
  const resourceIdNumber = resourceId !== undefined ? Number(resourceId) : null;
  const resourceNumericId = resourceIdNumber !== null && !Number.isNaN(resourceIdNumber) ? resourceIdNumber : null;
  const isEditing = resourceNumericId !== null;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(`# Welcome to the Editor

Start writing your knowledge here. 

## Features
- Full Markdown Support
- AI Enhancement
- Split Preview
- **Image Uploads** (Try dragging an image here!)

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
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        newText = `${before}**${selection || 'Bold Text'}**${after}`;
        newCursorPos = selection ? end + 4 : start + 2 + 9;
        break;
      case 'i':
        newText = `${before}_${selection || 'Italic Text'}_${after}`;
        newCursorPos = selection ? end + 2 : start + 1 + 11;
        break;
      case 'h2':
        newText = `${before}\n## ${selection || 'Heading 2'}\n${after}`;
        newCursorPos = newText.length - after.length - 1;
        break;
      case 'quote':
        newText = `${before}\n> ${selection || 'Blockquote'}\n${after}`;
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
      const uploaded = await uploadService.uploadImage(file);
      const imageUrl = uploaded.resolvedUrl || uploadService.getPublicUrl(uploaded.object_name) || '';
      if (!imageUrl) {
        throw new Error('Image URL missing');
      }

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
      alert('Failed to upload image. Please try again.');
    }
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
      setUploadProgress(15);
      const updated = await resourceService.uploadFile(resourceId, resourceFile);
      setUploadProgress(100);
      setResourceFile(null);
      setResourceFileName('');
      setTimeout(() => setUploadProgress(0), 800);
      return updated;
    } catch (error) {
      console.error('Failed to upload resource file', error);
      setUploadProgress(0);
      alert('Failed to upload resource file. Please try again.');
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
      if (isEditing && resourceNumericId) {
        savedResource = await resourceService.updateResource(resourceNumericId, payload);
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

  // Sync scroll when content updates to ensure heights are correct for calculation
  useEffect(() => {
    const timer = setTimeout(handleScroll, 50);
    return () => clearTimeout(timer);
  }, [content, showPreview]);

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
    if (!isEditing || !resourceNumericId) {
      return;
    }

    const loadResource = async () => {
      try {
        setIsResourceLoading(true);
        const data = await resourceService.getResource(resourceNumericId);
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
  }, [isEditing, resourceNumericId, navigate]);

  if (isEditing && isResourceLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Loading resource…
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Hidden Inputs */}
      <input type="file" ref={imageInputRef} onChange={handleImageInput} accept="image/*" className="hidden" />
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
          <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between z-20 relative">
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors relative group">
                <Upload size={18} />
                <span className="text-sm font-medium">{t('editor.attach')}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} />
                <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-10">
                  {t('editor.supports')}
                </span>
              </label>
              {resourceFileName && <span className="text-xs text-slate-500">{resourceFileName}</span>}
              {uploadProgress > 0 && <span className="text-xs text-green-600 font-medium">{uploadProgress}% {t('editor.uploading')}</span>}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700 font-medium">{t('editor.premium')}</span>
              </label>
              {isPaid && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="Pts"
                    className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:border-indigo-500 outline-none text-slate-900"
                  />
                  <span className="text-xs text-slate-500">{t('editor.points')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

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
                <div dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />
              </article>
            </div>
          </div>
        )}
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
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
                      placeholder="System Design, Backend, ..."
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
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
              >
                {t('editor.cancel')}
              </button>
              <button
                onClick={handleFinalPublish}
                disabled={isPublishing}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors disabled:opacity-70"
              >
                {isPublishing ? 'Saving…' : isEditing ? 'Save Changes' : t('editor.confirmPublish')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Image Cropper Modal */}
      {cropImageSrc && (
        <ImageCropper
          image={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImageSrc(null)}
          aspect={16 / 9}
        />
      )}
    </div>
  );
};

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

export default Editor;
