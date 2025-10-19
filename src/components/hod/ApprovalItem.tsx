"use client";

import React from "react";
import {
  Collapse,
  Typography,
  Input,
  Image as AntImage,
  Descriptions,
  Row,
  Col,
  Space,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./ApprovalDetail.module.css";
import { AssignmentApprovalDetails, QuestionData, CriteriaData } from "./data"; // Adjust path if needed

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ApprovalItemProps {
  data: AssignmentApprovalDetails;
}

export const ApprovalItem: React.FC<ApprovalItemProps> = ({ data }) => {
  return (
    <div className={styles.itemWrapper}>
      <Collapse
        ghost
        defaultActiveKey={
          data.questions.length > 0 ? [data.questions[0].id] : undefined
        }
        className={styles.innerCollapse}
      >
        {data.questions.map((question) => (
          <Panel
            header={<Title level={5}>{question.title}</Title>}
            key={question.id}
            className={styles.innerPanel}
          >
            <Row gutter={[24, 16]}>
              <Col xs={24} md={12}>
                <div className={styles.formGroup}>
                  <Text strong>Title</Text>
                  <Input value={question.name} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <Text strong>Content</Text>
                  <Input value={question.content} readOnly />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <AntImage
                  src={question.imageUrl}
                  alt={question.title}
                  className={styles.questionImage}
                />
              </Col>
            </Row>

            {question.criteria && question.criteria.length > 0 && (
              <Collapse ghost accordion className={styles.criteriaCollapse}>
                {question.criteria.map((criterion) => (
                  <Panel
                    header={<Text strong>{criterion.title}</Text>}
                    key={criterion.id}
                    className={styles.criteriaPanel}
                  >
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label="Name">
                        {criterion.details.Name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Content">
                        {criterion.details.Content}
                      </Descriptions.Item>
                      <Descriptions.Item label="Data type">
                        {criterion.details.DataType}
                      </Descriptions.Item>
                      <Descriptions.Item label="Score">
                        {criterion.details.Score}
                      </Descriptions.Item>
                    </Descriptions>
                  </Panel>
                ))}
              </Collapse>
            )}
          </Panel>
        ))}
      </Collapse>
    </div>
  );
};