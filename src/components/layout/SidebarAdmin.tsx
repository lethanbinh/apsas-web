"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Input, Menu } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  DashboardOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import styles from "./SidebarAdmin.module.css";

const { Sider } = Layout;
const { Search } = Input;

// --- Giữ nguyên các mục menu (như bản gốc) ---
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
  {
    key: "/admin/app-download",
    icon: <DownloadOutlined />,
    label: <Link href="/admin/app-download">App Download</Link>,
  },
];

export default function SidebarAdmin() {
  const pathname = usePathname();

  // --- Tìm menu đang active ---
  const activeKey = useMemo(() => {
    const sortedKeys = [...menuItems].sort(
      (a, b) => b.key.length - a.key.length
    );
    const match = sortedKeys.find((item) => pathname.startsWith(item.key));
    return match ? match.key : "";
  }, [pathname]);

  return (
    <Sider width={280} className={styles.sider}>
      <div className={styles.siderContent}>
        <Search
          placeholder="Search..."
          prefix={<FileTextOutlined />}
          className={styles.searchBar}
        />

        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          className={styles.menu}
          items={menuItems}
        />
      </div>
    </Sider>
  );
}
