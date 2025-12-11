
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppView } from '../types';
import Header from '../components/Header';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { useLanguage } from '../context/LanguageContext';

const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
    ? process.env.API_KEY
    : undefined;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface AiScanScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const AiScanScreen: React.FC<AiScanScreenProps> = ({ navigate, goBack }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessingVideo, setIsProcessingVideo] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const { showToast } = useToast();
    const { t, language } = useLanguage();

    const languageNames: Record<string, string> = {
        'en': 'English',
        'hi': 'Hindi',
        'te': 'Telugu'
    };
    const languageName = languageNames[language] || 'English';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const stopCameraStream = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopCameraStream();
        };
    }, [stopCameraStream]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAiResponse(null);
        setError(null);

        if (file.type.startsWith('video/')) {
            setIsProcessingVideo(true);
            const videoElement = document.createElement('video');
            videoElement.src = URL.createObjectURL(file);
            videoElement.muted = true;

            videoElement.onloadeddata = () => {
                videoElement.currentTime = 1; // Seek to 1 second
            };

            videoElement.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const context = canvas.getContext('2d');
                context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                setImageSrc(canvas.toDataURL('image/jpeg'));
                setIsProcessingVideo(false);
                URL.revokeObjectURL(videoElement.src);
            };

            videoElement.onerror = () => {
                setError(t('couldNotProcessVideo'));
                setIsProcessingVideo(false);
            };
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageSrc(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        stopCameraStream();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setShowCamera(true);
            setAiResponse(null);
            setError(null);
            setImageSrc(null);
        } catch (err) {
            console.error("Camera error:", err);
            setError(t('couldNotAccessCamera'));
            setShowCamera(false);
        }
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setImageSrc(dataUrl);
        }
        setShowCamera(false);
        stopCameraStream();
    };

    const handleAnalyze = async () => {
        if (!imageSrc) {
            setError(t('pleaseSelectImageFirst'));
            return;
        }
        if (!ai) {
            setError(t('aiServiceNotConfigured'));
            showToast(t('aiServiceNotConfigured'), "error");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAiResponse(null);

        try {
            const mimeType = imageSrc.split(';')[0].split(':')[1];
            const base64Data = imageSrc.split(',')[1];

            const imagePart = { inlineData: { mimeType, data: base64Data } };
            const textPart = { text: `You are an expert agronomist. Analyze the attached image, which is a frame from a crop video. Identify any pests, diseases, or nutritional deficiencies. Provide a detailed remedy including: 1. A clear diagnosis of the problem. 2. A list of suggested organic and chemical pesticides or treatments. 3. Step-by-step instructions on how to apply the recommended treatment, including dosage and safety precautions. If you identify an insect pest, also describe its lifecycle (e.g., egg, larva, pupa, adult) and, based on the image, try to determine what stage the infestation is in. Format the entire response in a way that is very easy for a farmer to understand.  IMPORTANT: Provide the diagnosis and remedy in ${languageName} language only. Use simple language. Use markdown to highlight key terms, such as the names of pests/diseases and the recommended treatments, by making them bold (e.g., **Aphids** or **Neem Oil**).` };

            // Helper for retrying on 503
            const generateWithRetry = async (maxRetries = 3) => {
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        return await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: [
                                {
                                    role: 'user',
                                    parts: [textPart, imagePart]
                                }
                            ],
                            config: {
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
                throw new Error("Failed after corrections"); // Should likely not reach here
            };

            const response = await generateWithRetry();

            // Handle response safely
            let responseText = "";
            try {
                if (response && typeof response.text === 'function') {
                    responseText = response.text();
                } else if (response && (response as any).text) {
                    responseText = (response as any).text;
                }
            } catch (textErr) {
                console.warn("Could not retrieve text via function, checking generic prop", textErr);
                // Fallback if the SDK structure is different
                if (response && (response as any).text) {
                    responseText = String((response as any).text);
                }
            }

            if (!responseText) {
                throw new Error("Empty response from AI model.");
            }

            setAiResponse(responseText);

        } catch (err) {
            console.error("Gemini API error:", err);
            const rawError = err instanceof Error ? err.message : String(err);
            setError(`Failed to analyze: ${rawError}`);
            showToast(`Error: ${rawError}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        stopCameraStream();
        setImageSrc(null);
        setAiResponse(null);
        setError(null);
        setShowCamera(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    const CameraView = () => (
        <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-4">
                <Button onClick={captureImage} className="w-auto px-4 py-2 !rounded-full">{t('capture')}</Button>
                <Button onClick={() => setShowCamera(false)} variant="secondary" className="w-auto px-4 py-2 !rounded-full">{t('cancel')}</Button>
            </div>
        </div>
    );

    const SelectionView = () => (
        <div className="w-full aspect-square bg-neutral-100 dark:bg-neutral-700 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-500 text-center p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-4">{t('getInstantCropAnalysis')}</p>
            <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div className="space-y-3 w-full max-w-xs">
                <Button onClick={startCamera}>{t('useCamera')}</Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary">{t('uploadImageOrVideo')}</Button>
            </div>
        </div>
    );

    const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return (
            <div className="whitespace-pre-wrap font-sans text-neutral-700 dark:text-neutral-200">
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold text-neutral-900 dark:text-white">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen">
            <Header title={t('aiCropScan')} onBack={goBack} />
            <div className="flex-grow overflow-y-auto p-4 space-y-4 hide-scrollbar">
                {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-center">{error}</div>}

                {showCamera ? <CameraView /> : (
                    imageSrc ? (
                        <div className="w-full aspect-square bg-black rounded-lg overflow-hidden relative">
                            <img
                                src={imageSrc}
                                alt="Crop preview"
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                    const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";
                                    const target = e.currentTarget as HTMLImageElement;
                                    if (target.src !== fallback) target.src = fallback;
                                }}
                            />
                        </div>
                    ) : isProcessingVideo ? (
                        <div className="w-full aspect-square bg-neutral-100 dark:bg-neutral-700 rounded-lg flex flex-col items-center justify-center text-center p-4">
                            <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 font-semibold text-neutral-700 dark:text-neutral-300">{t('processing')}</p>
                        </div>
                    ) : (
                        <SelectionView />
                    )
                )}

                <div className="flex space-x-2">
                    {imageSrc && !isLoading && (
                        <Button onClick={handleAnalyze} disabled={isLoading} className="flex-grow">
                            {isLoading ? t('analyzing') : t('analyzeCrop')}
                        </Button>
                    )}
                    {(imageSrc || aiResponse) && !isLoading && (
                        <Button onClick={reset} variant="secondary" className="w-auto px-4">{t('clear')}</Button>
                    )}
                </div>

                {isLoading && (
                    <div className="text-center p-8">
                        <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 font-semibold text-neutral-700 dark:text-neutral-300">{t('aiAnalyzingImage')}</p>
                    </div>
                )}

                {aiResponse && (
                    <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                        <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">{t('aiAnalysisReport')}</h3>
                        <MarkdownRenderer text={aiResponse} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiScanScreen;
