"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";
import { LogoComponent } from "@/components/ui/Logo"; // Import the shared LogoComponent
import styles from './HeaderAdmin.module.css'; // Import CSS module

const AvatarPlaceholder = () => (
    <div className={styles.avatarPlaceholder}>
        <UserOutlined className={styles.userIcon} />
    </div>
);

export const HeaderAdmin: React.FC = () => {

    const userMenuItems: MenuProps['items'] = [
        { key: "profile", label: "Profile" },
        { key: "settings", label: "Settings" },
        { type: "divider" },
        { key: "logout", label: "Logout" },
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
                        Anle 
                        <DownOutlined className={styles.downArrowIcon} />
                    </span>
                </div>
            </Dropdown>
        </header>
    );
};

export default HeaderAdmin;
