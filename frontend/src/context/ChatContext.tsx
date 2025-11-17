import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { ChatMessage, UserRole } from '../types';
import { useAuth } from './AuthContext';
import { GoogleGenAI } from '@google/genai';
import { useToast } from './ToastContext';
import { supabase } from '../../lib/supabase';

type ConversationSummary = {
    chatId: string;
    otherUserId: number;
    lastMessage: ChatMessage;
};

interface ChatContextType {
    getMessagesForChat: (chatId: string) => ChatMessage[];
    sendMessage: (chatId: string, messageData: Omit<ChatMessage, 'id' | 'chatId' | 'timestamp' | 'read'>) => Promise<void>;
    getConversationsForUser: (userId: number) => ConversationSummary[];
    getUnreadMessageCount: (userId: number) => number;
    markChatAsRead: (chatId: string, currentUserId: number) => void;
    isBotThinking: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const { data } = await supabase.from('chatMessages').select('*');
                setMessages((data || []) as ChatMessage[]);
            } catch (error) {
            }
        };
        fetchMessages();
    }, []);

    const getMessagesForChat = useCallback((chatId: string) => {
        return messages.filter(msg => msg.chatId === chatId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages]);

    const sendMessage = useCallback(async (chatId: string, messageData: Omit<ChatMessage, 'id' | 'chatId' | 'timestamp' | 'read'>) => {
        const optimisticId = Date.now();
        const optimisticMessage: ChatMessage = {
            id: optimisticId,
            chatId,
            ...messageData,
            timestamp: new Date().toISOString(),
            read: true, // Optimistically mark as read for sender
        };
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const toSave: ChatMessage = { ...optimisticMessage, read: false };
            await supabase.from('chatMessages').upsert([toSave]);
            const sentMessage = toSave;
            
            // Replace optimistic message with server-confirmed one
            setMessages(prev => prev.map(msg => msg.id === optimisticId ? sentMessage : msg));

        } catch (error) {
            console.error("Failed to send message:", error);
            showToast("Failed to send message.", "error");
            // Revert optimistic update
            setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
        }
    }, [showToast]);

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
        await supabase.from('chatMessages').update({ read: true }).eq('chatId', chatId).eq('receiverId', currentUserId);
        setMessages(prev =>
            prev.map(msg =>
                msg.chatId === chatId && msg.receiverId === currentUserId && !msg.read
                    ? { ...msg, read: true }
                    : msg
            )
        );
    }, []);


    const value = useMemo(() => ({ getMessagesForChat, sendMessage, getConversationsForUser, getUnreadMessageCount, markChatAsRead, isBotThinking }), [getMessagesForChat, sendMessage, getConversationsForUser, getUnreadMessageCount, markChatAsRead, isBotThinking]);

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