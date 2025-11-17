import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration, Content } from "@google/genai";
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { AiChatMessage, ItemCategory, WORK_PURPOSES, AppView } from '../types';
import { useItem } from './ItemContext';

// This guard is necessary for environments where process.env is not defined.
const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
  ? process.env.API_KEY
  : undefined;

if (!apiKey) {
    console.warn("API_KEY environment variable not set. AI Assistant will not function.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface AiAssistantContextType {
    chatHistory: AiChatMessage[];
    sendMessage: (prompt: string, navigate: (view: AppView) => void) => void;
    isLoading: boolean;
    supportCallTriggered: boolean;
    clearSupportCall: () => void;
}

const AiAssistantContext = createContext<AiAssistantContextType | undefined>(undefined);

const createBookingFunctionDeclaration: FunctionDeclaration = {
  name: 'createBooking',
  description: 'Starts the process of booking a farm service or equipment by navigating to the booking form.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemCategory: {
        type: Type.STRING,
        description: 'The category of the item to book. Must be one of the available categories.',
        enum: Object.values(ItemCategory),
      },
      quantity: {
        type: Type.INTEGER,
        description: 'The number of items or workers needed. Defaults to 1 if not specified by the user.',
      },
      workPurpose: {
        type: Type.STRING,
        description: 'The specific task the user wants to perform, e.g., "Harvesting", "Ploughing". Must be one of the available work purposes.',
        enum: [...WORK_PURPOSES],
      }
    },
    required: ['itemCategory'],
  },
};

const connectToSupportFunctionDeclaration: FunctionDeclaration = {
    name: 'connectToSupport',
    description: "Connects the user to the human support team by navigating to the support page. Use this function if the user expresses frustration, is not satisfied with the AI's help, or explicitly asks to speak to a human, person, agent, or officer.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
};

const getCurrentLocationFunctionDeclaration: FunctionDeclaration = {
    name: 'getCurrentLocation',
    description: "Gets the user's current geographical location (latitude and longitude). Use this when the user asks a location-based question like 'what's near me?' or 'how far is...?' without providing a specific location.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
    },
};


export const AiAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { items } = useItem();
    const [isLoading, setIsLoading] = useState(false);
    const [supportCallTriggered, setSupportCallTriggered] = useState(false);
    const [chatHistory, setChatHistory] = useState<AiChatMessage[]>(() => [
        {
            id: Date.now(),
            role: 'ai',
            text: `Hello ${user?.name}! I'm your AI Farming Assistant. You can ask me anything about agriculture, from crop diseases to market trends. If you need equipment like a tractor or workers, just ask!`,
            timestamp: new Date().toISOString()
        }
    ]);

    const clearSupportCall = useCallback(() => {
        setSupportCallTriggered(false);
    }, []);

    const sendMessage = useCallback(async (prompt: string, navigate: (view: AppView) => void) => {
        if (!ai) {
            showToast("AI Assistant is not configured. Missing API Key.", "error");
            return;
        }

        setIsLoading(true);
        const userMessage: AiChatMessage = {
            id: Date.now(),
            role: 'user',
            text: prompt,
            timestamp: new Date().toISOString()
        };
        
        const currentHistory = [...chatHistory, userMessage];
        setChatHistory(currentHistory);

        try {
            const systemInstruction = `You are an expert AI assistant for AgriRent. Your primary goal is to help farmers. You are chatting with ${user?.name}. Address them by their name when appropriate.
            1.  Answer farming-related questions clearly and concisely.
            2.  If a user expresses intent to book equipment or a service, you MUST use the 'createBooking' function.
            3.  Before calling the booking function, ensure you have the required 'itemCategory'. If it's missing, ask the user for it. You can also ask for optional details like quantity or work purpose.
            4.  Do not guess the item category. If the user's request is ambiguous (e.g., "I need a machine"), ask for clarification (e.g., "What kind of machine do you need? A tractor, harvester, or something else?").
            5.  If the user is unsatisfied, frustrated, or asks to speak to a person, human, officer, or support, you MUST use the 'connectToSupport' function.
            6.  If the user asks a location-based question without specifying a location (e.g., "what's nearby?"), you MUST use the 'getCurrentLocation' function to get their coordinates first.
            7.  After calling a function, also provide a short confirmation message to the user, like "Okay, let's start that booking for you." or "Okay, connecting you to support."`;
            
            const historyForAPI: Content[] = currentHistory.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }],
            }));

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: historyForAPI,
                config: {
                    systemInstruction,
                    tools: [{ functionDeclarations: [createBookingFunctionDeclaration, connectToSupportFunctionDeclaration, getCurrentLocationFunctionDeclaration] }],
                },
            });

            const aiResponseContent = response.candidates?.[0]?.content;
            if (aiResponseContent?.parts[0]?.functionCall) {
                const fc = aiResponseContent.parts[0].functionCall;
                let functionResponse: any = null;

                if (fc.name === 'createBooking') {
                    navigate({ view: 'BOOKING_FORM', category: fc.args.itemCategory as ItemCategory, quantity: fc.args.quantity as number, workPurpose: fc.args.workPurpose as any });
                    functionResponse = { result: "OK, navigating to booking form." };
                } else if (fc.name === 'connectToSupport') {
                    setSupportCallTriggered(true);
                    functionResponse = { result: "OK, connecting to support." };
                } else if (fc.name === 'getCurrentLocation') {
                     functionResponse = await new Promise((resolve) => {
                        navigator.geolocation.getCurrentPosition(
                            (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
                            (error) => resolve({ error: error.message })
                        );
                    });
                }
                
                // Add the AI's function call turn to history for the UI
                 if (response.text) {
                    setChatHistory(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: response.text, timestamp: new Date().toISOString() }]);
                }

                if (functionResponse) {
                    // FIX: Corrected a typo in the model name from `gemini-2.asideflash` to `gemini-2.5-flash`.
                    const secondResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: [
                            ...historyForAPI,
                            aiResponseContent,
                            {
                                role: 'user',
                                parts: [{ functionResponse: { name: fc.name, response: functionResponse } }]
                            }
                        ],
                         config: {
                            systemInstruction,
                            tools: [{ functionDeclarations: [createBookingFunctionDeclaration, connectToSupportFunctionDeclaration, getCurrentLocationFunctionDeclaration] }],
                        },
                    });
                    setChatHistory(prev => [...prev, { id: Date.now() + 2, role: 'ai', text: secondResponse.text, timestamp: new Date().toISOString() }]);
                }

            } else if (response.text) {
                 const aiMessage: AiChatMessage = { id: Date.now() + 1, role: 'ai', text: response.text, timestamp: new Date().toISOString() };
                 setChatHistory(prev => [...prev, aiMessage]);
            }

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            showToast("Sorry, I couldn't process that request. Please try again.", "error");
             const errorMessage: AiChatMessage = {
                id: Date.now() + 1,
                role: 'ai',
                text: "I'm having a little trouble connecting right now. Please check the configuration or try again in a moment.",
                timestamp: new Date().toISOString()
            };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }

    }, [showToast, items, chatHistory, user]);


    const value = useMemo(() => ({ chatHistory, sendMessage, isLoading, supportCallTriggered, clearSupportCall }), [chatHistory, sendMessage, isLoading, supportCallTriggered, clearSupportCall]);

    return (
        <AiAssistantContext.Provider value={value}>
            {children}
        </AiAssistantContext.Provider>
    );
};

export const useAiAssistant = (): AiAssistantContextType => {
    const context = useContext(AiAssistantContext);
    if (context === undefined) {
        throw new Error('useAiAssistant must be used within an AiAssistantProvider');
    }
    return context;
};