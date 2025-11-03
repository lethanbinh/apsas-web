/**
 * User profile page
 */

import { Metadata } from 'next';
import ProfileForm from './ProfileForm';

export const metadata: Metadata = {
  title: 'Hồ sơ - APSAS Web',
  description: 'Quản lý hồ sơ cá nhân',
};

export default function ProfilePage() {
  return (
    <div className="profile-page">
      <ProfileForm />
    </div>
  );
}
