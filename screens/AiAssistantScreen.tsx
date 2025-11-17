
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AppView, AiChatMessage, ItemCategory, WorkPurpose } from '../types';
import Header from '../components/Header';
import { useAiAssistant } from '../context/AiAssistantContext';
import { useItem } from '../context/ItemContext';
import ItemCard from '../components/ItemCard';
import { useToast } from '../context/ToastContext';
import { GoogleGenAI } from '@google/genai';
import { useLanguage } from '../context/LanguageContext';

interface AiAssistantScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
  ? process.env.API_KEY
  : undefined;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({ navigate, goBack }) => {
    const { chatHistory, sendMessage, isLoading } = useAiAssistant();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    
    const recognitionRef = useRef<any>(null); // Using 'any' for SpeechRecognition for cross-browser compatibility

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    // Add cleanup for speech recognition on component unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleSend = (text: string) => {
        if (!text.trim() || isLoading) return;
        sendMessage(text, navigate);
        setInput('');
    };

    const handleToggleListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast("Voice recognition is not supported by your browser.", "error");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            showToast("Voice recognition error. Please try again.", "error");
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript); // Set as input to allow editing
            handleSend(transcript); // Or send directly
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    return (
        <div className="flex flex-col h-screen">
            <Header title={t('aiChatAssistant')} onBack={goBack} />
            <div className="flex-grow overflow-y-auto p-4 space-y-4 hide-scrollbar">
                {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl flex items-center space-x-2 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'}`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-neutral-200 dark:bg-neutral-700 flex items-center space-x-2">
                             <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white dark:bg-neutral-800 border-t dark:border-neutral-700">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Listening..." : t('typeAMessage')}
                        className="flex-grow p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white"
                        disabled={isLoading || isListening}
                    />
                    <button type="button" onClick={handleToggleListening} className={`p-3 rounded-lg transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'}`} disabled={isLoading}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v3a3 3 0 01-3 3z" /></svg>
                    </button>
                    <button type="submit" className="bg-primary text-white font-bold py-3 px-5 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-neutral-400" disabled={isLoading || !input.trim()}>
                        {t('send')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AiAssistantScreen;
