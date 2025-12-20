import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration, HarmCategory, HarmBlockThreshold } from "@google/genai";
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
}

const AiAssistantContext = createContext<AiAssistantContextType | undefined>(undefined);

// Define the function for the AI to call
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


export const AiAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<AiChatMessage[]>(() => [
        {
            id: Date.now(),
            role: 'ai',
            text: `Hello ${user?.name || 'Farmer'}! I'm your AI Farming Assistant. You can ask me anything about agriculture, from crop diseases to market trends. If you need equipment like a tractor or workers, just ask! You can type or use the microphone to talk to me.`,
            timestamp: new Date().toISOString()
        }
    ]);

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

        const updatedHistory = [...chatHistory, userMessage];
        setChatHistory(updatedHistory);

        try {
            const systemInstruction = `You are an expert AI assistant for AgriRent. Your primary goal is to help farmers. You are chatting with ${user?.name}. Address them by their name when appropriate.
            1.  Answer farming-related questions clearly and concisely.
            2.  If a user expresses intent to book equipment or a service, you MUST use the 'createBooking' function.
            3.  Before calling the booking function, ensure you have the required 'itemCategory'. If it's missing, ask the user for it. You can also ask for optional details like quantity or work purpose.
            4.  Do not guess the item category. If the user's request is ambiguous (e.g., "I need a machine"), ask for clarification (e.g., "What kind of machine do you need? A tractor, harvester, or something else?").
            5.  If the user is unsatisfied, frustrated, or asks to speak to a person, human, officer, or support, you MUST use the 'connectToSupport' function.
            6.  After calling a function, also provide a short confirmation message to the user, like "Okay, let's start that booking for you." or "Okay, connecting you to support."`;

            // detailed instructions...

            // Filter out the initial greeting if it's the first message and from AI, as Gemini expects User first.
            const contents = updatedHistory
                .filter((msg, index) => !(index === 0 && msg.role === 'ai'))
                .map(msg => ({
                    role: msg.role === 'ai' ? 'model' : 'user',
                    parts: [{ text: msg.text }],
                }));

            // Helper for retrying on 503
            const generateWithRetry = async (maxRetries = 3) => {
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        return await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents,
                            config: {
                                systemInstruction,
                                tools: [{ functionDeclarations: [createBookingFunctionDeclaration, connectToSupportFunctionDeclaration] }],
                                safetySettings: [
                                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                ],
                            },
                        });
                    } catch (err: any) {
                        const isOverloaded = err?.message?.includes('503') || err?.message?.includes('overloaded');
                        if (isOverloaded && i < maxRetries - 1) {
                            console.warn(`Gemini 503/Overloaded. Retrying in ${(i + 1) * 1000}ms...`);
                            await new Promise(r => setTimeout(r, (i + 1) * 1000));
                            continue;
                        }
                        throw err;
                    }
                }
                throw new Error("Failed after 3 retries");
            };

            const response = await generateWithRetry();

            // Restore strict types/variables used below
            const aiResponseContent = response.candidates?.[0]?.content;

            // Helper to safely get text (restored)
            const getResponseText = (resp: any) => {
                try {
                    // Try/catch for property access/methods
                    if (typeof resp.text === 'function') return resp.text();
                    if (resp.text) return resp.text;
                    // Fallback for deeply nested
                    return resp.candidates?.[0]?.content?.parts?.[0]?.text || null;
                } catch (e) {
                    return null;
                }
            };

            const botMessageText = getResponseText(response);
            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                if (call.name === 'createBooking') {
                    navigate({
                        view: 'BOOKING_FORM',
                        category: call.args.itemCategory as ItemCategory,
                        quantity: call.args.quantity as number,
                        workPurpose: call.args.workPurpose as any,
                    });
                } else if (call.name === 'connectToSupport') {
                    navigate({ view: 'SUPPORT' });
                }
            }

            let responseText = '';
            try {
                // Handle response.text whether it's a property (string) or a function
                const responseAny = response as any;
                responseText = typeof responseAny.text === 'function' ? responseAny.text() : responseAny.text;
                // If response.text is undefined/null, default to empty string
                if (!responseText) responseText = '';
            } catch (e) {
                console.warn("No text in response (possible tool call or safety block):", e);
            }

            // If there's text, add it to chat history
            if (responseText) {
                const aiMessage: AiChatMessage = {
                    id: Date.now() + 1,
                    role: 'ai',
                    text: responseText,
                    timestamp: new Date().toISOString()
                };
                setChatHistory(prev => [...prev, aiMessage]);
            } else if (!functionCalls || functionCalls.length === 0) {
                // If no text and no function calls, it means the AI returned no content
                // This could be due to safety filters or other issues.
                throw new Error("AI returned no content. It might be blocked by safety filters or an internal error occurred.");
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

    }, [showToast, chatHistory, user]);


    const value = useMemo(() => ({ chatHistory, sendMessage, isLoading }), [chatHistory, sendMessage, isLoading]);

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