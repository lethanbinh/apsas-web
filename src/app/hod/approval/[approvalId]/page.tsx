"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Spin, Alert } from "antd";
import ApprovalDetail from "@/components/hod/ApprovalDetail";
import { adminService } from "@/services/adminService";
import { ApiAssessmentTemplate, ApiApprovalItem } from "@/types";

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
          
          // So sánh assignRequestId (của Template) với courseElementId (của Approval)
          const foundTemplate = templateResponse.items.find(t => t.assignRequestId === assignRequestId);

          if (foundTemplate) {
            foundTemplate.status = foundApproval.status;
            setTemplate(foundTemplate);
            console.log("Successfully found template:", foundTemplate);
          } else {
            console.error(`No template found with assignRequestId matching: ${assignRequestId}`);
            throw new Error("Assessment template not found for this approval request.");
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