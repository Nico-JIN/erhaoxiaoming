import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, MessageCircle, Heart, Download, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import notificationService, { Notification } from '../services/notificationService';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, ja, ko } from 'date-fns/locale';
import ChatModal from './ChatModal';

interface NotificationDropdownProps {
    onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
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
        loadNotifications();

        // Click outside to close
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationService.getNotifications(0, 20);
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        try {
            // Mark as read immediately
            if (!notification.is_read) {
                await notificationService.markAsRead(notification.id);
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            }

            onClose();

            // Navigate based on type
            if (notification.notification_type === 'MESSAGE' && notification.actor_id) {
                navigate(`/messages?userId=${notification.actor_id}`);
            } else if (notification.resource_id) {
                navigate(`/article/${notification.resource_id}`);
            } else {
                // Default fallback to admin panel notifications tab
                navigate('/admin?tab=notifications');
            }
        } catch (error) {
            console.error('Failed to handle notification click', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'LIKE': return <Heart size={16} className="text-red-500" />;
            case 'COMMENT': return <MessageCircle size={16} className="text-blue-500" />;
            case 'DOWNLOAD': return <Download size={16} className="text-green-500" />;
            case 'MESSAGE': return <MessageCircle size={16} className="text-indigo-500" />;
            default: return <Info size={16} className="text-slate-500" />;
        }
    };

    return (
        <>
            <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">{t('nav.notifications') || 'Notifications'}</h3>
                    <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                        <Check size={14} />
                        {t('nav.markAllRead') || 'Mark all read'}
                    </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                            <Bell size={24} className="opacity-20" />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notification.is_read ? 'bg-indigo-50/30' : ''}`}
                            >
                                <div className="mt-1 shrink-0 w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                    {getIcon(notification.notification_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-sm text-slate-800 line-clamp-2">
                                            <span className="font-semibold">{notification.actor_username || 'System'}</span> {notification.content}
                                        </p>
                                        {!notification.is_read && (
                                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: getDateLocale() })}
                                    </p>
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
                    }}
                    recipientId={chatRecipient.id}
                    recipientName={chatRecipient.name}
                    recipientAvatar={chatRecipient.avatar}
                />
            )}
        </>
    );
};

export default NotificationDropdown;
