import React, { ReactNode } from 'react';
import BottomNav, { NavItemConfig } from './BottomNav';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
    children: ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    navItems: NavItemConfig[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab, navItems }) => {
    return (
        <div className="min-h-screen bg-green-50 dark:bg-neutral-950">
            {/* Desktop Sidebar - Hidden on Mobile */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} navItems={navItems} />

            {/* Main Content Area */}
            <main className="md:pl-64 pb-20 md:pb-0 transition-all duration-300">
                {children}
            </main>

            {/* Mobile Bottom Nav - Hidden on Desktop */}
            <div className="md:hidden">
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} navItems={navItems} />
            </div>
        </div>
    );
};

export default DashboardLayout;
