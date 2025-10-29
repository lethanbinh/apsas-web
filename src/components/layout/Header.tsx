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
import { useState, useMemo } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_NAVIGATION, ROLES } from '@/lib/constants';
import type { Role } from '@/lib/constants';

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
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    const router = useRouter();
    const dispatch = useDispatch();
    const pathname = usePathname();
    const { user } = useAuth();

    const handleLogout = async () => {
        // await authService.logout(); // Backend does not have /auth/logout endpoint
        dispatch(logout()); // Clear frontend state
        router.push("/login");
    };

    // Get navigation items based on user role
    const navigation = useMemo(() => {
        if (!user?.role) return [];
        const userRole = user.role as Role;
        return ROLE_NAVIGATION[userRole] || [];
    }, [user?.role]);

    // Determine active key based on current pathname
    const activeKey = useMemo(() => {
        // Sort navigation keys by length (longest first) to match more specific routes first
        const sortedKeys = [...navigation].sort((a, b) => b.href.length - a.href.length);
        
        // Find the first navigation item that matches the current path
        const matchingItem = sortedKeys.find(item => pathname.startsWith(item.href));
        
        return matchingItem?.key || 'home';
    }, [pathname, navigation]);

    const userMenuItems: MenuProps['items'] = [
        { key: "profile", label: "Profile", onClick: () => router.push("/profile") },
        { key: "settings", label: "Settings" },
        { type: "divider" },
        { key: "logout", label: "Logout", onClick: handleLogout },
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
                        {user?.fullName || 'User'} 
                        <DownOutlined className="!text-gray-800 !text-xs !ml-1" />
                    </span>
                </div>
            </Dropdown>
        </header>
    );
};

export default Header;
