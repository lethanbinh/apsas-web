import { Metadata } from 'next';
import { redirect } from 'next/navigation';
export const metadata: Metadata = {
  title: 'APSAS Web - Login',
  description: 'Please login to continue',
};
export default function HomePage() {
  redirect('/login');
}