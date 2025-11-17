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
        const stored = localStorage.getItem('agrirent-rural-mode');
        return stored === 'true';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('agrirent-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };
    const toggleRuralMode = () => {
        setRuralMode(prev => {
            const next = !prev;
            localStorage.setItem('agrirent-rural-mode', String(next));
            return next;
        });
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