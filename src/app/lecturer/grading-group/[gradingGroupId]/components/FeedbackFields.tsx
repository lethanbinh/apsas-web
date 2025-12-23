import { Col, Input, Row } from "antd";
import { ReactNode } from "react";
import type { FeedbackData } from "@/services/geminiService";
const { TextArea } = Input;
interface FeedbackFieldsProps {
  feedbackData: FeedbackData;
  onFeedbackChange: (field: keyof FeedbackData, value: string) => void;
}
export function FeedbackFields({ feedbackData, onFeedbackChange }: FeedbackFieldsProps) {
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
  const fieldsToRender = fields;
  const elements: ReactNode[] = [];
  let currentRow: Array<typeof fields[0]> = [];
  fieldsToRender.forEach((field, index) => {
    const value = feedbackData[field.key] || "";
    if (field.fullWidth) {
      if (currentRow.length > 0) {
        if (currentRow.length === 1) {
          elements.push(
            <div key={`field-${currentRow[0].key}`}>
              <h5 style={{ margin: 0, marginBottom: 8, fontSize: '14px', fontWeight: 600 }}>
                {currentRow[0].label}
              </h5>
              <TextArea
                rows={currentRow[0].rows}
                value={feedbackData[currentRow[0].key] || ""}
                onChange={(e) => onFeedbackChange(currentRow[0].key, e.target.value)}
                placeholder={`Enter ${currentRow[0].label.toLowerCase()}...`}
              />
            </div>
          );
        } else {
          elements.push(
            <Row gutter={16} key={`row-${index}`}>
              {currentRow.map((f) => (
                <Col xs={24} md={12} key={f.key}>
                  <div>
                    <h5 style={{ margin: 0, marginBottom: 8, fontSize: '14px', fontWeight: 600 }}>
                      {f.label}
                    </h5>
                    <TextArea
                      rows={f.rows}
                      value={feedbackData[f.key] || ""}
                      onChange={(e) => onFeedbackChange(f.key, e.target.value)}
                      placeholder={`Enter ${f.label.toLowerCase()}...`}
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
          <h5 style={{ margin: 0, marginBottom: 8, fontSize: '14px', fontWeight: 600 }}>
            {field.label}
          </h5>
          <TextArea
            rows={field.rows}
            value={value}
            onChange={(e) => onFeedbackChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        </div>
      );
    } else {
      currentRow.push(field);
      if (currentRow.length === 2 || index === fieldsToRender.length - 1) {
        if (currentRow.length === 1) {
          elements.push(
            <div key={`field-${currentRow[0].key}`}>
              <h5 style={{ margin: 0, marginBottom: 8, fontSize: '14px', fontWeight: 600 }}>
                {currentRow[0].label}
              </h5>
              <TextArea
                rows={currentRow[0].rows}
                value={feedbackData[currentRow[0].key] || ""}
                onChange={(e) => onFeedbackChange(currentRow[0].key, e.target.value)}
                placeholder={`Enter ${currentRow[0].label.toLowerCase()}...`}
              />
            </div>
          );
        } else {
          elements.push(
            <Row gutter={16} key={`row-${index}`}>
              {currentRow.map((f) => (
                <Col xs={24} md={12} key={f.key}>
                  <div>
                    <h5 style={{ margin: 0, marginBottom: 8, fontSize: '14px', fontWeight: 600 }}>
                      {f.label}
                    </h5>
                    <TextArea
                      rows={f.rows}
                      value={feedbackData[f.key] || ""}
                      onChange={(e) => onFeedbackChange(f.key, e.target.value)}
                      placeholder={`Enter ${f.label.toLowerCase()}...`}
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