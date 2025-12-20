import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { NavItemConfig } from './BottomNav';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    navItems: NavItemConfig[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, navItems }) => {
    const { t } = useLanguage();

    return (
        <aside className="hidden md:flex flex-col w-64 bg-green-800 dark:bg-green-900 border-r border-green-900 dark:border-neutral-800 h-screen fixed left-0 top-0 pt-16 z-40">
            <div className="flex flex-col flex-1 px-2 space-y-1 mt-4">
                {navItems.map((item) => {
                    const isActive = activeTab === item.name;
                    return (
                        <button
                            key={item.name}
                            onClick={() => item.onClick ? item.onClick() : setActiveTab(item.name)}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 w-full text-left ${isActive
                                ? 'bg-green-700 text-white font-medium shadow-sm'
                                : 'text-green-100 hover:bg-green-700/50 hover:text-white'
                                }`}
                        >
                            <span className={isActive ? 'text-primary' : 'text-gray-500'}>
                                {item.icon}
                            </span>
                            <span className="text-sm">{t(item.name)}</span>
                        </button>
                    );
                })}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
                <p className="text-xs text-center text-gray-400">AgriRent v1.0</p>
            </div>
        </aside>
    );
};

export default Sidebar;
