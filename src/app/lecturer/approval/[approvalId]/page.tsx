"use client";

import ApprovalDetail from "@/components/lecturer/ApprovalDetail";
import { adminService } from "@/services/adminService";
import { ApiApprovalItem, ApiAssessmentTemplate } from "@/types";
import { Alert, Spin } from "antd";
import { useParams } from "next/navigation";
import React, { useState } from "react";

export default function LecturerApprovalDetailPage() {
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
          const approvalResponse = await adminService.getApprovalList(1, 1000); 
          const foundApproval = approvalResponse.items.find(item => item.id === assignRequestId);
          
          if (!foundApproval) {
            throw new Error(`Approval request with ID ${assignRequestId} not found.`);
          }
          
          setApprovalItem(foundApproval); 
          
          // BƯỚC 2: Lấy Assessment Template - chỉ tìm theo assignRequestId (chính xác nhất)
          const templateResponse = await adminService.getAssessmentTemplateList(1, 1000);
          console.log(`Total templates found: ${templateResponse.items.length}`);
          console.log(`Looking for template with assignRequestId: ${assignRequestId}`);
          
          // Chỉ tìm template bằng assignRequestId (mỗi assign request chỉ có 1 template)
          const foundTemplate = templateResponse.items.find(t => t.assignRequestId === assignRequestId);

          if (foundTemplate) {
            // Set status từ approval item (assign request status)
            foundTemplate.status = foundApproval.status;
            setTemplate(foundTemplate);
            console.log("Successfully found template:", foundTemplate);
          } else {
            // Template chưa được tạo - đây là trường hợp hợp lệ khi lecturer chưa tạo template
            console.warn(`No template found with assignRequestId: ${assignRequestId}`);
            console.warn("This may mean the template has not been created yet by the lecturer.");
            
            // Không set error, chỉ hiển thị thông báo rằng template chưa được tạo
            // Component sẽ xử lý việc hiển thị khi không có template
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

  if (!approvalItem) {
    return (
      <Alert
        message="Not Found"
        description="Approval request could not be loaded."
        type="error"
        showIcon
      />
    );
  }

  // If template is not found, show a message but still allow viewing the approval item
  if (!template) {
    return (
      <Alert
        message="Template Not Created"
        description="The assessment template for this approval request has not been created yet by the lecturer. Please wait for the lecturer to create the template before reviewing."
        type="info"
        showIcon
      />
    );
  }
  
  return <ApprovalDetail template={template} approvalItem={approvalItem} />;
}

