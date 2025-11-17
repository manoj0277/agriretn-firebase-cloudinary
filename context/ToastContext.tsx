import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
    message: string;
    type: ToastType;
    visible: boolean;
}

interface ToastContextType {
    toast: ToastState;
    showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false });

    const showToast = useCallback((message: string, type: ToastType) => {
        setToast({ message, type, visible: true });
        setTimeout(() => {
            setToast(t => ({ ...t, visible: false }));
        }, 3000);
    }, []);

    const value = useMemo(() => ({ toast, showToast }), [toast, showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};