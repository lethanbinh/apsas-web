"use client";

import React, { useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Menu } from "antd";
import {
  TeamOutlined,
  DashboardOutlined,
  DownloadOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useSidebar } from "./SidebarContext";
import styles from "./SidebarAdmin.module.css";

const { Sider } = Layout;


const menuItems = [
  {
    key: "/admin/manage-users",
    icon: <TeamOutlined />,
    label: <Link href="/admin/manage-users">Manage users</Link>,
  },
  {
    key: "/admin/dashboard",
    icon: <DashboardOutlined />,
    label: <Link href="/admin/dashboard">Dashboard</Link>,
  },






];

export default function SidebarAdmin() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const activeKey = useMemo(() => {
    const sortedKeys = [...menuItems].sort(
      (a, b) => b.key.length - a.key.length
    );
    const match = sortedKeys.find((item) => pathname.startsWith(item.key));
    return match ? match.key : "";
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest(`.${styles.sider}`) && !target.closest('.ant-menu')) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={close} />}
      <Sider 
        width={280} 
        className={`${styles.sider} ${isOpen ? styles.mobileOpen : ''}`}
      >
      <div className={styles.siderContent}>
          <div className={styles.sidebarHeader}>
            <button className={styles.closeButton} onClick={close} aria-label="Close sidebar">
              <CloseOutlined />
            </button>
          </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          className={styles.menu}
          items={menuItems}
            onClick={close}
        />
      </div>
    </Sider>
    </>
  );
}
