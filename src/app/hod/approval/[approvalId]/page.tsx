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
          console.log(`Fetching approval list to find item ID: ${assignRequestId}`);
          const approvalResponse = await adminService.getApprovalList(1, 100); // Lấy 100 item
          const foundApproval = approvalResponse.items.find(item => item.id === assignRequestId);
          
          if (!foundApproval) {
            throw new Error(`Approval request with ID ${assignRequestId} not found.`);
          }
          
          const courseElementId = foundApproval.courseElementId;
          console.log(`Found courseElementId: ${courseElementId} for approvalId: ${assignRequestId}`);

          const templateResponse = await adminService.getAssessmentTemplateList(1, 100);
          
          const foundTemplate = templateResponse.items.find(t => t.assignRequestId === courseElementId);

          if (foundTemplate) {
            foundTemplate.status = foundApproval.status;
            setTemplate(foundTemplate);
            console.log("Successfully found template:", foundTemplate);
          } else {
            console.error(`No template found with assignRequestId matching: ${courseElementId}`);
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

  if (!template) {
    return (
      <Alert
        message="Not Found"
        description="Approval item could not be loaded."
        type="warning"
        showIcon
      />
    );
  }
  
  return <ApprovalDetail template={template} />;
}