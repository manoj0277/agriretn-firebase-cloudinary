
import React from 'react';
import { AppView, User } from '../types';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';

interface ConversationsScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const ConversationsScreen: React.FC<ConversationsScreenProps> = ({ navigate, goBack }) => {
    const { user, allUsers } = useAuth();
    const { getConversationsForUser } = useChat();
    const { t } = useLanguage();

    if (!user) {
        goBack(); // Should not happen if we are here
        return null;
    }

    const conversations = getConversationsForUser(user.id);

    const getChatPartner = (otherUserId: number): User | undefined => {
        return allUsers.find(u => u.id === otherUserId);
    };

    return (
        <div className="flex flex-col h-screen dark:text-neutral-200">
            <Header title={t('chats')} onBack={goBack} />
            <div className="flex-grow overflow-y-auto">
                {conversations.length > 0 ? (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {conversations.map(convo => {
                            const chatPartner = getChatPartner(convo.otherUserId);
                            if (!chatPartner) return null;

                            const isUnread = !convo.lastMessage.read && convo.lastMessage.receiverId === user.id;

                            return (
                                <button
                                    key={convo.chatId}
                                    onClick={() => navigate({ view: 'CHAT', chatPartner })}
                                    className="w-full text-left p-4 flex items-center space-x-4 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    <div className="relative">
                                        <img
                                            src={chatPartner.profilePicture || `https://ui-avatars.com/api/?name=${chatPartner.name.replace(' ', '+')}&background=random`}
                                            alt={chatPartner.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        {isUnread && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-primary ring-2 ring-white dark:ring-neutral-800"></span>}
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className={`font-bold truncate ${isUnread ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-800 dark:text-neutral-100'}`}>{chatPartner.name}</p>
                                            <p className={`text-xs flex-shrink-0 ${isUnread ? 'text-primary font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                                {new Date(convo.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className={`text-sm truncate ${isUnread ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                            {convo.lastMessage.senderId === user.id && 'You: '}{convo.lastMessage.text}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center p-16">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-neutral-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <h3 className="mt-4 text-lg font-semibold text-neutral-800 dark:text-neutral-100">{t('noChatsYet')}</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationsScreen;
