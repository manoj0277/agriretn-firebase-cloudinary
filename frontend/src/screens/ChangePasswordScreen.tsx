import React, { useState } from 'react';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ChangePasswordScreenProps {
  goBack: () => void;
}

const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ goBack }) => {
  const { changePassword } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    const ok = await changePassword(currentPassword, newPassword);
    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      goBack();
    }
  };

  return (
    <div className="dark:text-neutral-200">
      <Header title="Change Password" onBack={goBack} />
      <div className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          <div className="flex gap-2">
            <Button type="submit">Update Password</Button>
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordScreen;