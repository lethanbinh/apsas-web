"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Input, Menu } from "antd";
import {
  InfoCircleOutlined,
  BarChartOutlined,
  BookOutlined,
  UsergroupAddOutlined,
  FileTextOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import styles from "./StudentSidebar.module.css";

const { Sider } = Layout;

// Giữ nguyên mảng menuItems
const menuItems = [
  {
    key: "/student/class-detail",
    icon: <InfoCircleOutlined />,
    label: <Link href="/student/class-detail">Info</Link>,
  },
  {
    key: "/student/assignments",
    icon: <BarChartOutlined />,
    label: <Link href="/student/assignments">Assignments</Link>,
  },
  // Temporarily removed - Submission history moved to Labs page
  // {
  //   key: "/student/submissions",
  //   icon: <BookOutlined />,
  //   label: <Link href="/student/submissions">Submission history</Link>,
  // },
  {
    key: "/student/labs",
    icon: <ExperimentOutlined />,
    label: <Link href="/student/labs">Labs</Link>,
  },
  {
    key: "/student/members",
    icon: <UsergroupAddOutlined />,
    label: <Link href="/student/members">Member list</Link>,
  },
];

export default function StudentSidebar() {
  const pathname = usePathname();

  // 2. Logic tìm key active
  // useMemo sẽ tính toán lại activeKey mỗi khi pathname thay đổi
  const activeKey = useMemo(() => {
    // Sắp xếp các key từ dài đến ngắn để tìm shina khớp nhất
    // (ví dụ: /student/assignments khớp trước /student)
    const sortedKeys = [...menuItems].sort(
      (a, b) => b.key.length - a.key.length
    );

    // Tìm key đầu tiên mà pathname hiện tại bắt đầu bằng key đó
    const matchingKey = sortedKeys.find((item) =>
      pathname.startsWith(item.key)
    );

    return matchingKey ? matchingKey.key : "";
  }, [pathname]); // Chỉ chạy lại khi pathname thay đổi

  return (
    <Sider width={280} className={styles.sider}>
      <div className={styles.siderContent}>
        <Menu
          mode="inline"
          // 3. Sử dụng activeKey đã tính toán
          selectedKeys={[activeKey]}
          className={styles.menu}
          items={menuItems}
        />
      </div>
    </Sider>
  );
}
