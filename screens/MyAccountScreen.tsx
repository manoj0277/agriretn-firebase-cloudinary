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
    const [kycDocs, setKycDocs] = useState<any[]>([]);

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
        if (!user || user.role !== 'Supplier') return;

        const fetchKycStatus = async () => {
            try {
                const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
                const res = await fetch(`${apiUrl}/kyc/${user.id}`);
                if (res.ok) {
                    const kycData = await res.json();
                    setKycStatus(kycData.status);
                    setKycDocs(kycData.docs || []);
                    console.log('KYC Status:', kycData.status);
                } else {
                    setKycStatus(null);
                    setKycDocs([]);
                }
            } catch (error) {
                console.error('Failed to fetch KYC status:', error);
                setKycStatus(null);
            }
        };

        // Initial fetch
        fetchKycStatus();

        // Poll every 10 seconds for real-time updates
        const interval = setInterval(fetchKycStatus, 10000);
        return () => clearInterval(interval);
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

    // Check if any documents need re-upload
    const reuploadNeeded = kycDocs.some(d => d.status === 'ReuploadRequested');
    const reuploadDocs = kycDocs.filter(d => d.status === 'ReuploadRequested').map(d => d.type).join(', ');

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

                        {kycStatus === 'Approved' && (
                            <div className="mb-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                <p className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Successfully Verified
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300 mt-1">Your KYC is approved. You can now add listings.</p>
                            </div>
                        )}

                        {reuploadNeeded && (
                            <div className="mb-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Action Required
                                </p>
                                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                    Please re-upload the following documents: <b>{reuploadDocs}</b>
                                </p>
                            </div>
                        )}

                        {!reuploadNeeded && (kycStatus === 'Pending' || kycStatus === 'Submitted') && (
                            <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Pending - Admin Verifying
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Your KYC submission is under review. Please wait for admin approval.</p>
                            </div>
                        )}

                        {kycStatus === 'Rejected' && !reuploadNeeded && (
                            <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                <p className="text-sm font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    KYC Rejected
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-1">Please re-upload your documents with correct information.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            {!kycStatus && (
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">Please complete KYC to enable Listings.</p>
                            )}
                            <Button onClick={() => navigate({ view: 'SUPPLIER_KYC' })}>
                                {kycStatus === 'Approved' ? 'View KYC' :
                                    reuploadNeeded ? 'Re-upload Documents' :
                                        kycStatus === 'Pending' ? 'View KYC Status' :
                                            kycStatus === 'Rejected' ? 'Re-upload KYC' : 'Add KYC'}
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
