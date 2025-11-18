import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';

type Theme = 'light' | 'dark';

interface SettingsContextType {
    theme: Theme;
    toggleTheme: () => void;
    ruralMode: boolean;
    toggleRuralMode: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('agrirent-theme');
        return (storedTheme as Theme) || 'light';
    });
    const [ruralMode, setRuralMode] = useState<boolean>(() => {
        return localStorage.getItem('agrirent-rural-mode') === 'true';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('agrirent-theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.toggle('rural', ruralMode);
        localStorage.setItem('agrirent-rural-mode', String(ruralMode));
    }, [ruralMode]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };
    const toggleRuralMode = () => {
        setRuralMode(prev => !prev);
    };
    
    const value = useMemo(() => ({ theme, toggleTheme, ruralMode, toggleRuralMode }), [theme, ruralMode]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};