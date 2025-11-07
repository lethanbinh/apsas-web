"use client";

import PaperAssignmentModal from "@/components/features/PaperAssignmentModal";
import {
  Collapse,
  Spin,
  Card,
  Button,
  List,
  Typography,
  Descriptions,
  Space,
  Alert,
} from "antd";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import styles from "./DetailAsm.module.css";
import {
  CourseElement,
  courseElementService,
} from "@/services/courseElementService";
import { classService } from "@/services/classService";
import {
  assessmentTemplateService,
  AssessmentTemplate,
} from "@/services/assessmentTemplateService";
import {
  assessmentFileService,
  AssessmentFile,
} from "@/services/assessmentFileService";
import {
  PaperClipOutlined,
  DownloadOutlined,
  FolderOutlined,
} from "@ant-design/icons";

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

const convertToDate = (dateString?: string): Date | null => {
  if (!dateString) return null;
  if (dateString.endsWith("Z")) {
    return new Date(dateString);
  }
  return new Date(dateString + "Z");
};

const AssignmentDetailItem = ({
  assignment,
  template,
}: {
  assignment: CourseElement;
  template?: AssessmentTemplate;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assessmentFiles, setAssessmentFiles] = useState<AssessmentFile[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);

  useEffect(() => {
    if (template?.id) {
      const fetchFiles = async () => {
        setIsFilesLoading(true);
        try {
          const response = await assessmentFileService.getFilesForTemplate({
            assessmentTemplateId: template.id,
            pageNumber: 1,
            pageSize: 100,
          });
          setAssessmentFiles(response.items);
        } catch (error) {
          console.error("Failed to fetch assessment files:", error);
          setAssessmentFiles([]);
        } finally {
          setIsFilesLoading(false);
        }
      };
      fetchFiles();
    }
  }, [template]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card bordered={false}>
          <Descriptions column={1} layout="vertical" title="Assignment Details">
            <Descriptions.Item label="Description">
              <Paragraph>{assignment.description}</Paragraph>
            </Descriptions.Item>

            <Descriptions.Item label="Requirement Files">
              {isFilesLoading ? (
                <Spin />
              ) : (
                <>
                  {assessmentFiles.length > 0 ? (
                    <List
                      dataSource={assessmentFiles}
                      renderItem={(file) => (
                        <List.Item>
                          <a
                            key={file.id}
                            href={file.fileUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <PaperClipOutlined style={{ marginRight: 8 }} />
                            {file.name}
                          </a>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Text type="secondary">No requirement files.</Text>
                  )}
                </>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Button type="primary" onClick={openModal} style={{ marginTop: 16 }}>
            View Assignment Paper
          </Button>
        </Card>

        <Card title="Submissions">
          <List>
            <List.Item
              actions={[
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                  key="download"
                />,
              ]}
            >
              <List.Item.Meta
                avatar={<FolderOutlined />}
                title={
                  <Link href="/lecturer/assignment-grading">Lethanhbinh</Link>
                }
                description="lethanhbinh-asm.zip"
              />
            </List.Item>
          </List>
        </Card>
      </Space>

      <PaperAssignmentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        template={template}
      />
    </>
  );
};

const DetailAssignmentPage = () => {
  const [assignments, setAssignments] = useState<CourseElement[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    const classId = localStorage.getItem("selectedClassId");
    setSelectedClassId(classId);
    if (!classId) {
      setError("No class selected. Please select a class first.");
      setIsLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      setIsLoading(true);
      const classData = await classService.getClassById(selectedClassId);
      if (!classData) {
        throw new Error("Class not found");
      }

      const [allElements, templateResponse] = await Promise.all([
        courseElementService.getCourseElements({
          pageNumber: 1,
          pageSize: 1000,
        }),
        assessmentTemplateService.getAssessmentTemplates({
          pageNumber: 1,
          pageSize: 1000,
        }),
      ]);

      const filteredAssignments = allElements.filter(
        (el) => el.semesterCourseId.toString() === classData.semesterCourseId
      );

      setAssignments(filteredAssignments);
      setTemplates(templateResponse.items);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "Failed to load assignments.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className={styles.container}>
        <div className={styles["header-section"]}>
          <h1 className={styles.title}>Practical Exams</h1>
          <Link href="/lecturer/dashboard" className={styles["dashboard-link"]}>
            Dashboard
          </Link>
        </div>

        {isLoading && (
          <div className={styles["loading-spinner"]}>
            <Spin size="large" />
          </div>
        )}

        {!isLoading && error && <Alert message={error} type="error" showIcon />}

        {!isLoading && !error && selectedClassId && (
          <Collapse accordion>
            {assignments.length > 0 ? (
              assignments.map((assignment) => {
                const matchingTemplate = templates.find(
                  (t) => t.courseElementId === assignment.id
                );
                return (
                  <Panel header={assignment.name} key={assignment.id}>
                    <AssignmentDetailItem
                      assignment={assignment}
                      template={matchingTemplate}
                    />
                  </Panel>
                );
              })
            ) : (
              <Alert
                message="No assignments found for this class."
                type="info"
              />
            )}
          </Collapse>
        )}
      </div>
    </div>
  );
};

export default DetailAssignmentPage;