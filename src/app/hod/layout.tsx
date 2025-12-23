"use client";
import { Footer } from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import HeadOfDepartmentSidebar from "@/components/sidebar/HeadOfDepartmentSidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { Layout as AntLayout } from "antd";
import React from "react";
const { Content } = AntLayout;
interface HeadOfDepartmentLayoutProps {
  children: React.ReactNode;
}
export default function HeadOfDepartmentLayout({
  children,
}: HeadOfDepartmentLayoutProps) {
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
          <HeadOfDepartmentSidebar />
          <Content className="app-content">{children}</Content>
        </AntLayout>
        <Footer />
      </AntLayout>
    </SidebarProvider>
  );
}