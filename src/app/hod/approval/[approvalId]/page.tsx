"use client";

import ApprovalDetail from "@/components/hod/ApprovalDetail";
import { adminService } from "@/services/adminService";
import { ApiApprovalItem, ApiAssessmentTemplate } from "@/types";
import { Alert, Spin } from "antd";
import { useParams } from "next/navigation";
import React, { useState } from "react";

export default function ApprovalDetailPage() {
  const params = useParams();
  const approvalId = params.approvalId as string;

  const [template, setTemplate] = useState<ApiAssessmentTemplate | null>(null);
  const [approvalItem, setApprovalItem] = useState<ApiApprovalItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (approvalId) {
      const assignRequestId = parseInt(approvalId, 10);
      if (isNaN(assignRequestId)) {
        setError("Invalid Approval ID.");
        setLoading(false);
        return;
      }

      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          // BƯỚC 1: Lấy approval item
          console.log(`Fetching approval list to find item ID: ${assignRequestId}`);
          const approvalResponse = await adminService.getApprovalList(1, 100); 
          const foundApproval = approvalResponse.items.find(item => item.id === assignRequestId);
          
          if (!foundApproval) {
            throw new Error(`Approval request with ID ${assignRequestId} not found.`);
          }
          
          setApprovalItem(foundApproval); 
          
          // Lấy courseElementId từ item đó
          const courseElementId = foundApproval.courseElementId;
          console.log(`Found courseElementId: ${courseElementId} for approvalId: ${assignRequestId}`);

          // BƯỚC 2: Lấy Assessment Template
          const templateResponse = await adminService.getAssessmentTemplateList(1, 100);
          console.log(`Total templates found: ${templateResponse.items.length}`);
          console.log(`Looking for template with assignRequestId: ${assignRequestId} or courseElementId: ${courseElementId}`);
          
          // Thử tìm template bằng assignRequestId trước
          let foundTemplate = templateResponse.items.find(t => t.assignRequestId === assignRequestId);
          
          // Nếu không tìm thấy, thử tìm bằng courseElementId
          if (!foundTemplate && courseElementId) {
            console.log(`Template not found by assignRequestId, trying courseElementId: ${courseElementId}`);
            foundTemplate = templateResponse.items.find(t => t.courseElementId === courseElementId);
          }

          if (foundTemplate) {
            foundTemplate.status = foundApproval.status;
            setTemplate(foundTemplate);
            console.log("Successfully found template:", foundTemplate);
          } else {
            // Log thêm thông tin để debug
            console.warn(`No template found with assignRequestId: ${assignRequestId} or courseElementId: ${courseElementId}`);
            console.warn("Available templates:", templateResponse.items.map(t => ({
              id: t.id,
              assignRequestId: t.assignRequestId,
              courseElementId: t.courseElementId,
              name: t.name
            })));
            
            // Template có thể chưa được tạo, đây không phải là lỗi nghiêm trọng
            // Chỉ hiển thị warning và để component xử lý
            setError(`Assessment template not found for approval request ID ${assignRequestId}. The template may not have been created yet.`);
            setTemplate(null);
          }
        } catch (err: any) { 
          console.error("Error fetching approval detail:", err);
          setError(err.message || "Failed to load approval details.");
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [approvalId]);

  if (loading) {
    return (
      <Spin size="large" style={{ display: "block", marginTop: "50px" }} />
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!template || !approvalItem) {
    return (
      <Alert
        message="Not Found"
        description="Approval item or template data could not be loaded."
        type="warning"
        showIcon
      />
    );
  }
  
  return <ApprovalDetail template={template} approvalItem={approvalItem} />;
}