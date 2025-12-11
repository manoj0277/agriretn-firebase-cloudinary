import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FALLBACK_IMAGE, onImgErrorSetFallback } from '../utils/imageFallback';
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
    const { t } = useLanguage();

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
                setError("Could not process video file.");
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
            setError("Could not access camera. Please check permissions.");
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
            setError("Please select an image first.");
            return;
        }
        if (!ai) {
            setError("AI service is not configured. Missing API Key.");
            showToast("AI service is not configured", "error");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAiResponse(null);

        try {
            const mimeType = imageSrc.split(';')[0].split(':')[1];
            const base64Data = imageSrc.split(',')[1];

            const imagePart = { inlineData: { mimeType, data: base64Data } };
            const textPart = { text: "You are an expert agronomist. Analyze the attached image of a plant. Identify any pests, diseases, or nutritional deficiencies. Provide a detailed remedy including: 1. A clear diagnosis of the problem. 2. A list of suggested organic and chemical pesticides or treatments. 3. Step-by-step instructions on how to apply the recommended treatment, including dosage and safety precautions. Format the entire response in a way that is very easy for a farmer to understand. Use simple language and markdown for structure (headings, bold text, lists)." };


            // Helper for retrying on 503
            const generateWithRetry = async (maxRetries = 3) => {
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        return await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: { parts: [imagePart, textPart] },
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
                throw new Error("Failed after corrections");
            };

            const response = await generateWithRetry();

            let responseText = "";
            try {
                // Use robust extraction with any cast to avoid TS issues
                const r = response as any;
                if (typeof r.text === 'function') {
                    responseText = r.text();
                } else if (r.text) {
                    responseText = r.text;
                }
            } catch (textErr) {
                console.warn("Could not retrieve text via function, checking generic prop", textErr);
                if ((response as any).text) {
                    responseText = String((response as any).text);
                }
            }

            if (!responseText) {
                throw new Error("Empty response from AI model.");
            }
            setAiResponse(responseText);

        } catch (err) {
            console.error("Gemini API error:", err);
            setError("Failed to analyze the image. Please try again.");
            showToast("Analysis failed. Please try again.", "error");
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
                <Button onClick={captureImage} className="w-auto px-4 py-2 !rounded-full">Capture</Button>
                <Button onClick={() => setShowCamera(false)} variant="secondary" className="w-auto px-4 py-2 !rounded-full">{t('cancel')}</Button>
            </div>
        </div>
    );

    const SelectionView = () => (
        <div className="w-full aspect-video bg-white dark:bg-neutral-800 rounded-lg flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">AI Crop Doctor</h2>
            <p className="text-neutral-600 dark:text-neutral-300 mt-1 mb-6">Get an instant diagnosis for your crops.</p>
            <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div className="flex space-x-4">
                <button onClick={startCamera} className="flex flex-col items-center space-y-2 p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">Use Camera</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center space-y-2 p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">Upload File</span>
                </button>
            </div>
        </div>
    );

    const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
        const sections = text.split(/(\n#+\s.*)/).filter(Boolean); // Split by markdown headers
        return (
            <div className="space-y-4 text-neutral-700 dark:text-neutral-300">
                {text.split('\n').map((line, i) => {
                    if (line.startsWith('### ')) return <h4 key={i} className="text-md font-bold text-neutral-800 dark:text-neutral-100 pt-2">{line.substring(4)}</h4>
                    if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-bold text-neutral-800 dark:text-neutral-100 pt-3 border-t dark:border-neutral-600">{line.substring(3)}</h3>
                    if (line.startsWith('# ')) return <h2 key={i} className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{line.substring(2)}</h2>
                    if (line.startsWith('* ')) return <li key={i} className="ml-5 list-disc">{line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
                    line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-neutral-900 dark:text-white">$1</strong>');
                    return <p key={i} dangerouslySetInnerHTML={{ __html: line }} />
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
                                src={imageSrc || FALLBACK_IMAGE}
                                alt="Crop preview"
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                onError={onImgErrorSetFallback}
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
                            {isLoading ? t('analyzing') : 'Analyze Crop'}
                        </Button>
                    )}
                    {(imageSrc || aiResponse || showCamera) && !isLoading && (
                        <Button onClick={reset} variant="secondary" className="w-auto px-4">Clear</Button>
                    )}
                </div>

                {isLoading && (
                    <div className="text-center p-8">
                        <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 font-semibold text-neutral-700 dark:text-neutral-300">AI is analyzing your image...</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">This may take a moment.</p>
                    </div>
                )}

                {aiResponse && (
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-4 pb-3 border-b dark:border-neutral-700">AI Analysis Report</h2>
                        <MarkdownRenderer text={aiResponse} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiScanScreen;