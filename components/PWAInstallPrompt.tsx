import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface PWAInstallPromptProps {
    onInstall?: () => void;
    onDismiss?: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onInstall, onDismiss }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const { user } = useAuth();
    const [isIOS, setIsIOS] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isSecureContext, setIsSecureContext] = useState(true);

    useEffect(() => {
        // PWA requires Secure Context (HTTPS or localhost)
        if (!window.isSecureContext) {
            setIsSecureContext(false);
            console.warn('[PWA] Installation blocked: Not a secure context. Use HTTPS.');
        }

        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (isStandalone) {
            console.log('[PWA] App is already installed and running in standalone mode.');
            return;
        }

        const handler = (e: any) => {
            console.log('[PWA] beforeinstallprompt event fired');
            e.preventDefault();
            setDeferredPrompt(e);
            (window as any).deferredPWAPrompt = e;
            setIsInstallable(true);

            // Show prompt automatically after login if not already shown
            if (user && !localStorage.getItem('pwa-prompt-dismissed')) {
                setIsVisible(true);
            }
        };

        // Check if event was already captured globally
        if ((window as any).deferredPWAPrompt) {
            setDeferredPrompt((window as any).deferredPWAPrompt);
            setIsInstallable(true);
            if (user && !localStorage.getItem('pwa-prompt-dismissed')) {
                setIsVisible(true);
            }
        }

        window.addEventListener('beforeinstallprompt', handler);

        // Check for iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIosDevice && !isStandalone && user && !localStorage.getItem('pwa-prompt-dismissed')) {
            setIsIOS(true);
            setIsVisible(true);
            setIsInstallable(true);
        }

        // Auto-show delay for other browsers
        const timer = setTimeout(() => {
            if (user && !isVisible && !localStorage.getItem('pwa-prompt-dismissed')) {
                setIsVisible(true);
            }
        }, 5000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            clearTimeout(timer);
        };
    }, [user, isVisible]);

    const getMessage = () => {
        if (!user) return "Install the app for a better experience!";
        const role = user.role.toLowerCase();
        if (role === UserRole.Farmer.toLowerCase()) return "Going to the field? Install the app to book tractors even when your internet signal is weak. Works offline!";
        if (role === UserRole.Supplier.toLowerCase()) return "Never miss a booking. Install to get loud alerts for new rental requests, even if your screen is locked.";
        if (role === UserRole.Agent.toLowerCase() || role === UserRole.AgentPro.toLowerCase()) return "Work efficiently in the field. Install to manage bookings for your farmers even when offline.";
        return "Install the app for easier access and offline capabilities.";
    };

    const handleInstallClick = async () => {
        const prompt = deferredPrompt || (window as any).deferredPWAPrompt;

        if (prompt) {
            try {
                setIsInstalling(true);
                prompt.prompt();
                const { outcome } = await prompt.userChoice;
                console.log(`[PWA] User response to the install prompt: ${outcome}`);

                if (outcome === 'accepted') {
                    setDeferredPrompt(null);
                    (window as any).deferredPWAPrompt = null;
                    setIsVisible(false);
                    if (onInstall) onInstall();
                } else {
                    setIsInstalling(false);
                }
            } catch (err) {
                console.error('[PWA] Error triggering install:', err);
                setIsInstalling(false);
                setIsIOS(true);
            }
        } else {
            // No native prompt - show the manual guide but keep the button text simple
            setIsIOS(true);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        // Optional: localStorage.setItem('pwa-prompt-dismissed', 'true');
        if (onDismiss) onDismiss();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto" onClick={handleDismiss}></div>

            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-8 pointer-events-auto max-w-sm w-full animate-scale-in relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/20 flex items-center justify-center shadow-inner mb-6">
                            <img src="/bhommihire_logo.png" alt="App Icon" className="w-14 h-14 object-contain scale-110" />
                        </div>

                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Install BhommiHire</h3>
                        <p className="text-base text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium px-2">{getMessage()}</p>

                        {/* Security Warning */}
                        {!isSecureContext && (
                            <div className="mt-4 w-full p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Blocked: Browser requires HTTPS for installation.
                                </p>
                            </div>
                        )}

                        {isIOS && isSecureContext && (
                            <div className="mt-6 w-full p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 animate-fade-in text-left">
                                <p className="text-sm text-primary dark:text-primary-foreground leading-snug">
                                    <span className="font-bold flex items-center gap-1 mb-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        How to Finish Installation:
                                    </span>
                                    {/iPhone|iPad|iPod/.test(navigator.userAgent) ?
                                        <>1. Tap the <span className="font-bold underline italic">Share</span> icon below.<br />2. Scroll down and tap <span className="font-bold underline italic">Add to Home Screen</span>.</> :
                                        <>1. Look for the <span className="font-bold underline italic">Install Icon</span> (⊕) in your browser's address bar.<br />2. Or click the 3 dots (⋮) and select <span className="font-bold underline italic">Install App</span>.</>
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                        <button
                            onClick={handleInstallClick}
                            disabled={isInstalling}
                            className={`w-full py-4 px-6 text-lg font-bold text-white rounded-2xl shadow-xl transition-all transform active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 ${isInstalling ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:-translate-y-1 shadow-green-600/20'}`}
                        >
                            {isInstalling ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Installing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Install Now
                                </>
                            )}
                        </button>
                        <button onClick={handleDismiss} className="w-full py-3 text-sm font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">No thanks, continue to web</button>
                    </div>
                </div>

                <button onClick={handleDismiss} className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
