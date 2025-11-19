
import React, { useState, useEffect } from 'react';
import { Lock, FileText, Download, ThumbsUp, Share2 } from 'lucide-react';
import { Article, User } from '../types';
import { marked } from 'marked';
import { useLanguage } from '../contexts/LanguageContext';

// Mock Data
const MOCK_ARTICLE: Article = {
  id: '1',
  title: 'Advanced System Architecture for High-Scale Applications',
  summary: 'A deep dive into microservices patterns, caching strategies, and database sharding.',
  content: `
# Introduction

Building scalable systems is both an art and a science. In this guide, we will explore the fundamental principles that drive modern distributed architectures.

## The Role of Caching

Caching is the first line of defense. **Redis** and **Memcached** are popular choices to reduce database load.

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

## Database Sharding

When your dataset exceeds the capacity of a single node, sharding becomes necessary. However, it introduces complexity in join operations.

1. Horizontal Sharding
2. Vertical Partitioning
3. Directory Based Sharding

\`\`\`javascript
function getShardId(userId) {
  return userId % TOTAL_SHARDS;
}
\`\`\`
  `,
  coverImage: 'https://picsum.photos/800/400',
  author: {
    name: 'Alex Chen',
    avatar: 'https://picsum.photos/50/50'
  },
  publishDate: 'Oct 24, 2023',
  isPaid: true,
  price: 100,
  tags: ['Architecture', 'Backend', 'System Design'],
  fileAttachment: {
    name: 'System_Design_Blueprints_v2.pdf',
    size: '450 MB',
    type: 'application/pdf'
  }
};

interface ArticleViewProps {
  user: User | null;
  onPurchase: (cost: number) => void;
}

const ArticleView: React.FC<ArticleViewProps> = ({ user, onPurchase }) => {
  const { t } = useLanguage();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (user?.unlockedArticles.includes(MOCK_ARTICLE.id)) {
      setIsUnlocked(true);
    }
  }, [user]);

  const handleUnlock = () => {
    if (!user) {
      alert(t('article.loginFirst'));
      return;
    }
    if (user.points >= (MOCK_ARTICLE.price || 0)) {
      onPurchase(MOCK_ARTICLE.price || 0);
      setIsUnlocked(true);
      setShowPaymentModal(false);
    } else {
      alert(t('article.insufficient'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4">
           {MOCK_ARTICLE.tags.map(tag => (
             <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium uppercase tracking-wide">{tag}</span>
           ))}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">{MOCK_ARTICLE.title}</h1>
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-8">
          <div className="flex items-center gap-3">
            <img src={MOCK_ARTICLE.author.avatar} alt="Author" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
            <div>
              <p className="font-medium text-slate-900">{MOCK_ARTICLE.author.name}</p>
              <p className="text-sm text-slate-500">{MOCK_ARTICLE.publishDate} • 12 min read</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button className="p-2 text-slate-400 hover:text-indigo-600 transition"><ThumbsUp size={20}/></button>
             <button className="p-2 text-slate-400 hover:text-indigo-600 transition"><Share2 size={20}/></button>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="rounded-2xl overflow-hidden shadow-lg mb-10">
        <img src={MOCK_ARTICLE.coverImage} alt="Cover" className="w-full h-auto object-cover" />
      </div>

      {/* Content Wrapper */}
      <div className="relative">
        <div className={`prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-a:text-indigo-600 prose-img:rounded-xl ${!isUnlocked && MOCK_ARTICLE.isPaid ? 'locked-content-blur h-[400px] overflow-hidden' : ''}`}>
           <div dangerouslySetInnerHTML={{ __html: marked.parse(MOCK_ARTICLE.content) as string }} />
        </div>

        {/* Paywall Overlay */}
        {!isUnlocked && MOCK_ARTICLE.isPaid && (
          <div className="absolute inset-0 z-10 flex items-end justify-center pb-20 pointer-events-none">
             <div className="bg-white/90 backdrop-blur-md border border-white/50 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full pointer-events-auto transform hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('article.premiumContent')}</h3>
                <p className="text-slate-600 mb-6">{t('article.unlockMsg')}</p>
                
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 mb-6 border border-slate-100">
                  <span className="text-sm font-medium text-slate-600">{t('article.price')}</span>
                  <span className="text-lg font-bold text-indigo-600">{MOCK_ARTICLE.price} Pts</span>
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

      {/* Attachments Section (Only visible if unlocked) */}
      {isUnlocked && MOCK_ARTICLE.fileAttachment && (
        <div className="mt-12 border-t border-slate-200 pt-8 animate-fade-in">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('article.attachedResources')}</h3>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors group">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{MOCK_ARTICLE.fileAttachment.name}</p>
                  <p className="text-sm text-slate-500">{MOCK_ARTICLE.fileAttachment.size} • {MOCK_ARTICLE.fileAttachment.type}</p>
                </div>
             </div>
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-all">
                <Download size={18} />
                {t('article.download')}
             </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showPaymentModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
               <h3 className="text-lg font-bold text-slate-900 mb-4">{t('article.confirmTitle')}</h3>
               <p className="text-slate-600 mb-6">
                 {t('article.confirmMsg', { price: MOCK_ARTICLE.price || 0 })}
               </p>
               <div className="flex gap-3">
                 <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">{t('article.cancel')}</button>
                 <button onClick={handleUnlock} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">{t('article.confirm')}</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ArticleView;
