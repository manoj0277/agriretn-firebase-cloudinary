import React, { useState, useRef, useEffect } from 'react';
import { AppView } from '../types';
import Header from '../components/Header';
import { useAiAssistant } from '../context/AiAssistantContext';
import { useLanguage } from '../context/LanguageContext';

interface AiAssistantScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({ navigate, goBack }) => {
    const { chatHistory, sendMessage, isLoading, supportCallTriggered, clearSupportCall } = useAiAssistant();
    const { t } = useLanguage();
    const [input, setInput] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    useEffect(() => {
        if (supportCallTriggered) {
            navigate({ view: 'SUPPORT' });
            clearSupportCall();
        }
    }, [supportCallTriggered, navigate, clearSupportCall]);

    const handleSend = (text: string) => {
        if (!text.trim() || isLoading) return;
        sendMessage(text, navigate);
        setInput('');
    };
    
    const suggestedPrompts = [
        "Book a tractor for ploughing",
        "What are common pests for wheat?",
        "How far is the nearest supplier?",
    ];

    const AiAvatar = () => (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.5a1.5 1.5 0 011.5 1.5v2.085a1.5 1.5 0 01-3 0V5A1.5 1.5 0 0110 3.5z" />
                <path fillRule="evenodd" d="M3.75 8a1.5 1.5 0 011.5-1.5h9.5a1.5 1.5 0 011.5 1.5v4.25a.75.75 0 01-1.5 0V8a.75.75 0 00-.75-.75h-9.5A.75.75 0 004.5 8v4.25a.75.75 0 01-1.5 0V8z" clipRule="evenodd" />
                <path d="M6 11.5a1.5 1.5 0 011.5-1.5h5a1.5 1.5 0 011.5 1.5v2.835a.75.75 0 01-1.5 0V11.5a.75.75 0 00-.75-.75h-5a.75.75 0 00-.75.75v2.835a.75.75 0 01-1.5 0V11.5z" />
            </svg>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-neutral-100 dark:bg-neutral-900">
            <Header title={t('aiChatAssistant')} onBack={goBack} />
            <div className="flex-grow overflow-y-auto p-4 space-y-4 hide-scrollbar">
                {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.role === 'ai' && <AiAvatar />}
                       <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-start justify-start">
                        <AiAvatar />
                        <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-white dark:bg-neutral-700 flex items-center space-x-2">
                             <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white dark:bg-neutral-800 border-t dark:border-neutral-700">
                {chatHistory.length <= 1 && (
                    <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2 mb-2">
                        {suggestedPrompts.map(prompt => (
                             <button key={prompt} onClick={() => handleSend(prompt)} className="text-sm px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-full whitespace-nowrap">
                                {prompt}
                             </button>
                        ))}
                    </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('typeAMessage')}
                        className="flex-grow p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-white"
                        disabled={isLoading}
                    />
                    <button type="submit" className="bg-primary text-white font-bold p-3 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-neutral-400 aspect-square flex items-center justify-center" disabled={isLoading || !input.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AiAssistantScreen;