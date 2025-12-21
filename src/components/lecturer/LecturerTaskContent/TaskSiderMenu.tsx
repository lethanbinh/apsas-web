"use client";

import { AssessmentPaper } from "@/services/assessmentPaperService";
import { AssessmentQuestion } from "@/services/assessmentQuestionService";
import { BookOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Menu, Space } from "antd";
import styles from "./TaskContent.module.css";

interface TaskSiderMenuProps {
  selectedKey: string;
  papers: AssessmentPaper[];
  allQuestions: { [paperId: number]: AssessmentQuestion[] };
  isEditable: boolean;
  onSelect: (key: string) => void;
  onAddQuestion: (paperId: number) => void;
  onEditPaper: (paper: AssessmentPaper) => void;
  onDeletePaper: (paper: AssessmentPaper) => void;
  onDeleteQuestion: (question: AssessmentQuestion) => void;
}

export function TaskSiderMenu({
  selectedKey,
  papers,
  allQuestions,
  isEditable,
  onSelect,
  onAddQuestion,
  onEditPaper,
  onDeletePaper,
  onDeleteQuestion,
}: TaskSiderMenuProps) {
  const menuItems = papers.map((paper) => {
    const questions = allQuestions[paper.id] || [];
    return {
      key: `paper-${paper.id}`,
      icon: <BookOutlined />,
      label: (
        <span className={styles.menuLabel}>
          <span className={styles.menuLabelText}>{paper.name}</span>
          {isEditable && (
            <Space className={styles.menuActions}>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddQuestion(paper.id);
                }}
              />
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPaper(paper);
                }}
              />
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePaper(paper);
                }}
              />
            </Space>
          )}
        </span>
      ),
      children: [...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((q) => ({
        key: `question-${q.id}`,
        icon: <FileTextOutlined />,
        label: (
          <span className={styles.menuLabel}>
            <span className={styles.menuLabelText}>
              {q.questionNumber ? `Q${q.questionNumber}: ` : ""}{q.questionText.substring(0, 30)}...
            </span>
            {isEditable && (
              <Space className={styles.menuActions}>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteQuestion(q);
                  }}
                />
              </Space>
            )}
          </span>
        ),
      })),
    };
  });

  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      onSelect={({ key }) => onSelect(key)}
      items={[
        {
          key: "template-details",
          icon: <InboxOutlined />,
          label: "Template Overview",
        },
        ...menuItems,
      ]}
      className={styles.siderMenu}
    />
  );
}

