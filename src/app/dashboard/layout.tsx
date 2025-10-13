/**
 * Dashboard layout
 */

import { Metadata } from 'next';
import { Layout } from '@/components/layout/Layout';
import { Sidebar } from '@/components/layout/Sidebar';
import { AuthGuard } from '@/components/auth/AuthGuard';

export const metadata: Metadata = {
  title: 'Dashboard - APSAS Web',
  description: 'Bảng điều khiển APSAS Web',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAuth={true}>
      <Layout>
        <div className="dashboard-layout">
          <Sidebar />
          <main className="dashboard-content">
            {children}
          </main>
        </div>
      </Layout>
    </AuthGuard>
  );
}
