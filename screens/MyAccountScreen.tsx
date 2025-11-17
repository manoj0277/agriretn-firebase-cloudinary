
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
}

const MyAccountScreen: React.FC<MyAccountScreenProps> = ({ goBack }) => {
    const { user, updateUser, changePassword } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);

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

                {isEditing ? (
                    <div className="space-y-4">
                        <Input label={t('fullName')} value={name} onChange={(e) => setName(e.target.value)} />
                        <Input label={t('age')} type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                        <Input label={t('phoneNumber')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} />
                        <div>
                            <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('gender')}</label>
                            <select value={gender} onChange={e => setGender(e.target.value as any)} className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                                <option>Prefer not to say</option>
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
