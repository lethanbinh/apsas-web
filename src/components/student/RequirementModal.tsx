// Tên file: components/AssignmentList/RequirementModal.tsx
"use client";

import React from "react";
import { Modal, Typography, Image as AntImage } from "antd";
import { Button } from "../ui/Button";
import styles from "./AssignmentList.module.css";
import { RequirementContent } from "./data";

const { Title, Paragraph } = Typography;

interface RequirementModalProps {
  open: boolean;
  onCancel: () => void;
  title: string;
  content: RequirementContent[];
}

const renderRequirementContent = (item: RequirementContent, index: number) => {
  switch (item.type) {
    case "heading":
      return (
        <Title
          level={5}
          key={index}
          style={{ fontWeight: 600, marginTop: "20px" }}
        >
          {item.content}
        </Title>
      );
    case "paragraph":
      return <Paragraph key={index}>{item.content}</Paragraph>;
    case "image":
      return (
        <AntImage
          key={index}
          src={item.src}
          alt="Requirement content"
          className={styles.modalImage}
        />
      );
    default:
      return null;
  }
};

export const RequirementModal: React.FC<RequirementModalProps> = ({
  open,
  onCancel,
  title,
  content,
}) => {
  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <Button variant="primary" onClick={onCancel}>
          Close
        </Button>
      }
      width={800}
      className={styles.requirementModal}
    >
      <div className={styles.modalBody}>
        {content.map(renderRequirementContent)}
      </div>
    </Modal>
  );
};
