"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Input, Menu, Switch } from "antd";
import type { MenuProps } from "antd";
import {
  SearchOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  BookOutlined,
  UsergroupAddOutlined,
  FileTextOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import styles from "../sidebar/StudentSidebar.module.css";

const { Sider } = Layout;
const { Search } = Input;

const menuItems: NonNullable<MenuProps["items"]> = [
  {
    key: "/lecturer/info", // Đặt một path (đường dẫn) cho mục Info
    icon: <InfoCircleOutlined />,
    label: <Link href="/lecturer/info">Info</Link>,
  },
  {
    key: "/lecturer/assignments", // Key cha cho sub-menu
    icon: <BarChartOutlined />,
    label: "Assignments",
    children: [
      {
        key: "/lecturer/detail-assignment", // Key con
        label: <Link href="/lecturer/detail-assignment">Assignments 1</Link>,
      },
      {
        key: "/lecturer/assignments-2", // Key con
        label: <Link href="/lecturer/assignments-2">Assignments 2</Link>,
      },
    ],
  },
  {
    key: "/lecturer/grading-history",
    icon: <BookOutlined />,
    label: <Link href="/lecturer/grading-history">Grading history</Link>,
  },
  {
    key: "/lecturer/practical-exam",
    icon: <FileTextOutlined />,
    label: <Link href="/lecturer/practical-exam">Practical exam</Link>,
  },
  {
    key: "/lecturer/tasks",
    icon: <FileTextOutlined />, // Có thể dùng icon khác
    label: <Link href="/lecturer/tasks">Tasks</Link>,
  },
  {
    key: "/lecturer/members", // Đặt một path cho Member list
    icon: <UsergroupAddOutlined />,
    label: <Link href="/lecturer/members">Member list</Link>,
  },
];

// Helper: Lấy tất cả các key (kể cả key con) từ menuItems
const allKeys = menuItems.flatMap((item) => {
  if (item && "children" in item && item.children) {
    return [item.key, ...item.children.map((child) => child.key)];
  }
  return [item.key];
});

export default function SidebarLecturer() {
  const [theme, setTheme] = useState("light");
  const pathname = usePathname();

  // 2. Logic tìm key đang được chọn (selectedKey)
  // Sử dụng logic tương tự như StudentSidebar
  const selectedKey = useMemo(() => {
    const sortedKeys = [...allKeys].sort(
      (a, b) => String(b).length - String(a).length
    );
    const matchingKey = sortedKeys.find((key) =>
      pathname.startsWith(String(key))
    );
    return matchingKey ? String(matchingKey) : "";
  }, [pathname]);

  // 3. Logic tìm sub-menu cần mở (openKey)
  // Tìm key cha của selectedKey (nếu có)
  const defaultOpenKey = useMemo(() => {
    const parent = menuItems.find(
      (item) =>
        item &&
        "children" in item &&
        item.children &&
        item.children.some((child) => child.key === selectedKey)
    );
    return parent ? String(parent.key) : "";
  }, [selectedKey]);

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
          // 4. Sử dụng các key đã tính toán
          selectedKeys={[selectedKey]}
          // Dùng defaultOpenKeys để sub-menu tự mở khi tải trang
          // nhưng vẫn cho phép người dùng đóng/mở thủ công
          defaultOpenKeys={[defaultOpenKey]}
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
