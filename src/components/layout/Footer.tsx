
'use client';

import React from 'react';
import {
    InstagramOutlined, MailOutlined, UsergroupAddOutlined, ChromeOutlined
} from "@ant-design/icons";

import { LogoComponent } from "@/components/ui/Logo";
import Link from "next/link";
import styles from "./Footer.module.css";

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const socialIcons = [
        { icon: <InstagramOutlined />, href: "#instagram" },
        { icon: <MailOutlined />, href: "mailto:apsas@gmail.com" },
        { icon: <UsergroupAddOutlined />, href: "#community" },
        { icon: <ChromeOutlined />, href: "#chrome-extension" },
    ];

    return (
        <footer className={styles.footerBase}>
            <div className={styles.footerContainer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerMain}>
                        <div className={styles.logoSection}>
                            <div className={styles.logoWrapper}>
                                <LogoComponent size='large' />
                            </div>
                            <div className={styles.taglineText}>
                                <div className={styles.taglinePrimary}>Automated Programming</div>
                                <div className={styles.taglineSecondary}>Skills Assessment System</div>
                            </div>
                        </div>

                        <div className={styles.infoSection}>
                            <div className={styles.contactInfo}>
                                <Link href="mailto:apsas@gmail.com" className={styles.contactLink}>
                                    apsas@gmail.com
                                </Link>
                                <div>+84 123 456 789</div>
                                <div>Thu Duc, Ho Chi Minh</div>
                            </div>
                            <div className={styles.socialIcons}>
                                {socialIcons.map((item, index) => (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        className={styles.socialIcon}
                                        aria-label={`Social link ${index + 1}`}
                                    >
                                        {item.icon}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.copyrightSection}>
                    <div className={styles.copyrightText}>
                        © {currentYear} APSAS. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};