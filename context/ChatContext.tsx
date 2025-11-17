import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { ChatMessage } from '../types';
import { supabase } from '../lib/supabase';
import { useNotification } from './NotificationContext';

type ConversationSummary = {
    chatId: string;
    otherUserId: number;
    lastMessage: ChatMessage;
};

interface ChatContextType {
    getMessagesForChat: (chatId: string) => ChatMessage[];
    sendMessage: (chatId: string, messageData: Omit<ChatMessage, 'id' | 'chatId' | 'timestamp' | 'read'>) => void;
    getConversationsForUser: (userId: number) => ConversationSummary[];
    getUnreadMessageCount: (userId: number) => number;
    markChatAsRead: (chatId: string, currentUserId: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const { addNotification } = useNotification() as any;

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await supabase.from('chatMessages').select('*');
                setMessages((data || []) as ChatMessage[]);
            } catch {}
        };
        load();
    }, []);

    const getMessagesForChat = useCallback((chatId: string) => {
        return messages.filter(msg => msg.chatId === chatId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages]);

    const sendMessage = useCallback(async (chatId: string, messageData: Omit<ChatMessage, 'id' | 'chatId' | 'timestamp' | 'read'>) => {
        const newMsg: ChatMessage = { id: Date.now(), chatId, timestamp: new Date().toISOString(), read: false, ...messageData } as ChatMessage;
        await supabase.from('chatMessages').upsert([newMsg]);
        setMessages(prev => [...prev, newMsg]);
        const lower = (newMsg.text || '').toLowerCase();
        const blacklist = ['abuse','idiot','stupid','fool','fraud'];
        if (blacklist.some(w => lower.includes(w))) {
            addNotification && addNotification({ userId: 0, message: `Potential abusive chat detected from user ${newMsg.senderId}.`, type: 'admin' });
        }
    }, []);

    const getConversationsForUser = useCallback((userId: number) => {
        const conversations = new Map<string, ChatMessage[]>();
        messages.forEach(msg => {
            if (!conversations.has(msg.chatId)) {
                conversations.set(msg.chatId, []);
            }
            conversations.get(msg.chatId)!.push(msg);
        });

        const userConversations: ConversationSummary[] = [];
        
        conversations.forEach((msgs, chatId) => {
            const participants = chatId.split('-').map(Number);
            if (participants.includes(userId)) {
                const otherUserId = participants.find(id => id !== userId);
                if (otherUserId) {
                    const lastMessage = msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                    userConversations.push({
                        chatId,
                        otherUserId,
                        lastMessage
                    });
                }
            }
        });
        
        return userConversations.sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
    }, [messages]);

    const getUnreadMessageCount = useCallback((userId: number): number => {
        return messages.filter(msg => msg.receiverId === userId && !msg.read).length;
    }, [messages]);

    const markChatAsRead = useCallback(async (chatId: string, currentUserId: number) => {
        const unread = messages.filter(m => m.chatId === chatId && m.receiverId === currentUserId && !m.read);
        if (unread.length > 0) {
            await supabase.from('chatMessages').update({ read: true }).eq('chatId', chatId).eq('receiverId', currentUserId);
        }
        setMessages(prev => prev.map(m => unread.some(u => u.id === m.id) ? { ...m, read: true } : m));
    }, [messages]);


    const value = useMemo(() => ({ getMessagesForChat, sendMessage, getConversationsForUser, getUnreadMessageCount, markChatAsRead }), [getMessagesForChat, sendMessage, getConversationsForUser, getUnreadMessageCount, markChatAsRead]);

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
