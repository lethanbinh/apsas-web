"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";
import { LogoComponent } from "@/components/ui/Logo";
import { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_NAVIGATION, Role } from "@/lib/constants";
import styles from "./Header.module.css";

// Avatar icon
const AvatarPlaceholder = () => (
  <div className={styles.avatarContainer}>
    <UserOutlined className={styles.avatarIcon} />
  </div>
);

export const Header: React.FC = () => {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    dispatch(logout());
    router.push("/login");
  };

  const navigation = useMemo(() => {
    if (!user?.role) return [];
    const userRole = user.role as Role;
    return ROLE_NAVIGATION[userRole] || [];
  }, [user?.role]);

  const activeKey = useMemo(() => {
    const sortedKeys = [...navigation].sort(
      (a, b) => b.href.length - a.href.length
    );
    const matchingItem = sortedKeys.find((item) =>
      pathname.startsWith(item.href)
    );
    return matchingItem?.key || "home";
  }, [pathname, navigation]);

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: "Profile",
      onClick: () => router.push("/profile"),
    },
    { key: "settings", label: "Settings" },
    { type: "divider" },
    { key: "logout", label: "Logout", onClick: handleLogout },
  ];

  return (
    <header className={styles.headerRoot}>
      <div className={styles.leftGroup}>
        <Link
          href={
            !mounted
              ? "/home/students"
              : user?.role === 0
              ? "/admin/dashboard"
              : user?.role === 1
              ? "/home/lecturer"
              : user?.role === 2
              ? "/home/student"
              : user?.role === 3
              ? "/hod/semester-plans"
              : "/home"
          }
          className={styles.logoLink}
        >
          <LogoComponent />
        </Link>

        <nav className={styles.navGroup}>
          {navigation.map((item) => {
            const isActive = activeKey === item.key;
            const isHover = hoverKey === item.key;
            const linkClass = `${styles.navLink} ${
              isActive ? styles.navActive : ""
            } ${isHover && !isActive ? styles.navHover : ""} ${
              isHover && isActive ? styles.navActiveHover : ""
            }`;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={linkClass}
                onMouseEnter={() => setHoverKey(item.key)}
                onMouseLeave={() => setHoverKey(null)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Dropdown
        menu={{ items: userMenuItems }}
        trigger={["click"]}
        placement="bottomRight"
        arrow
      >
        <div className={styles.userGroup}>
          <AvatarPlaceholder />
          <span className={styles.userName}>
            {mounted && user?.fullName ? user.fullName : "User"}
            <DownOutlined className={styles.dropdownIcon} />
          </span>
        </div>
      </Dropdown>
    </header>
  );
};

export default Header;
