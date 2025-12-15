"use client";

import React from "react";
import { Layout as AntLayout } from "antd";
import Header from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import SidebarLecturer from "@/components/layout/SidebarLecturer";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { usePathname } from "next/navigation";
const { Content } = AntLayout;

interface LecturerLayoutProps {
  children: React.ReactNode;
}

export default function LecturerLayout({ children }: LecturerLayoutProps) {
  const pathname = usePathname();


  const pagesWithoutSidebar = [
    "/lecturer/tasks",
    "/lecturer/my-grading-group",
    "/lecturer/grading-group",
    "/lecturer/approval",
  ];

  const shouldShowSidebar = !pagesWithoutSidebar.some(path =>
    pathname.startsWith(path)
  );

  return (
    <SidebarProvider>
      <AntLayout className="app-layout">
        <Header />
        <AntLayout
          className="sticky-container"
          style={{
            overflow: "visible !important",
          }}
        >
          {shouldShowSidebar && <SidebarLecturer />}
          <Content className="app-content">{children}</Content>
        </AntLayout>
        <Footer />
      </AntLayout>
    </SidebarProvider>
  );
}
