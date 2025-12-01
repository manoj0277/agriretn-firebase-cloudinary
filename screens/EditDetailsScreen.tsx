import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { useToast } from '../context/ToastContext';
import { uploadImage } from '../src/lib/upload';

interface EditDetailsScreenProps {
  goBack: () => void;
}

const EditDetailsScreen: React.FC<EditDetailsScreenProps> = ({ goBack }) => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Prefer not to say');
  const [location, setLocation] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAge(user.age?.toString() || '');
      setGender(user.gender || 'Prefer not to say');
      setLocation(user.location || '');
      setProfilePicture(user.profilePicture || '');
    }
  }, [user]);

  const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
    const allowedExt = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
    const hasAllowedType = allowedTypes.includes(file.type);
    const nameLower = file.name.toLowerCase();
    const hasAllowedExt = allowedExt.some(ext => nameLower.endsWith(ext));
    if (!hasAllowedType && !hasAllowedExt) {
      showToast('Please upload an image (jpg, jpeg, png, heic).', 'error');
      e.target.value = '';
      return;
    }

    try {
      showToast('Uploading...', 'info');
      const url = await uploadImage(file);
      setProfilePicture(url);
      showToast('Profile picture uploaded.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to upload image.', 'error');
    }
    e.target.value = '';
  };

  const onSave = () => {
    if (!user) return;
    const nameOk = name.trim().length > 0;
    const ageNum = parseInt(age, 10);
    const ageOk = !Number.isNaN(ageNum) && age.trim().length > 0 && ageNum > 0;
    const genderOk = gender !== 'Prefer not to say';
    const locationOk = location.trim().length > 0;
    if (!nameOk || !ageOk || !genderOk || !locationOk) {
      showToast('Please fill all required fields (Name, Age, Gender, Location).', 'error');
      return;
    }
    const updated: User = {
      ...user,
      name,
      age: ageNum,
      gender,
      location,
      profilePicture,
    };
    updateUser(updated);
    goBack();
  };

  return (
    <div className="dark:text-neutral-200">
      <Header title="Edit Details" onBack={goBack} />
      <div className="p-6 space-y-4">
        <Input label="Full Name" required value={name} onChange={e => setName(e.target.value)} />
        <Input label="Age" type="number" required min={1} value={age} onChange={e => setAge(e.target.value)} />
        <div>
          <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">Gender</label>
          <select value={gender} onChange={e => setGender(e.target.value as any)} className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </div>
        <Input label="Location" required value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Hyderabad, Telangana" />
        <div>
          <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">Upload Profile Picture</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
            onChange={onFileChange}
            className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave}>Save Changes</Button>
          <Button variant="secondary" onClick={goBack}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};

export default EditDetailsScreen;