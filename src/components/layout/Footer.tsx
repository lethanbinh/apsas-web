/**
 * Footer component - redesigned to match the provided image
 */

'use client';

import React, { useState } from 'react';
import { 
    DownloadOutlined, InstagramOutlined, MailOutlined, UsergroupAddOutlined, ChromeOutlined
} from "@ant-design/icons";
// Giả định LogoComponent là một component đã có
import { LogoComponent } from "@/components/ui/Logo"; 
import { DownloadQRModal } from "@/components/common/DownloadQRModal";
import Link from "next/link";

interface CustomLinkProps {
    href: string;
    className?: string;
    children: React.ReactNode;
}

const CustomLink: React.FC<CustomLinkProps> = ({ href, className, children }) => (
    <Link href={href} className={className}>
        {children}
    </Link>
);

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);

    const ContactIcons = [
        { icon: <InstagramOutlined />, href: "#instagram" },
        { icon: <MailOutlined />, href: "mailto:apsas@gmail.com" },
        { icon: <UsergroupAddOutlined />, href: "#community" },
        { icon: <ChromeOutlined />, href: "#chrome-extension" },
    ];

    const handleDownloadClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setDownloadModalOpen(true);
    };

    return (
        <footer className="footer-base">
            
            {/* CONTAINER CHÍNH - Căn giữa nội dung */}
            <div className="footer-container">
                
                {/* KHỐI 1: Logo + Tagline */}
                <div className="logo-tagline-block">
                    <LogoComponent size='large' />
                    <div className="tagline-text">
                        <div className="tagline-primary">Automated Programming</div>
                        <div className="tagline-secondary">Skills Assessment System</div>
                    </div>
                </div>

                {/* KHỐI 2: 3 Columns (APSAS, Contact, Download) */}
                <div className="columns-block">
                    
                    {/* Column: APSAS */}
                    <div className="apsas-column">
                        <h4 className="column-title">APSAS</h4>
                        <div className="apsas-details">
                            <CustomLink href="mailto:apsas@gmail.com" className="apsas-link">apsas@gmail.com</CustomLink>
                            <div>+84123456789</div>
                            <div>Thu Duc, Ho Chi Minh</div>
                        </div>
                    </div>

                    {/* Column: Contact (Icons) - 2x2 Grid */}
                    <div className="contact-column">
                        <h4 className="column-title">Contact</h4>
                        <div className="contact-icons-grid">
                            {ContactIcons.map((item, index) => (
                                <CustomLink 
                                    key={index} 
                                    href={item.href} 
                                    className="contact-icon-link"
                                >
                                    {item.icon}
                                </CustomLink>
                            ))}
                        </div>
                    </div>

                    {/* Column: Download */}
                    <div className="download-column">
                        <h4 className="column-title">Download</h4>
                        <button 
                            className="download-button"
                            onClick={handleDownloadClick}
                            type="button"
                        >
                            Download now <DownloadOutlined className="download-icon" />
                        </button>
                    </div>
                </div>

            </div>
            
            {/* Dòng Copyright */}
            <div className="copyright-text">
                © {currentYear} APSAS. All rights reserved.
            </div>

            {/* Download QR Modal */}
            <DownloadQRModal 
                open={downloadModalOpen}
                onClose={() => setDownloadModalOpen(false)}
            />
            
        </footer>
    );
};