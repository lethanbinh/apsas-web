/**
 * Settings page
 */

import { Metadata } from 'next';
import SettingsForm from './SettingsForm';

export const metadata: Metadata = {
  title: 'Cài đặt - APSAS Web',
  description: 'Cài đặt ứng dụng',
};

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <SettingsForm />
    </div>
  );
}
