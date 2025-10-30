"use client";

import React from "react";
import { Layout as AntLayout } from "antd";
import Header from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import SidebarLecturer from "@/components/layout/SidebarLecturer";
const { Content } = AntLayout;

interface LecturerLayoutProps {
  children: React.ReactNode;
}

export default function LecturerLayout({ children }: LecturerLayoutProps) {
  return (
    <AntLayout className="app-layout">
      <Header />
      <AntLayout
        className="sticky-container"
        style={{
          overflow: "visible !important",
        }}
      >
        <SidebarLecturer />
        <Content className="app-content">{children}</Content>
      </AntLayout>
      <Footer />
    </AntLayout>
  );
}
