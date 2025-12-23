"use client";
import { Footer } from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ExaminerSidebar from "@/components/sidebar/ExaminerSidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { Layout as AntLayout } from "antd";
import React from "react";
const { Content } = AntLayout;
interface ExaminerLayoutProps {
  children: React.ReactNode;
}
export default function ExaminerLayout({
  children,
}: ExaminerLayoutProps) {
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
          <ExaminerSidebar />
          <Content className="app-content">{children}</Content>
        </AntLayout>
        <Footer />
      </AntLayout>
    </SidebarProvider>
  );
}