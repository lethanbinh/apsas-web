/**
 * Header component - FINAL FIX with Global CSS AND Inline Styles for State
 * Sửa lỗi ReferenceError: hoverKey is not defined.
 */

"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";
import { LogoComponent } from "@/components/ui/Logo"; // Import the shared LogoComponent
import { useState } from "react";

// Dùng Icon Ant Design cho Avatar
const AvatarPlaceholder = () => (
    <div className="!w-8 !h-8 !rounded-full !flex !items-center !justify-center !bg-gray-300 !border-2 !border-pink-500">
        <UserOutlined className="!text-gray-600 !text-lg" />
    </div>
);

// Bổ sung hoverKey: string | null vào danh sách tham số
const getLinkStyle = (key: string, activeKey: string, hoverKey: string | null): React.CSSProperties => {
    const isSelected = key === activeKey;
    
    // Style mặc định cho link (inactive)
    let currentStyle: React.CSSProperties = {
        padding: '0 8px', // px-2
        color: '#4b5563', // text-gray-700
        fontWeight: 500,
        transition: 'all 0.15s ease',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        fontSize: '15px',
        textDecoration: 'none', // Đảm bảo không có gạch chân
    };

    // Áp dụng style ACTIVE
    if (isSelected) {
        currentStyle = {
            ...currentStyle,
            color: '#ffffff', 
            backgroundColor: '#4cbfb6', 
            borderRadius: '20px', 
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', 
            padding: '8px 20px', 
            height: 'auto',
        };
    }
    
    // Áp dụng style HOVER (Chỉ khi hoverKey khớp với key hiện tại)
    if (hoverKey === key) {
        if (isSelected) {
            // Hover trên mục đang ACTIVE (Home): Nền đậm hơn, chữ xám
            currentStyle = {
                ...currentStyle,
                backgroundColor: '#38a199', // hover:bg-teal-500
            };
        } else {
            // Hover trên mục INACTIVE: Chữ xanh ngọc
            currentStyle = {
                ...currentStyle,
                color: '#38a199', // hover:text-teal-600
            };
        }
    }

    return currentStyle;
};

export const Header: React.FC = () => {
    // hoverKey được khai báo ở đây
    const [activeKey, setActiveKey] = useState("home"); 
    const [hoverKey, setHoverKey] = useState<string | null>(null);

    const navigation = [
        { key: "home", label: "Home", href: "/home" },
        { key: "dashboard", label: "Dashboard", href: "/dashboard" },
        { key: "my-courses", label: "My courses", href: "/my-courses" },
        { key: "all-courses", label: "All courses", href: "/all-courses" },
    ];

    const userMenuItems: MenuProps['items'] = [
        { key: "profile", label: "Profile" },
        { key: "settings", label: "Settings" },
        { type: "divider" },
        { key: "logout", label: "Logout" },
    ];

    return (
        // Sử dụng Global CSS cho bố cục
        <header className="apsis-header-root">
            
            <div className="apsis-header-left-group">
                
                <Link href="/home" className="!flex !items-center !h-full">
                    <LogoComponent /> 
                </Link>
                

                <nav className="apsis-nav-group">
                    {navigation.map((item) => {
                        return (
                            <Link 
                                key={item.key}
                                href={item.href}
                                // Cập nhật trạng thái active khi click
                                onClick={() => setActiveKey(item.key)}
                                // Cập nhật trạng thái hover
                                onMouseEnter={() => setHoverKey(item.key)}
                                onMouseLeave={() => setHoverKey(null)}
                                // Truyền cả hoverKey vào hàm getLinkStyle
                                style={getLinkStyle(item.key, activeKey, hoverKey)}
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
                <div className="apsis-user-group !cursor-pointer hover:!opacity-90 !transition">
                    <AvatarPlaceholder />
                    
                    <span className="!text-gray-800 !font-medium !text-base">
                        Anle 
                        <DownOutlined className="!text-gray-800 !text-xs !ml-1" />
                    </span>
                </div>
            </Dropdown>
        </header>
    );
};

export default Header;
