"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Input, Menu } from "antd";
import {
  SearchOutlined,
  ApartmentOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import styles from "./StudentSidebar.module.css";

const { Sider } = Layout;
const menuItems = [
  {
    key: "/examiner/grading-groups",
    icon: <ApartmentOutlined />,
    label: <Link href="/examiner/grading-groups">Grading Groups</Link>,
  },
  {
    key: "/examiner/templates",
    icon: <FileTextOutlined />,
    label: <Link href="/examiner/templates">Templates</Link>,
  },
];

export default function ExaminerSidebar() {
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

