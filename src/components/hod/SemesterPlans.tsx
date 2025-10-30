// Tên file: src/components/hod/SemesterPlans.tsx
"use client";

import React, { useState, useEffect } from "react"; // <-- Thêm useEffect
import { Row, Col, Typography, Tabs, App, Spin, Alert } from "antd"; // <-- Thêm Spin, Alert
import type { TabsProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button";
import { PlanCard } from "./PlanCard";
import styles from "./SemesterPlans.module.css";
import { CreatePlanModal } from "./CreatePlanModal";
// Bỏ import SemesterList vì component này sẽ tự fetch
// import SemesterListComponent from "./SemesterList";
import { adminService } from '@/services/adminService'; // <-- Import service
import { Semester } from '@/types'; // <-- Import kiểu Semester

const { Title, Text } = Typography; // <-- Thêm Text

// --- BỎ DỮ LIỆU GIẢ planData ---
// const planData = [ ... ];

// --- THAY ĐỔI PlansGrid ---
// Component nội bộ để render grid các plans
// Bây giờ nhận 'semesters' làm prop
interface PlansGridProps {
  semesters: Semester[];
}
const PlansGrid: React.FC<PlansGridProps> = ({ semesters }) => {
    if (!semesters || semesters.length === 0) {
        return <Text type="secondary">Không có kế hoạch học kỳ nào.</Text>;
    }
    return (
        <Row gutter={[32, 32]} justify="start">
            {semesters.map((semester) => (
                <Col key={semester.id} xs={24} md={8}>
                    <PlanCard
                        // Ánh xạ dữ liệu Semester vào props của PlanCard
                        title={semester.semesterCode} // Sử dụng semesterCode làm title
                        authorName={`Năm học: ${semester.academicYear}`} // Hiển thị năm học
                        // Các props khác dùng tạm giá trị mặc định/placeholder
                        authorAvatarUrl="/classes/avatar-teacher.png" // Ảnh avatar mặc định
                        imageUrl="/classes/class.png" // Ảnh thẻ mặc định
                    />
                </Col>
            ))}
        </Row>
    );
};


export default function SemesterPlans() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // --- THÊM STATE ĐỂ LƯU DỮ LIỆU THẬT ---
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // ----------------------------------------

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoading(true);
        setError(null);
        const pageNumber = 1;
        const pageSize = 10; // Lấy 10 học kỳ đầu tiên

        console.log(`SemesterPlans: Fetching semesters...`);
        // Gọi API để lấy danh sách học kỳ thật
        const fetchedSemesters = await adminService.getPaginatedSemesters(pageNumber, pageSize);
        console.log('SemesterPlans: Fetched successfully:', fetchedSemesters);
        setSemesters(fetchedSemesters);

      } catch (err: any) {
        console.error('SemesterPlans: Error fetching semesters:', err);
        setError(err.message || 'Failed to load semester plans.');
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, []); // [] đảm bảo chỉ chạy 1 lần
  // ----------------------------------------

  const handleCreatePlan = (values: any) => {
    console.log("Creating new plan with:", values);
    setIsModalOpen(false);
    // TODO: Sau khi tạo plan thành công, nên gọi lại fetchSemesters() để cập nhật danh sách
    // fetchSemesters(); // Gọi lại hàm fetch
  };

   // --- CẬP NHẬT TAB ITEMS ĐỂ TRUYỀN DỮ LIỆU THẬT ---
   // Hiển thị loading/error hoặc grid dữ liệu thật
   const renderTabContent = () => {
    if (loading) {
      return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Spin /></div>;
    }
    if (error) {
      return <Alert message="Lỗi" description={error} type="error" showIcon />;
    }
    return <PlansGrid semesters={semesters} />; // Truyền dữ liệu thật vào PlansGrid
  };

  // Cập nhật lại tabItems để dùng hàm renderTabContent
  const tabItems: TabsProps["items"] = [
    { key: "1", label: "Ongoing", children: renderTabContent() },
    { key: "2", label: "Ended", children: renderTabContent() }, // Tạm thời dùng chung, bạn có thể fetch riêng cho từng tab
    { key: "3", label: "Upcoming", children: renderTabContent() },
    { key: "4", label: "Drafts", children: renderTabContent() },
  ];
  // ----------------------------------------------

  return (
    <App>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Title level={2} /* ... */ >
            Semester plans
          </Title>
          <Button /* ... */ onClick={() => setIsModalOpen(true)}>
            Create semester plan
          </Button>
        </div>

        {/* Tabs giờ sẽ hiển thị loading/error hoặc dữ liệu thật */}
        <Tabs defaultActiveKey="1" items={tabItems} className={styles.tabs} />

        {/* --- BỎ SemesterListComponent ở đây --- */}
        {/* <div style={{ marginTop: '40px' }}>
          <SemesterListComponent />
        </div> */}

      </div>

      <CreatePlanModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onCreate={handleCreatePlan}
      />
    </App>
  );
}