"use client";
import React from "react";
import { Layout as AntLayout } from "antd";
import Header from "@/components/layout/Header";
import StudentSidebar from "@/components/sidebar/StudentSidebar";
import { Footer } from "@/components/layout/Footer";
import { SidebarProvider } from "@/components/layout/SidebarContext";
const { Content } = AntLayout;
interface StudentLayoutProps {
  children: React.ReactNode;
}
export default function StudentLayout({ children }: StudentLayoutProps) {
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
        <StudentSidebar />
        <Content className="app-content">{children}</Content>
      </AntLayout>
      <Footer />
    </AntLayout>
    </SidebarProvider>
  );
}