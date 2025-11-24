"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Input, Menu } from "antd";
import {
  SearchOutlined,
  FileTextOutlined,
  BarChartOutlined,
  CalendarOutlined,
  BookOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import styles from "../sidebar/StudentSidebar.module.css";

const { Sider } = Layout;
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
  {
    key: "/hod/semester-management",
    icon: <CalendarOutlined />,
    label: <Link href="/hod/semester-management">Semester management</Link>,
  },
  {
    key: "/hod/course-management",
    icon: <BookOutlined />,
    label: <Link href="/hod/course-management">Course management</Link>,
  },
  {
    key: "/hod/grading-groups",
    icon: <ApartmentOutlined />,
    label: <Link href="/hod/grading-groups">Grading Groups</Link>,
  },
  {
    key: "/hod/templates",
    icon: <FileTextOutlined />,
    label: <Link href="/hod/templates">Templates</Link>,
  },
];

export default function HeadOfDepartmentSidebar() {
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

  return (
    <Sider width={280} className={styles.sider}>
      <div className={styles.siderContent}>
        <Input
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
    </Sider>
  );
}
