"use client";

import {
  BarChartOutlined,
  BookOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MoonOutlined,
  SearchOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Input, Layout, Menu, Switch } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./SidebarLecturer.module.css";

const { Sider } = Layout;
const { Search } = Input;

type MenuItem = Required<MenuProps>["items"][number];
const id = localStorage.getItem("selectedClassId") || "";
const menuItems: MenuItem[] = [
  {
    key: `/lecturer/info/${id}`,
    icon: <InfoCircleOutlined />,
    label: <Link href={`/lecturer/info/${id}`}>Info</Link>,
  },
  {
    key: "/lecturer/assignments",
    icon: <BarChartOutlined />,
    label: <Link href="/lecturer/detail-assignment">Assignments</Link>,
  },
  {
    key: "/lecturer/grading-history",
    icon: <BookOutlined />,
    label: <Link href="/lecturer/grading-history">Grading history</Link>,
  },
  {
    key: "/lecturer/tasks",
    icon: <FileTextOutlined />,
    label: <Link href="/lecturer/tasks">Tasks</Link>,
  },
  {
    key: "/lecturer/members",
    icon: <UserOutlined />,
    label: <Link href="/lecturer/members">Members</Link>,
  },
];

// ✅ Helper: Lấy tất cả key để xác định menu đang active
const allKeys = menuItems.map((item) => String(item?.key));

export default function SidebarLecturer() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();

  // ✅ Tính toán selectedKey dựa trên pathname hiện tại
  const selectedKey = useMemo(() => {
    const sortedKeys = [...allKeys].sort((a, b) => b.length - a.length);
    const matched = sortedKeys.find((key) => pathname.startsWith(key));
    return matched ?? "";
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
          selectedKeys={[selectedKey]}
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
