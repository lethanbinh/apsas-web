"use client";
import React, { useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Input, Menu } from "antd";
import {
  ApartmentOutlined,
  FileTextOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useSidebar } from "@/components/layout/SidebarContext";
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
        width={280}
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