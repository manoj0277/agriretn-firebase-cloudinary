

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
}

const MyAccountScreen: React.FC<MyAccountScreenProps> = ({ goBack }) => {
    const { user, updateUser, changePassword } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [imageError, setImageError] = useState(false);

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
            setImageError(false);
        }
    }, [user, isEditing]);

    const handleSaveChanges = () => {
        if (!user) return;

        const updatedUser: User = {
            ...user,
            name,
            age: age ? parseInt(age) : undefined,
            gender,
            location,
            profilePicture,
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
        changePassword(currentPassword, newPassword).then(success => {
            if (success) {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        });
    };

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
                    {isEditing && (
                        <div className="w-full">
                            <Input label={t('profilePictureURL')} value={profilePicture} onChange={(e) => setProfilePicture(e.target.value)} />
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-4">
                        <Input label={t('fullName')} value={name} onChange={(e) => setName(e.target.value)} />
                        <Input label={t('age')} type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                        <Input label={t('phoneNumber')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled />
                        <div>
                            <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('gender')}</label>
                            <select value={gender} onChange={e => setGender(e.target.value as any)} className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50">
                                <option value="Male">{t('male')}</option>
                                <option value="Female">{t('female')}</option>
                                <option value="Other">{t('other')}</option>
                                <option value="Prefer not to say">{t('preferNotToSay')}</option>
                            </select>
                        </div>
                        <Input label={t('location')} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hyderabad, Telangana" />
                        <div className="flex space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsEditing(false)}>{t('cancel')}</Button>
                            <Button onClick={handleSaveChanges}>{t('saveChanges')}</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 divide-y divide-neutral-200 dark:divide-neutral-700">
                        <DetailItem label={t('fullName')} value={user?.name} />
                        <DetailItem label={t('email')} value={user?.email} />
                        <DetailItem label={t('phoneNumber')} value={user?.phone} />
                        <DetailItem label={t('age')} value={user?.age} />
                        <DetailItem label={t('gender')} value={user?.gender} />
                        <DetailItem label={t('location')} value={user?.location} />
                        <div className="pt-4">
                            <Button onClick={() => setIsEditing(true)}>{t('editProfile')}</Button>
                        </div>
                    </div>
                )}

                <div className="border-t dark:border-neutral-700 pt-6">
                     <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-4">{t('changePassword')}</h3>
                     <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <Input label={t('currentPassword')} type="password" placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                        <Input label={t('newPassword')} type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                        <Input label={t('confirmNewPassword')} type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                        <Button type="submit">{t('updatePassword')}</Button>
                     </form>
                </div>
            </div>
        </div>
    );
};
export default MyAccountScreen;
