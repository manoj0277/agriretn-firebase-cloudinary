

import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback } from 'react';
import { translations, TranslationKey } from '../translations';

type Language = 'en' | 'hi' | 'te';

interface LanguageContextType {
    language: Language;
    changeLanguage: (lang: Language) => void;
    t: (key: TranslationKey, placeholders?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        const storedLang = localStorage.getItem('agrirent-language');
        return (storedLang as Language) || 'en';
    });

    const changeLanguage = useCallback((lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('agrirent-language', lang);
    }, []);

    const t = useCallback((key: TranslationKey, placeholders?: Record<string, string | number>): string => {
        let translation = translations[key]?.[language] || translations[key]?.['en'];
        if (!translation) {
            console.warn(`Translation key "${key}" not found.`);
            return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        }
        if (placeholders) {
            Object.keys(placeholders).forEach(pKey => {
                translation = translation.replace(new RegExp(`{{${pKey}}}`, 'g'), String(placeholders[pKey]));
            });
        }
        return translation;
    }, [language]);

    const value = useMemo(() => ({ language, changeLanguage, t }), [language, changeLanguage, t]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
