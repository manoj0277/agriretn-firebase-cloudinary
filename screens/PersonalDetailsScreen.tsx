import React, { useMemo, useRef } from 'react';
import Header from '../components/Header';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { AppView, User } from '../types';
import { uploadImage } from '../src/lib/upload';

interface PersonalDetailsScreenProps {
  goBack: () => void;
  navigate: (view: AppView) => void;
}

const PersonalDetailsScreen: React.FC<PersonalDetailsScreenProps> = ({ goBack, navigate }) => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const rows = useMemo(() => ([
    { key: 'name', label: t('fullName') || 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: t('phone') || 'Phone' },
    { key: 'age', label: t('age') || 'Age' },
    { key: 'gender', label: t('gender') || 'Gender' },
    { key: 'location', label: t('location') || 'Location' },
  ]), [t]);

  const DetailItem: React.FC<{ k: string; label: string; value?: string | number }> = ({ k, label, value }) => (
    <div className="py-3 flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="text-gray-800">{value || t('notSet') || 'Not set'}</p>
      </div>
    </div>
  );

  return (
    <div>
      <Header title={t('personalDetails') || 'Personal Details'} onBack={goBack}>
        <button
          onClick={() => navigate({ view: 'EDIT_DETAILS' })}
          className="p-2 rounded hover:bg-gray-100"
          aria-label="Edit All"
          title={t('edit') || 'Edit'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 3.487a2.25 2.25 0 013.182 3.182L8.25 18.562 4.5 19.5l.938-3.75 11.424-12.263z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 7.5L16.5 4.5" />
          </svg>
        </button>
      </Header>
      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <img
              src={user?.profilePicture}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== fallback) target.src = fallback;
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-white border border-gray-200 shadow hover:bg-gray-100"
              aria-label="Edit Profile Picture"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 3.487a2.25 2.25 0 013.182 3.182L8.25 18.562 4.5 19.5l.938-3.75 11.424-12.263z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 7.5L16.5 4.5" />
              </svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !user) return;
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
                const allowedExt = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
                const hasAllowedType = allowedTypes.includes(file.type);
                const nameLower = file.name.toLowerCase();
                const hasAllowedExt = allowedExt.some(ext => nameLower.endsWith(ext));
                if (!hasAllowedType && !hasAllowedExt) { showToast('Please upload an image (jpg, jpeg, png, heic).', 'error'); e.target.value = ''; return; }

                try {
                  showToast('Uploading...', 'info');
                  const url = await uploadImage(file);
                  await updateUser({ ...user, profilePicture: url });
                  showToast('Profile picture updated.', 'success');
                } catch (error) {
                  console.error(error);
                  showToast('Failed to upload image.', 'error');
                }
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <div className="space-y-2 divide-y divide-gray-200">
          {rows.map(r => (
            <DetailItem key={r.key} k={r.key} label={r.label} value={(user as any)?.[r.key]} />
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={goBack}>{t('back') || 'Back'}</Button>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetailsScreen;