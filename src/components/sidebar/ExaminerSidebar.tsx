"use client";

import {
  ApartmentOutlined,
  FileTextOutlined,
  MoonOutlined,
  SearchOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Input, Layout, Menu, Switch } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./ExaminerSidebar.module.css";

const { Sider } = Layout;
const { Search } = Input;

const menuItems = [
  {
    key: "/examiner/exam-shifts",
    icon: <FileTextOutlined />,
    label: <Link href="/examiner/exam-shifts">Exam shifts</Link>,
  },
  {
    key: "/examiner/grading-groups",
    icon: <ApartmentOutlined />,
    label: <Link href="/examiner/grading-groups">Grading Assign</Link>,
  },
];

export default function ExaminerSidebar() {
  const [theme, setTheme] = useState("light");
  const pathname = usePathname();

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
