

"use client";

import { useAuth } from "@/hooks/useAuth";
import { Layout as AntLayout } from "antd";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HeaderAdmin } from "./HeaderAdmin";
import LayoutAdmin from "./LayoutAdmin";
import { SidebarProvider } from "./SidebarContext";

const { Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = user?.role;
  const isProfilePage = pathname === "/profile";

  if (!mounted) {
    return (
      <SidebarProvider>
        <AntLayout className="app-layout">
          <Header />
          <Content className="app-content">{children}</Content>
          <Footer />
        </AntLayout>
      </SidebarProvider>
    );
  }

  if (isProfilePage) {
    return (
      <SidebarProvider>
        <AntLayout className="app-layout">
          {role === 0 ? (
            <>
              <HeaderAdmin />
              <Content className="app-content">{children}</Content>
            </>
          ) : (
            <>
              <Header />
              <Content className="app-content">{children}</Content>
            </>
          )}
          <Footer />
        </AntLayout>
      </SidebarProvider>
    );
  }

  if (role === 0) {
    return <LayoutAdmin>{children}</LayoutAdmin>;
  }
  return (
    <SidebarProvider>
      <AntLayout className="app-layout">
        <Header />
        <Content className="app-content">{children}</Content>
        <Footer />
      </AntLayout>
    </SidebarProvider>
  );
};