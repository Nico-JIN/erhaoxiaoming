import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, X, Send, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import messageService, { Conversation } from '../services/messageService';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, ja, ko } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';
import ChatModal from './ChatModal';

interface MessageDropdownProps {
    onClose: () => void;
    isMobile?: boolean;
}

const MessageDropdown: React.FC<MessageDropdownProps> = ({ onClose, isMobile = false }) => {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Chat modal state
    const [showChatModal, setShowChatModal] = useState(false);
    const [chatRecipient, setChatRecipient] = useState<{ id: string; name: string; avatar?: string } | null>(null);

    const getDateLocale = () => {
        switch (language) {
            case 'zh': return zhCN;
            case 'ja': return ja;
            case 'ko': return ko;
            default: return enUS;
        }
    };

    useEffect(() => {
        loadConversations();

        // Click outside to close (desktop only)
        if (!isMobile) {
            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as HTMLElement;
                // Ignore if clicking on a portal/modal or any of its children
                const isModalClick = target.closest('.fixed.inset-0.z-\\[9999\\]'); // ChatModal root

                if (dropdownRef.current && !dropdownRef.current.contains(target) && !isModalClick) {
                    onClose();
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isMobile]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const data = await messageService.getRecentConversations(5);
            setConversations(data);
        } catch (error) {
            console.error('Failed to load conversations', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConversationClick = (conv: Conversation) => {
        setChatRecipient({
            id: conv.peer_id,
            name: conv.peer_username,
            avatar: conv.peer_avatar
        });
        setShowChatModal(true);
    };

    const handleViewAll = () => {
        onClose();
        navigate('/messages');
    };

    const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

    // Mobile full-screen modal
    if (isMobile) {
        return (
            <>
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl max-h-[80vh] flex flex-col animate-slide-up">
                        {/* Header */}
                        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageCircle size={20} className="text-indigo-600" />
                                <h3 className="font-bold text-slate-900 text-lg">私信</h3>
                                {totalUnread > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {totalUnread > 99 ? '99+' : totalUnread}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Conversations List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-slate-400">加载中...</div>
                            ) : conversations.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                                    <MessageCircle size={32} className="opacity-30" />
                                    <p>暂无私信</p>
                                </div>
                            ) : (
                                conversations.map(conv => (
                                    <div
                                        key={conv.peer_id}
                                        onClick={() => handleConversationClick(conv)}
                                        className="px-4 py-4 active:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                                    >
                                        <div className="relative">
                                            <img
                                                src={conv.peer_avatar || `https://ui-avatars.com/api/?name=${conv.peer_username}&background=random`}
                                                alt={conv.peer_username}
                                                className="w-12 h-12 rounded-full object-cover border border-slate-100"
                                            />
                                            {conv.unread_count > 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h4 className="font-semibold text-slate-900 truncate">{conv.peer_username}</h4>
                                                {conv.last_message_at && (
                                                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                                                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: getDateLocale() })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 truncate">{conv.last_message || '开始对话...'}</p>
                                        </div>
                                        <ChevronRight size={20} className="text-slate-300 shrink-0" />
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={handleViewAll}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                            >
                                查看全部私信
                            </button>
                        </div>
                    </div>
                </div>

                {showChatModal && chatRecipient && (
                    <ChatModal
                        isOpen={showChatModal}
                        onClose={() => {
                            setShowChatModal(false);
                            setChatRecipient(null);
                            loadConversations(); // Refresh after closing chat
                        }}
                        recipientId={chatRecipient.id}
                        recipientName={chatRecipient.name}
                        recipientAvatar={chatRecipient.avatar}
                    />
                )}
            </>
        );
    }

    // Desktop dropdown
    return (
        <>
            <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">私信</h3>
                        {totalUnread > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {totalUnread > 99 ? '99+' : totalUnread}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleViewAll}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                        查看全部 <ChevronRight size={14} />
                    </button>
                </div>

                {/* Conversations List */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">加载中...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                            <MessageCircle size={24} className="opacity-20" />
                            <p>暂无私信</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.peer_id}
                                onClick={() => handleConversationClick(conv)}
                                className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${conv.unread_count > 0 ? 'bg-indigo-50/30' : ''}`}
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={conv.peer_avatar || `https://ui-avatars.com/api/?name=${conv.peer_username}&background=random`}
                                        alt={conv.peer_username}
                                        className="w-10 h-10 rounded-full object-cover border border-slate-100"
                                    />
                                    {conv.unread_count > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="text-sm font-semibold text-slate-800 truncate">{conv.peer_username}</h4>
                                        {conv.last_message_at && (
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: getDateLocale() })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.last_message || '开始对话...'}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showChatModal && chatRecipient && (
                <ChatModal
                    isOpen={showChatModal}
                    onClose={() => {
                        setShowChatModal(false);
                        setChatRecipient(null);
                        loadConversations(); // Refresh after closing chat
                    }}
                    recipientId={chatRecipient.id}
                    recipientName={chatRecipient.name}
                    recipientAvatar={chatRecipient.avatar}
                />
            )}
        </>
    );
};

export default MessageDropdown;
