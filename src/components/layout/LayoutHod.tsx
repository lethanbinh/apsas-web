import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import HeadOfDepartmentSidebar from '@/components/sidebar/HeadOfDepartmentSidebar';

interface LayoutHodProps {
  children: React.ReactNode;
}

const LayoutHod: React.FC<LayoutHodProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <HeadOfDepartmentSidebar />
        <main className="flex-1 p-8 bg-gray-50">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default LayoutHod;

