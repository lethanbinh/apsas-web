"use client";

import {
  InfoCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  ExperimentOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSidebar } from "./SidebarContext";
import styles from "./SidebarLecturer.module.css";

const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

export default function SidebarLecturer() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedClassId(localStorage.getItem("selectedClassId") || "");
    }
  }, []);

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
        key: "/lecturer/labs",
        icon: <ExperimentOutlined />,
        label: <Link href="/lecturer/labs">Labs</Link>,
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
            selectedKeys={[selectedKey]}
            className={styles.menu}
            items={menuItems}
            onClick={close}
          />
        </div>
      </Sider>
    </>
  );
}
