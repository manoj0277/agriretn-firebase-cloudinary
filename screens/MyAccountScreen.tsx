
import React, { useState, useEffect } from 'react';
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
    const [isEditing, setIsEditing] = useState(false);
    const [kycStatus, setKycStatus] = useState<string | null>(null);
    const [showKycForm, setShowKycForm] = useState(false);

    // Profile form state
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Prefer not to say');
    const [location, setLocation] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [phone, setPhone] = useState('');

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
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        let status: string | null = null;
        try { status = typeof window !== 'undefined' ? localStorage.getItem(`kycStatus:${user.id}`) : null } catch { }
        setKycStatus(status);
    }, [user]);

    const handleSaveChanges = () => {
        if (!user) return;

        const updatedUser: User = {
            ...user,
            name,
            age: age ? parseInt(age) : undefined,
            gender,
            location,
            profilePicture,
            phone,
        };
        updateUser(updatedUser);
        setIsEditing(false);
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match.', 'error');
            return;
        }
        if (changePassword(currentPassword, newPassword)) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const DetailItem: React.FC<{ label: string, value?: string | number }> = ({ label, value }) => (
        <div className="py-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="text-neutral-800 dark:text-neutral-100">{value || 'Not set'}</p>
        </div>
    );

    return (
        <div className="dark:text-neutral-200">
            <Header title={t('myAccount')} onBack={goBack} />
            <div className="p-6 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                    <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-neutral-700 shadow-lg"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                            const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src !== fallback) target.src = fallback;
                        }}
                    />
                    {isEditing && (
                        <div className="w-full">
                            <Input label={t('profilePictureURL')} value={profilePicture} onChange={(e) => setProfilePicture(e.target.value)} />
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
