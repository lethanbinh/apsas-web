"use client";

import { Layout } from "antd";
import { useRouter, usePathname } from "next/navigation";
import { FileTextOutlined, HomeOutlined } from "@ant-design/icons";
import styles from "./layout.module.css";

const { Header, Content, Sider } = Layout;

export default function PEGradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      key: "/pe-grading",
      icon: <FileTextOutlined />,
      label: "Submission List",
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>PE Grading System</h1>
          <div className={styles.headerActions}>
            <button
              className={styles.homeButton}
              onClick={() => router.push("/")}
            >
              <HomeOutlined /> Home
            </button>
          </div>
        </div>
      </Header>
      <Layout>
        <Sider width={200} className={styles.sider}>
          <div className={styles.menu}>
            {menuItems.map((item) => (
              <div
                key={item.key}
                className={`${styles.menuItem} ${
                  pathname === item.key ? styles.active : ""
                }`}
                onClick={() => router.push(item.key)}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </Sider>
        <Content className={styles.content}>{children}</Content>
      </Layout>
    </Layout>
  );
}

