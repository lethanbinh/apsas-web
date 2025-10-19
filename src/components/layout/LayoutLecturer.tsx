import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import SidebarLecturer from './SidebarLecturer';

interface LayoutLecturerProps {
  children: React.ReactNode;
}

const LayoutLecturer: React.FC<LayoutLecturerProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <SidebarLecturer />
        <main className="flex-1 p-8 bg-gray-50">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default LayoutLecturer;
