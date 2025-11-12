"use client";

import React, { useState, useEffect } from "react";
import {
  Collapse,
  Typography,
  Input,
  Image as AntImage,
  Descriptions,
  Row,
  Col,
  Space,
  Spin,
  Alert,
} from "antd";
import styles from "./ApprovalDetail.module.css";
import { ApiAssessmentQuestion, ApiRubricItem } from "@/types";
import { adminService } from "@/services/adminService";
import { rubricItemService } from "@/services/rubricItemService";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface RubricListProps {
  questionId: number;
}

const RubricList: React.FC<RubricListProps> = ({ questionId }) => {
  const [rubrics, setRubrics] = useState<ApiRubricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!questionId) {
      setLoading(false);
      setRubrics([]);
      return;
    }

    setLoading(true);
    rubricItemService
      .getRubricsForQuestion({
        assessmentQuestionId: questionId,
        pageNumber: 1,
        pageSize: 100,
      })
      .then((response) => {
        setRubrics(response.items);
      })
      .catch((err) => {
        console.error(`Error fetching rubrics for Q_ID ${questionId}:`, err);
        setError("Failed to load criteria.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [questionId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <Spin size="small" />
      </div>
    );
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  if (rubrics.length === 0) {
    return <Text type="secondary">No criteria defined for this question.</Text>;
  }

  return (
    <Collapse ghost accordion className={styles.criteriaCollapse}>
      {rubrics.map((criterion) => (
        <Panel
          header={<Text strong>{criterion.description || "Criteria"}</Text>}
          key={criterion.id}
          className={styles.criteriaPanel}
        >
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Description">
              {criterion.description}
            </Descriptions.Item>
            <Descriptions.Item label="Input">
              {criterion.input || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Output">
              {criterion.output || "N/A"}
            </Descriptions.Item>
          </Descriptions>
        </Panel>
      ))}
    </Collapse>
  );
};

interface ApprovalItemProps {
  questions: ApiAssessmentQuestion[];
}

export const ApprovalItem: React.FC<ApprovalItemProps> = ({ questions }) => {
  if (!questions || questions.length === 0) {
    return (
      <Text type="secondary" style={{ padding: "16px" }}>
        This paper has no questions.
      </Text>
    );
  }

  return (
    <div className={styles.itemWrapper}>
      <Collapse
        ghost
        defaultActiveKey={
          questions.length > 0 ? [`question-${questions[0].id}`] : undefined
        }
        className={styles.innerCollapse}
      >
        {[...questions].sort((a, b) => ((a as any).questionNumber || 0) - ((b as any).questionNumber || 0)).map((question) => (
          <Panel
            header={
              <Title level={5}>{question.questionText || "Question"}</Title>
            }
            key={`question-${question.id}`}
            className={styles.innerPanel}
          >
            <Row gutter={[24, 16]}>
              <Col xs={24} md={24}>
                <div className={styles.formGroup}>
                  <Text strong>Question Text</Text>
                  <Paragraph>{question.questionText}</Paragraph>
                </div>
                <div className={styles.formGroup}>
                  <Text strong>Sample Input</Text>
                  <Input.TextArea
                    value={question.questionSampleInput}
                    readOnly
                    autoSize
                  />
                </div>
                <div className={styles.formGroup}>
                  <Text strong>Sample Output</Text>
                  <Input.TextArea
                    value={question.questionSampleOutput}
                    readOnly
                    autoSize
                  />
                </div>
                <div className={styles.formGroup}>
                  <Text strong>Score</Text>
                  <Input
                    value={question.score}
                    readOnly
                    style={{ width: "100px" }}
                  />
                </div>
              </Col>
            </Row>

            <Title level={5} style={{ marginTop: "20px" }}>
              Criteria ({question.rubricCount})
            </Title>
            <RubricList questionId={question.id} />
          </Panel>
        ))}
      </Collapse>
    </div>
  );
};
