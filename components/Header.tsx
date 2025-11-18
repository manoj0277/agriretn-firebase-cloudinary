import React from 'react';

interface HeaderProps {
    title: string;
    onBack?: () => void;
    children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, onBack, children }) => {
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
                {children}
            </div>
        </header>
    );
};

export default Header;