
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MedalName } from '../components/MedalName';
import { AppView, User, Item } from '../types';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';

interface ChatScreenProps {
    chatPartner: User;
    item?: Item;
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ chatPartner, item, navigate, goBack }) => {
    const { user } = useAuth();
    const { getMessagesForChat, sendMessage, markChatAsRead } = useChat();
    const { t } = useLanguage();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chatId = useMemo(() => {
        if (!user) return '';
        // Create a consistent chat ID regardless of who initiates the chat
        return [user.id, chatPartner.id].sort().join('-');
    }, [user, chatPartner]);

    const messages = getMessagesForChat(chatId);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (user) {
            markChatAsRead(chatId, user.id);
        }
    }, [chatId, user, markChatAsRead, messages]);


    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        sendMessage(chatId, {
            senderId: user.id,
            receiverId: chatPartner.id,
            text: newMessage,
        });
        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-screen bg-green-50 dark:bg-neutral-900">
            <Header title={<MedalName userId={chatPartner.id} displayName={chatPartner.name} className="text-white" showIcon={true} />} onBack={goBack} />
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {item && <div className="text-center text-xs text-neutral-500">Chatting about {item.name}</div>}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${msg.senderId === user?.id ? 'bg-primary text-white' : 'bg-white text-neutral-800'}`}>
                            <p>{msg.text}</p>
                            <p className="text-xs text-right mt-1 opacity-75">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white dark:bg-neutral-800 border-t dark:border-neutral-700">
                <form onSubmit={handleSend} className="flex space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('typeAMessage')}
                        className="flex-grow p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white"
                    />
                    <button type="submit" className="bg-primary text-white font-bold py-3 px-5 rounded-lg hover:bg-primary-dark transition-colors">{t('send')}</button>
                </form>
            </div>
        </div>
    );
};

export default ChatScreen;
