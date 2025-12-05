import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminAlert } from '../context/AdminAlertContext';
import { AppView } from '../types';

interface HeaderProps {
    title: string;
    onBack?: () => void;
    children?: React.ReactNode;
    navigate?: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ title, onBack, children, navigate }) => {
    const { user } = useAuth();
    const { unreadCount } = useAdminAlert();

    return (
        <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex items-center h-16">
            {onBack && (
                <button onClick={onBack} className="mr-2 text-primary p-2 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}
            <h1 className="text-xl font-bold text-gray-800 flex-grow">{title}</h1>
            <div className="flex items-center space-x-2">
                {user?.role === 'Admin' && navigate && (
                    <button
                        onClick={() => navigate({ view: 'ADMIN_ALERTS' })}
                        className="relative p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors mr-2"
                        title="Admin Alerts"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                            </span>
                        )}
                    </button>
                )}
                {children}
            </div>
        </header>
    );
};

export default Header;