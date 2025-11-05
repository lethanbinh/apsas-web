"use client";

import { Col, Row, Typography } from "antd";
import Image from "next/image";
import { Button } from "../ui/Button";

// Đảm bảo đường dẫn này CHÍNH XÁC
import styles from "./JoinClassSection.module.css";

const { Title, Paragraph, Text } = Typography;

export default function JoinClassSection() {
  return (
    <div className={styles.sectionWrapper}>
      <Row align="middle" gutter={[48, 32]} justify="center">
        <Col xs={24} lg={12}>
          <Title
            level={2}
            // Style inline cho component AntD
            style={{
              fontWeight: 700,
              marginBottom: "20px",
              fontSize: "2.5rem",
              color: "#2F327D",
            }}
          >
            Start your coding journey here
          </Title>

          <Paragraph
            // Style inline cho component AntD
            style={{
              fontSize: "1.1rem",
              marginBottom: "30px",
              maxWidth: 400,
            }}
          >
            <Text type="secondary">
              Manage and review student programming submissions with instant
              feedback and smart assessments.
            </Text>
          </Paragraph>
        </Col>

        <Col xs={24} lg={10}>
          <div
            // Dùng CSS Module cho div
            className={styles.imageWrapper}
          >
            <Image
              src="/classes/class.png"
              alt="Laptop showing an online class"
              height={523}
              width={578}
              // Dùng CSS Module cho next/image
              className={styles.image}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
