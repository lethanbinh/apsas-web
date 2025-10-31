"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Input, Menu, Switch } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  DashboardOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import styles from "./SidebarAdmin.module.css";

const { Sider } = Layout;
const { Search } = Input;

// --- Giữ nguyên các mục menu (như bản gốc) ---
const menuItems = [
  {
    key: "/admin/dashboard",
    icon: <DashboardOutlined />,
    label: <Link href="/admin/dashboard">Dashboard</Link>,
  },
  {
    key: "/admin/manage-users",
    icon: <TeamOutlined />,
    label: <Link href="/admin/manage-users">Manage users</Link>,
  },
];

export default function SidebarAdmin() {
  const [theme, setTheme] = useState("light");
  const pathname = usePathname();

  // --- Tìm menu đang active ---
  const activeKey = useMemo(() => {
    const sortedKeys = [...menuItems].sort(
      (a, b) => b.key.length - a.key.length
    );
    const match = sortedKeys.find((item) => pathname.startsWith(item.key));
    return match ? match.key : "";
  }, [pathname]);

  const onThemeChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
    console.log("Dark mode toggled:", checked);
  };

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

      <div className={styles.themeToggle}>
        <SunOutlined />
        <span className={styles.themeLabel}>Light mode</span>
        <Switch
          checked={theme === "dark"}
          onChange={onThemeChange}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          className={styles.themeSwitch}
        />
      </div>
    </Sider>
  );
}
