"use client";

import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";
import { ROLES } from "@/lib/constants";
import { ClassInfo as ClassInfoType } from "@/services/classService";
import { GradingGroup, gradingGroupService } from "@/services/gradingGroupService";
import { Divider, Typography } from "antd";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./ClassInfo.module.css";
import { ClassInfoAuthor } from "./ClassInfoAuthor";
import { ClassInfoHeader } from "./ClassInfoHeader";
import { ExportModal } from "./ExportModal";
import { useExportGradeReport } from "./hooks/useExportGradeReport";

const { Title, Paragraph } = Typography;

export default function ClassInfo({ 
  classData, 
  showTotalStudents = true 
}: { 
  classData: ClassInfoType;
  showTotalStudents?: boolean;
}) {
  const { user } = useAuth();
  const { studentId } = useStudent();
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [gradingGroups, setGradingGroups] = useState<GradingGroup[]>([]);

  useEffect(() => {
    const fetchGradingGroups = async () => {
      if (user?.role === ROLES.LECTURER && user?.id) {
        try {
          const groups = await gradingGroupService.getGradingGroups({
            lecturerId: Number(user.id),
          });
          setGradingGroups(groups);
        } catch (err) {
          console.error("Failed to fetch grading groups:", err);
        }
      }
    };
    fetchGradingGroups();
  }, [user]);

  const { handleConfirmExport } = useExportGradeReport({
    user,
    studentId,
    classData,
    gradingGroups,
  });
  const handleExportConfirm = async (exportTypes: {
    assignment: boolean;
    lab: boolean;
    practicalExam: boolean;
  }) => {
      setExportModalVisible(false);
    await handleConfirmExport(exportTypes);
  };
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.imageWrapper}>
        <Image
          src="/classes/class-info.png"
          alt="Class Banner"
          width={1200}
          height={400}
          className={styles.image}
        />
      </div>

      <div className={styles.contentWrapper}>
        <ClassInfoHeader classData={classData} showTotalStudents={showTotalStudents} />

        <Title level={4} style={{ marginTop: "30px" }}>
          Class Description
        </Title>
        <Paragraph
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.7,
            color: "#555",
            marginBottom: "30px",
          }}
        >
          {classData.description}
        </Paragraph>

        <Divider />
        <ClassInfoAuthor lecturerName={classData.lecturerName} />
      </div>

      <ExportModal
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
