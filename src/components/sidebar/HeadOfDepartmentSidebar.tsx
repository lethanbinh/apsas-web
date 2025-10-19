// Tên file: components/sidebar/HeadOfDepartmentSidebar.tsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Input, Menu, Switch } from "antd";
import {
  SearchOutlined,
  FileTextOutlined, // Icon cho Semester plans
  BarChartOutlined, // Icon cho Approval
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import styles from "./StudentSidebar.module.css";

const { Sider } = Layout;
const { Search } = Input;

// --- ĐÃ CẬP NHẬT MENU ITEMS ---
const menuItems = [
  {
    key: "/hod/semester-plans",
    icon: <FileTextOutlined />,
    label: <Link href="/hod/semester-plans">Semester plans</Link>,
  },
  {
    key: "/hod/approval",
    icon: <BarChartOutlined />,
    label: <Link href="/hod/approval">Approval</Link>,
  },
];
// --- KẾT THÚC CẬP NHẬT ---

export default function HeadOfDepartmentSidebar() {
  const [theme, setTheme] = useState("light");
  const pathname = usePathname();

  // Logic tìm activeKey (giữ nguyên)
  const activeKey = useMemo(() => {
    const sortedKeys = [...menuItems].sort(
      (a, b) => b.key.length - a.key.length
    );
    const matchingKey = sortedKeys.find((item) =>
      pathname.startsWith(item.key)
    );
    return matchingKey ? matchingKey.key : "";
  }, [pathname]);

  const onThemeChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <Sider width={280} className={styles.sider}>
      <div className={styles.siderContent}>
        <Search
          placeholder="Search..."
          prefix={<SearchOutlined />}
          className={styles.searchBar}
        />

        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          className={styles.menu}
          items={menuItems} // Dùng menu items mới
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
