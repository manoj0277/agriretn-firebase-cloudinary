import React from 'react';
import { useToast } from '../context/ToastContext';

const Toast: React.FC = () => {
    const { toast } = useToast();
    const { message, type, visible } = toast;

    if (!visible) {
        return null;
    }

    const baseClasses = 'fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white font-semibold shadow-xl transition-all duration-300 z-[9999]';

    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
    };

    const animationClass = visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5';

    return (
        <div
            className={`${baseClasses} ${typeClasses[type]} ${animationClass}`}
            style={{ zIndex: 99999 }}
            role="alert"
        >
            {message}
        </div>
    );
};

export default Toast;