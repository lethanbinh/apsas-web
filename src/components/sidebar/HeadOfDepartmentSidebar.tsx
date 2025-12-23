"use client";
import React, { useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Menu, Tooltip } from "antd";
import {
  FileTextOutlined,
  BarChartOutlined,
  CalendarOutlined,
  BookOutlined,
  ApartmentOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useSidebar } from "@/components/layout/SidebarContext";
import styles from "../sidebar/StudentSidebar.module.css";
const { Sider } = Layout;
const MenuItemWithTooltip = ({ href, children, title }: { href: string; children: React.ReactNode; title: string }) => {
  return (
    <Tooltip title={title} placement="right">
      <Link href={href} style={{ display: 'block', width: '100%' }}>
        {children}
      </Link>
    </Tooltip>
  );
};
const menuItems = [
  {
    key: "/hod/semester-plans",
    icon: <FileTextOutlined />,
    label: <MenuItemWithTooltip href="/hod/semester-plans" title="Semester plans">Semester plans</MenuItemWithTooltip>,
  },
  {
    key: "/hod/approval",
    icon: <BarChartOutlined />,
    label: <MenuItemWithTooltip href="/hod/approval" title="Approval">Approval</MenuItemWithTooltip>,
  },
  {
    key: "/hod/semester-management",
    icon: <CalendarOutlined />,
    label: <MenuItemWithTooltip href="/hod/semester-management" title="Semester management">Semester management</MenuItemWithTooltip>,
  },
  {
    key: "/hod/course-management",
    icon: <BookOutlined />,
    label: <MenuItemWithTooltip href="/hod/course-management" title="Course management">Course management</MenuItemWithTooltip>,
  },
];
export default function HeadOfDepartmentSidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const activeKey = useMemo(() => {
    const sortedKeys = [...menuItems].sort(
      (a, b) => b.key.length - a.key.length
    );
    const matchingKey = sortedKeys.find((item) =>
      pathname.startsWith(item.key)
    );
    return matchingKey ? matchingKey.key : "";
  }, [pathname]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest(`.${styles.sider}`) && !target.closest('.ant-menu')) {
        close();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);
  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={close} />}
      <Sider
        width={300}
        className={`${styles.sider} ${isOpen ? styles.mobileOpen : ''}`}
      >
        <div className={styles.siderContent}>
          <div className={styles.sidebarHeader}>
            <button className={styles.closeButton} onClick={close} aria-label="Close sidebar">
              <CloseOutlined />
            </button>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            className={styles.menu}
            items={menuItems}
            onClick={close}
          />
        </div>
      </Sider>
    </>
  );
}