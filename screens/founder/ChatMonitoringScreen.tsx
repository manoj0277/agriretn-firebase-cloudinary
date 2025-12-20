import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage } from '../../types';
import { useToast } from '../../context/ToastContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

const ChatMonitoringScreen: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [chats, setChats] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const response = await fetch(`${API_URL}/chats`);
            if (!response.ok) throw new Error('Failed to fetch chats');
            const data = await response.json();
            setChats(data as ChatMessage[]);
        } catch (error) {
            console.error(error);
            showToast('Failed to load chats', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const conversations = useMemo(() => {
        const groups: Record<string, ChatMessage[]> = {};

        // Robust grouping: Use chatId if available, otherwise generate a key
        chats.forEach(msg => {
            let key = msg.chatId;
            if (!key || key === 'undefined') {
                // Fallback: alphabetical user sorting
                const participants = [msg.senderId, msg.receiverId].sort();
                key = participants.join('-');
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(msg);
        });

        // Convert to array and sort by latest message
        const list = Object.entries(groups).map(([chatId, messages]) => {
            // Sort messages within chat
            messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Derive participants
            const p1 = messages[0].senderId;
            const p2 = messages[0].receiverId; // Crude, but works for 2-person chats

            return {
                chatId,
                messages,
                lastMessage: messages[messages.length - 1],
                participants: { p1, p2 },
                participantCount: new Set(messages.flatMap(m => [m.senderId, m.receiverId])).size
            };
        });

        // Filter by search term
        const term = searchTerm.toLowerCase();
        return list.filter(c =>
            c.chatId.toLowerCase().includes(term) ||
            c.lastMessage.text.toLowerCase().includes(term) ||
            c.participants.p1.toLowerCase().includes(term) ||
            c.participants.p2.toLowerCase().includes(term)
        ).sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

    }, [chats, searchTerm]);

    const selectedConversation = useMemo(() =>
        conversations.find(c => c.chatId === selectedChatId),
        [conversations, selectedChatId]);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            {/* Sidebar: Conversation List */}
            <div className={`w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Chat Monitor</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Founder Access &bull; All conversations</p>
                    <div className="mt-3 relative">
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-none text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-6 text-center text-gray-500 text-sm">Loading conversations...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">No conversations found.</div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.chatId}
                                onClick={() => setSelectedChatId(conv.chatId)}
                                className={`p-4 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedChatId === conv.chatId ? 'bg-indigo-50 dark:bg-indigo-900/10 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
                                        Chat #{conv.chatId.slice(0, 8)}...
                                    </span>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                        {new Date(conv.lastMessage.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 break-all">
                                    {conv.lastMessage.senderId === user?.id ? 'You: ' : ''}{conv.lastMessage.text}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                                    <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                        {conv.participantCount} users
                                    </span>
                                    <span>Last: {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area: Chat History */}
            <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-black/20 ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                {selectedChatId && selectedConversation ? (
                    <>
                        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedChatId(null)}
                                    className="md:hidden text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white">Conversation Details</h3>
                                    <p className="text-xs text-gray-500 font-mono select-all">ID: {selectedChatId}</p>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 hidden sm:block">
                                Start: {new Date(selectedConversation.messages[0].timestamp).toLocaleString()}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100/50 dark:bg-black/10">
                            {selectedConversation.messages.map((msg, idx) => {
                                const isMe = msg.senderId === user?.id; // Visually distinguish 'my' messages if logged in as admin
                                // For monitoring, maybe better to just use Left/Right based on user IDs
                                // Let's simplify: Just render clearly.
                                const isSender1 = msg.senderId === selectedConversation.participants.p1;

                                return (
                                    <div key={msg.id || idx} className={`flex flex-col max-w-2xl ${isSender1 ? 'self-start' : 'self-end items-end'}`}>
                                        <span className="text-[10px] text-gray-400 mb-1 px-1">
                                            {msg.senderId.slice(0, 6)}...
                                        </span>
                                        <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${isSender1
                                                ? 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                                                : 'bg-indigo-600 text-white rounded-tr-none'
                                            }`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Select a Conversation</h3>
                        <p className="max-w-xs mt-2">Choose a chat from the list to inspect messages, check for safety issues, or monitor activity.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMonitoringScreen;
