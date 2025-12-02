import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import messageService, { Conversation, Message } from '../services/messageService';
import { Send, User as UserIcon } from 'lucide-react';

const Messages: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (activeConversation) {
            loadMessages(activeConversation.peer_id);
            const interval = setInterval(() => loadMessages(activeConversation.peer_id), 5000);
            return () => clearInterval(interval);
        }
    }, [activeConversation]);

    const loadConversations = async () => {
        try {
            const data = await messageService.getConversations();
            setConversations(data);
            setLoading(false);

            // Check for URL query param to open specific conversation
            const params = new URLSearchParams(window.location.search);
            const targetUserId = params.get('userId');
            if (targetUserId) {
                const targetConv = data.find(c => c.peer_id === targetUserId);
                if (targetConv) {
                    setActiveConversation(targetConv);
                }
            }
        } catch (error) {
            console.error('Failed to load conversations', error);
            setLoading(false);
        }
    };

    const loadMessages = async (peerId: string) => {
        try {
            const data = await messageService.getMessages(peerId);
            const sorted = data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            setMessages(sorted);
        } catch (error) {
            console.error('Failed to load messages', error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeConversation || !newMessage.trim()) return;

        try {
            const sentMsg = await messageService.sendMessage(activeConversation.peer_id, newMessage);
            setMessages(prev => [...prev, sentMsg]);
            setNewMessage('');
            // Update last message in conversation list
            setConversations(prev => prev.map(c =>
                c.peer_id === activeConversation.peer_id
                    ? { ...c, last_message: sentMsg.content, last_message_at: sentMsg.created_at }
                    : c
            ));
        } catch (error) {
            console.error('Failed to send message', error);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-400">Loading messages...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-80px)]">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex overflow-hidden">
                {/* Sidebar - Conversations */}
                <div className="w-80 border-r border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="font-bold text-slate-800">Messages</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">No conversations yet</div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.peer_id}
                                    onClick={() => setActiveConversation(conv)}
                                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${activeConversation?.peer_id === conv.peer_id ? 'bg-indigo-50/50' : ''}`}
                                >
                                    <img
                                        src={conv.peer_avatar || `https://ui-avatars.com/api/?name=${conv.peer_username}&background=random`}
                                        alt={conv.peer_username}
                                        className="w-12 h-12 rounded-full object-cover border border-slate-100"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-semibold text-slate-900 truncate">{conv.peer_username}</h3>
                                            <span className="text-xs text-slate-400">{new Date(conv.last_message_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">{conv.last_message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-slate-50">
                    {activeConversation ? (
                        <>
                            <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
                                <img
                                    src={activeConversation.peer_avatar || `https://ui-avatars.com/api/?name=${activeConversation.peer_username}&background=random`}
                                    alt={activeConversation.peer_username}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                    <h3 className="font-bold text-slate-900">{activeConversation.peer_username}</h3>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map(msg => {
                                    const isMe = msg.sender_id === user?.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${isMe
                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                                }`}>
                                                <p className="text-sm">{msg.content}</p>
                                                <p className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            Select a conversation to start chatting
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
