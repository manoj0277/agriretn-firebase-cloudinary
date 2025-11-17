

import React from 'react';
import { AppView } from '../types';
import Header from '../components/Header';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';

interface SettingsScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigate, goBack }) => {
    const { theme, toggleTheme } = useSettings();
    const { language, changeLanguage, t } = useLanguage();
    
    // In a real app, these values would come from user preferences storage.
    const [notificationPrefs, setNotificationPrefs] = React.useState({
        bookings: true,
        community: true,
        offers: true,
    });

    const handleToggle = (key: keyof typeof notificationPrefs) => {
        setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const Toggle: React.FC<{ isEnabled: boolean, onToggle: () => void }> = ({ isEnabled, onToggle }) => (
        <button
            onClick={onToggle}
            role="switch"
            aria-checked={isEnabled}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-600'}`}
        >
            <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );

    return (
        <div className="dark:text-neutral-200">
            <Header title={t('settings')} onBack={goBack} />
            <div className="p-6 space-y-8">
                {/* General Settings */}
                <div>
                     <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-2">{t('general')}</h3>
                    <ul className="bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 divide-y divide-neutral-200 dark:divide-neutral-600">
                        <li className="p-4 flex justify-between items-center">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-100">{t('darkMode')}</span>
                            <Toggle isEnabled={theme === 'dark'} onToggle={toggleTheme} />
                        </li>
                        <li className="p-4 flex justify-between items-center">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-100">{t('language')}</span>
                            <select
                                value={language}
                                onChange={(e) => changeLanguage(e.target.value as 'en' | 'hi' | 'te')}
                                className="bg-neutral-100 dark:bg-neutral-600 border border-neutral-300 dark:border-neutral-500 rounded-md p-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-neutral-900 dark:text-neutral-100"
                            >
                                <option value="en">English</option>
                                <option value="hi">हिन्दी (Hindi)</option>
                                <option value="te">తెలుగు (Telugu)</option>
                            </select>
                        </li>
                    </ul>
                </div>
                
                {/* Notification Settings */}
                <div>
                     <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-2">{t('notifications')}</h3>
                     <ul className="bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 divide-y divide-neutral-200 dark:divide-neutral-600">
                        <li className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{t('bookingUpdates')}</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('bookingUpdatesDesc')}</p>
                            </div>
                            <Toggle isEnabled={notificationPrefs.bookings} onToggle={() => handleToggle('bookings')} />
                        </li>
                         <li className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{t('communityAlerts')}</p>
                                 <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('communityAlertsDesc')}</p>
                            </div>
                            <Toggle isEnabled={notificationPrefs.community} onToggle={() => handleToggle('community')} />
                        </li>
                         <li className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{t('promotionalOffers')}</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('promotionalOffersDesc')}</p>
                            </div>
                           <Toggle isEnabled={notificationPrefs.offers} onToggle={() => handleToggle('offers')} />
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;