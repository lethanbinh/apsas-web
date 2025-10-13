/**
 * Register page
 */

import { Metadata } from 'next';
import { RegisterForm } from '@/components/features/RegisterForm';

export const metadata: Metadata = {
  title: 'Đăng ký - APSAS Web',
  description: 'Tạo tài khoản mới trên APSAS Web',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
