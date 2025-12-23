import React, { useState } from 'react';
import { AppView } from '../types';
import FarmerView from './FarmerView';
import SupplierView from './SupplierView';
import { useLanguage } from '../context/LanguageContext';

interface NewAgentViewProps {
    navigate: (view: AppView) => void;
    children?: React.ReactNode;
    currentView?: string;
}

const NewAgentView: React.FC<NewAgentViewProps> = ({ navigate, children, currentView }) => {
    const { t } = useLanguage();
    // Default to 'farmer' mode as requested ("login as agent farmer")
    const [mode, setMode] = useState<'farmer' | 'supplier'>('farmer');

    const toggleMode = () => {
        setMode(prev => prev === 'farmer' ? 'supplier' : 'farmer');
    };

    return (
        <div className="relative min-h-screen bg-green-50 dark:bg-neutral-900">
            {/* Agent Mode Switcher Bar */}
            {/* Content Area */}
            <div className="relative">
                {mode === 'farmer' ? (
                    <FarmerView navigate={navigate} onSwitchMode={toggleMode} roleBadge="Agent Farmer" currentView={currentView}>
                        {children}
                    </FarmerView>
                ) : (
                    <SupplierView navigate={navigate} onSwitchMode={toggleMode} roleBadge="Agent Supplier" currentView={currentView}>
                        {children}
                    </SupplierView>
                )}
            </div>
        </div>
    );
};

export default NewAgentView;
