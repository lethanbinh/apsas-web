import { Col, Input, Row, Typography } from "antd";
import { ReactNode } from "react";
import type { FeedbackData } from "@/services/geminiService";

const { Title } = Typography;
const { TextArea } = Input;

interface FeedbackFieldsProps {
  feedbackData: FeedbackData;
}

export function FeedbackFields({ feedbackData }: FeedbackFieldsProps) {
  const fields: Array<{ key: keyof FeedbackData; label: string; rows: number; fullWidth?: boolean }> = [
    { key: "overallFeedback", label: "Overall Feedback", rows: 6, fullWidth: true },
    { key: "strengths", label: "Strengths", rows: 8 },
    { key: "weaknesses", label: "Weaknesses", rows: 8 },
    { key: "codeQuality", label: "Code Quality", rows: 6 },
    { key: "algorithmEfficiency", label: "Algorithm Efficiency", rows: 6 },
    { key: "suggestionsForImprovement", label: "Suggestions for Improvement", rows: 6, fullWidth: true },
    { key: "bestPractices", label: "Best Practices", rows: 5 },
    { key: "errorHandling", label: "Error Handling", rows: 5 },
  ];

  const elements: ReactNode[] = [];
  let currentRow: Array<typeof fields[0]> = [];

  fields.forEach((field, index) => {
    const value = feedbackData[field.key] || "";

    if (field.fullWidth) {
      if (currentRow.length > 0) {
        if (currentRow.length === 1) {
          elements.push(
            <div key={`field-${currentRow[0].key}`}>
              <Title level={5}>{currentRow[0].label}</Title>
              <TextArea
                rows={currentRow[0].rows}
                value={feedbackData[currentRow[0].key] || ""}
                readOnly
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </div>
          );
        } else {
          elements.push(
            <Row gutter={16} key={`row-${index}`}>
              {currentRow.map((f) => (
                <Col xs={24} md={12} key={f.key}>
                  <div>
                    <Title level={5}>{f.label}</Title>
                    <TextArea
                      rows={f.rows}
                      value={feedbackData[f.key] || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          );
        }
        currentRow = [];
      }

      elements.push(
        <div key={`field-${field.key}`}>
          <Title level={5}>{field.label}</Title>
          <TextArea
            rows={field.rows}
            value={value}
            readOnly
            style={{ backgroundColor: "#f5f5f5" }}
          />
        </div>
      );
    } else {
      currentRow.push(field);

      if (currentRow.length === 2 || index === fields.length - 1) {
        if (currentRow.length === 1) {
          elements.push(
            <div key={`field-${currentRow[0].key}`}>
              <Title level={5}>{currentRow[0].label}</Title>
              <TextArea
                rows={currentRow[0].rows}
                value={feedbackData[currentRow[0].key] || ""}
                readOnly
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </div>
          );
        } else {
          elements.push(
            <Row gutter={16} key={`row-${index}`}>
              {currentRow.map((f) => (
                <Col xs={24} md={12} key={f.key}>
                  <div>
                    <Title level={5}>{f.label}</Title>
                    <TextArea
                      rows={f.rows}
                      value={feedbackData[f.key] || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          );
        }
        currentRow = [];
      }
    }
  });

  return <>{elements}</>;
}

