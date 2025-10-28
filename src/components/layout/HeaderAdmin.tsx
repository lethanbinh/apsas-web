"use client";

import { useState, useEffect } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { LogoComponent } from "@/components/ui/Logo";
import { logout } from '@/store/slices/authSlice';
import { useAuth } from '@/hooks/useAuth';
import styles from './HeaderAdmin.module.css';

const AvatarPlaceholder = () => (
    <div className={styles.avatarPlaceholder}>
        <UserOutlined className={styles.userIcon} />
    </div>
);

export const HeaderAdmin: React.FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        router.push("/login");
    };

    const userMenuItems: MenuProps['items'] = [
        { 
            key: "profile", 
            label: "Profile",
            onClick: () => router.push("/profile")
        },
        { type: "divider" },
        { 
            key: "logout", 
            label: "Logout",
            onClick: handleLogout
        },
    ];

    return (
        <header className={styles.headerRoot}>
            
            <div className={styles.headerLeftGroup}>
                
                <Link href="/admin/dashboard" className={styles.logoLink}> {/* Adjust href for admin dashboard */}
                    <LogoComponent /> 
                </Link>
                
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
                        {mounted && user?.fullName ? user.fullName : 'User'} 
                        <DownOutlined className={styles.downArrowIcon} />
                    </span>
                </div>
            </Dropdown>
        </header>
    );
};

export default HeaderAdmin;
