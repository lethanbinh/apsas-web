import React from 'react';
import { HeaderAdmin } from './HeaderAdmin'; // Import HeaderAdmin
import SidebarAdmin from './SidebarAdmin';   // Import SidebarAdmin
import { Footer } from './Footer'; // Assuming a shared Footer is still used, adjust if not.

interface LayoutAdminProps {
  children: React.ReactNode;
}

const LayoutAdmin: React.FC<LayoutAdminProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <HeaderAdmin /> {/* Use HeaderAdmin */}
      <div className="flex flex-1">
        <SidebarAdmin /> {/* Use SidebarAdmin */}
        <main className="flex-1 p-8 bg-gray-50">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default LayoutAdmin;
