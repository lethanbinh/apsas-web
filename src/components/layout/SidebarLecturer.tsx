"use client";

import {
  BookOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  UserOutlined,
  BarChartOutlined,
  CheckSquareOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Input, Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./SidebarLecturer.module.css";

const { Sider } = Layout;
const { Search } = Input;

type MenuItem = Required<MenuProps>["items"][number];

export default function SidebarLecturer() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedClassId(localStorage.getItem("selectedClassId") || "");
    }
  }, []);

  const menuItems: MenuItem[] = useMemo(() => {
    const id = selectedClassId;
    return [
      {
        key: `/lecturer/info/${id}`,
        icon: <InfoCircleOutlined />,
        label: <Link href={`/lecturer/info/${id}`}>Info</Link>,
      },
      {
        key: "/lecturer/detail-assignment",
        icon: <BarChartOutlined />,
        label: <Link href="/lecturer/detail-assignment">Assignments</Link>,
      },
      {
        key: "/lecturer/practical-exams",
        icon: <FileTextOutlined />,
        label: <Link href="/lecturer/practical-exams">Practical Exams</Link>,
      },
      {
        key: "/lecturer/tasks",
        icon: <CheckSquareOutlined />,
        label: <Link href="/lecturer/tasks">Tasks</Link>,
      },
      {
        key: "/lecturer/my-grading-group",
        icon: <BookOutlined />,
        label: <Link href="/lecturer/my-grading-group">Grading</Link>,
      },
      {
        key: "/lecturer/members",
        icon: <TeamOutlined />,
        label: <Link href="/lecturer/members">Members</Link>,
      },
    ];
  }, [selectedClassId]);

  const allKeys = useMemo(
    () => menuItems.map((item) => String(item?.key)),
    [menuItems]
  );

  const selectedKey = useMemo(() => {
    const sortedKeys = [...allKeys].sort((a, b) => b.length - a.length);
    const matched = sortedKeys.find((key) => pathname.startsWith(key));
    return matched ?? "";
  }, [pathname]);
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
    </Sider>
  );
}
