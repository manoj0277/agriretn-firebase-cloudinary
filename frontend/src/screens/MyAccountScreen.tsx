

import React, { useState, useEffect } from 'react';
import { FALLBACK_IMAGE, onImgErrorSetFallback } from '../utils/imageFallback';
import { AppView, User } from '../types';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
 

interface MyAccountScreenProps {
    goBack: () => void;
    navigate: (view: AppView) => void;
}

const MyAccountScreen: React.FC<MyAccountScreenProps> = ({ goBack, navigate }) => {
    const { user, updateUser, changePassword } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [imageError, setImageError] = useState(false);

    // Profile form state
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Prefer not to say');
    const [location, setLocation] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [phone, setPhone] = useState('');
    const [kycStatus, setKycStatus] = useState<string | null>(null);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setAge(user.age?.toString() || '');
            setGender(user.gender || 'Prefer not to say');
            setLocation(user.location || '');
            setProfilePicture(user.profilePicture || '');
            setPhone(user.phone || '');
            setImageError(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        let status: string | null = null;
        try { status = typeof window !== 'undefined' ? localStorage.getItem(`kycStatus:${user.id}`) : null } catch {}
        setKycStatus(status);
    }, [user]);

    const handleSaveChanges = () => {};
    const handleUpdatePassword = (e: React.FormEvent) => { e.preventDefault(); };

    const DetailItem: React.FC<{ label: string, value?: string | number }> = ({ label, value }) => (
        <div className="py-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="text-neutral-800 dark:text-neutral-100">{value || t('notSet')}</p>
        </div>
    );

    return (
        <div className="dark:text-neutral-200">
            <Header title={t('myAccount')} onBack={goBack} />
            <div className="p-6 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                     {profilePicture && !imageError ? (
                        <img 
                            src={profilePicture || FALLBACK_IMAGE} 
                            alt="Profile" 
                            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-neutral-700 shadow-lg"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={onImgErrorSetFallback}
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-4xl font-bold border-4 border-white dark:border-neutral-700 shadow-lg">
                            {name.charAt(0)}
                        </div>
                    )}
                    
                </div>

                <div className="space-y-2 divide-y divide-neutral-200 dark:divide-neutral-700">
                    <div className="pt-2">
                        <span className="text-primary font-semibold cursor-pointer" onClick={() => navigate({ view: 'PERSONAL_DETAILS' })}>Show Personal Details</span>
                    </div>
                </div>

                {user?.role === 'Supplier' && (
                    <div className="mt-4 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-2">Supplier KYC</h3>
                        {(kycStatus === 'Submitted' || kycStatus === 'Pending') && (
                            <p className="text-xs text-yellow-800 bg-yellow-100 rounded-md p-2 mb-2">KYC submitted. Verification pending.</p>
                        )}
                        <div className="space-y-2">
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">Please complete KYC to enable Listings.</p>
                            <Button onClick={() => navigate({ view: 'SUPPLIER_KYC' })}>
                                {(kycStatus === 'Submitted' || kycStatus === 'Pending') ? 'View / Update KYC' : 'Add KYC'}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="border-t dark:border-neutral-700 pt-6">
                     <span className="text-primary font-semibold cursor-pointer" onClick={() => navigate({ view: 'CHANGE_PASSWORD' })}>{t('changePassword')}</span>
                </div>
            </div>
        </div>
    );
};
export default MyAccountScreen;
