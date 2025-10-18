import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'APSAS Web - Đăng nhập',
  description: 'Vui lòng đăng nhập để tiếp tục',
};

export default function HomePage() {
  // Redirect to login page
  redirect('/login');
}
