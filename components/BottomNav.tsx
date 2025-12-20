

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../translations';

export interface NavItemConfig {
    name: TranslationKey;
    icon: React.ReactElement;
    isCenter?: boolean;
    onClick?: () => void;
}

interface BottomNavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    navItems: NavItemConfig[];
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, navItems }) => {
    const { t } = useLanguage();
    return (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-green-700 border-t border-green-800 z-50 md:hidden">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    if (item.isCenter) {
                        return (
                            <button
                                key={item.name}
                                onClick={item.onClick}
                                className="bg-green-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-green-500 transition-transform transform hover:scale-110 -translate-y-6 z-10 focus:outline-none ring-4 ring-green-50 dark:ring-neutral-900"
                                aria-label={t(item.name)}
                            >
                                {item.icon}
                            </button>
                        );
                    }
                    return (
                        <button
                            key={item.name}
                            onClick={() => setActiveTab(item.name)}
                            className={`flex-1 flex flex-col items-center justify-center h-full text-sm transition-colors duration-200 ${activeTab === item.name ? 'text-white' : 'text-green-200/70 hover:text-white'}`}
                        >
                            {/* Force SVG to inherit color */}
                            {React.cloneElement(item.icon as React.ReactElement, { className: 'h-6 w-6 stroke-current' })}
                            <span className="mt-1">{t(item.name)}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
