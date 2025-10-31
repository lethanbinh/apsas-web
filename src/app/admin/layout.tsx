"use client";

import React from "react";
import { Layout as AntLayout } from "antd";
import Header from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import SidebarAdmin from "@/components/layout/SidebarAdmin";
const { Content } = AntLayout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AntLayout className="app-layout">
      <Header />
      <AntLayout
        className="sticky-container"
        style={{
          overflow: "visible !important",
        }}
      >
        <SidebarAdmin />
        <Content className="app-content">{children}</Content>
      </AntLayout>
      <Footer />
    </AntLayout>
  );
}
