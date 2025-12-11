import React, { useState } from 'react';
import { AppView } from '../types';
import FarmerView from './FarmerView';
import SupplierView from './SupplierView';
import { useLanguage } from '../context/LanguageContext';

interface NewAgentViewProps {
    navigate: (view: AppView) => void;
}

const NewAgentView: React.FC<NewAgentViewProps> = ({ navigate }) => {
    const { t } = useLanguage();
    // Default to 'farmer' mode as requested ("login as agent farmer")
    const [mode, setMode] = useState<'farmer' | 'supplier'>('farmer');

    const toggleMode = () => {
        setMode(prev => prev === 'farmer' ? 'supplier' : 'farmer');
    };

    return (
        <div className="relative min-h-screen">
            {/* Agent Mode Switcher Bar */}
            {/* Content Area */}
            <div className="relative">
                {mode === 'farmer' ? (
                    <FarmerView navigate={navigate} onSwitchMode={toggleMode} roleBadge="Agent Farmer" />
                ) : (
                    <SupplierView navigate={navigate} onSwitchMode={toggleMode} roleBadge="Agent Supplier" />
                )}
            </div>
        </div>
    );
};

export default NewAgentView;
