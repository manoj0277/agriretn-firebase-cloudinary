import React, { useMemo, useRef, useState, useEffect } from 'react';
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

  // KYC State
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycDocs, setKycDocs] = useState<any[]>([]);

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
        } else {
          setKycStatus(null);
          setKycDocs([]);
        }
      } catch (error) {
        console.error('Failed to fetch KYC status:', error);
        setKycStatus(null);
      }
    };

    fetchKycStatus();
    // Poll every 10 seconds (optional, but good for UX)
    const interval = setInterval(fetchKycStatus, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const reuploadNeeded = kycDocs.some(d => d.status === 'ReuploadRequested');
  const reuploadDocs = kycDocs.filter(d => d.status === 'ReuploadRequested').map(d => d.type).join(', ');

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
    <div className="bg-green-50 dark:bg-neutral-900 min-h-screen">
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
            {user?.isVerifiedAccount && (
              <div className="absolute top-0 right-0 bg-white rounded-full p-1 shadow-md z-10">
                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
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

        {/* Supplier KYC Section */}
        {user?.role === 'Supplier' && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Supplier KYC</h3>

            {kycStatus === 'Approved' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Successfully Verified
                </p>
                <p className="text-xs text-green-700 mt-1">Your KYC is approved. You can now add listings.</p>
              </div>
            )}

            {reuploadNeeded && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Action Required
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Please re-upload: <b>{reuploadDocs}</b>
                </p>
              </div>
            )}

            {!reuploadNeeded && (kycStatus === 'Pending' || kycStatus === 'Submitted') && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Pending - Admin Verifying
                </p>
                <p className="text-xs text-yellow-700 mt-1">Your KYC submission is under review.</p>
              </div>
            )}

            {kycStatus === 'Rejected' && !reuploadNeeded && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  KYC Rejected
                </p>
                <p className="text-xs text-red-700 mt-1">Please re-upload your documents.</p>
              </div>
            )}

            <div className="space-y-2">
              {!kycStatus && (
                <p className="text-sm text-gray-600">Please complete KYC to enable Listings.</p>
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


      </div>
    </div >
  );
};

export default PersonalDetailsScreen;