// Tên file: app/hod/approval/[approvalId]/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Spin, Alert } from "antd";
import ApprovalDetail from "@/components/hod/ApprovalDetail";

const fetchApprovalDetail = async (id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mockData = {
    id: "1", // Use the id from the param for real fetching
    title: "Assignment 01 - NguyenNT", // Fetch real title
    status: "Pending", // Fetch real status
    questionCount: 5, // Fetch real count
    details: {
      // Fetch real details based on id
      id: "item1",
      type: "Basic Assignment",
      databaseFileUrl: "#",
      exportUrl: "#",
      questions: [
        {
          id: "q1",
          title: "Question 1",
          name: "Name of card",
          content: "Card Number",
          imageUrl:
            "https://congnghethongtinaau.com/wp-content/uploads/2024/11/code-la-gi.jpg",
          criteria: [
            {
              id: "c1",
              title: "Criteria 1",
              details: {
                Name: "Name",
                Content: "Learn about the various elements...",
                DataType: "Numeric",
                Score: 2,
              },
            },
            {
              id: "c2",
              title: "Criteria 2",
              details: {
                Name: "Detail 2",
                Content: "...",
                DataType: "String",
                Score: 3,
              },
            },
            {
              id: "c3",
              title: "Criteria 3",
              details: {
                Name: "Detail 3",
                Content: "...",
                DataType: "Boolean",
                Score: 1,
              },
            },
            {
              id: "c4",
              title: "Criteria 4",
              details: {
                Name: "Detail 4",
                Content: "...",
                DataType: "Numeric",
                Score: 4,
              },
            },
          ],
        },
        {
          id: "q2",
          title: "Question 2",
          name: "Q2 Name",
          content: "Q2 Content",
          imageUrl: "https://via.placeholder.com/300",
          criteria: [
            {
              id: "c5",
              title: "Criteria 5",
              details: {
                Name: "...",
                Content: "...",
                DataType: "...",
                Score: 5,
              },
            },
          ],
        },
        {
          id: "q3",
          title: "Question 3",
          name: "Q3 Name",
          content: "Q3 Content",
          imageUrl: "https://via.placeholder.com/300",
          criteria: [],
        },
        {
          id: "q4",
          title: "Question 4",
          name: "Q4 Name",
          content: "Q4 Content",
          imageUrl: "https://via.placeholder.com/300",
          criteria: [],
        },
      ],
    },
  };

  // Return mock data for any ID for now, adjust logic as needed
  return mockData;
  // In a real app, you might return null if not found
  // return null;
};

export default function ApprovalDetailPage() {
  const params = useParams();
  const approvalId = params.approvalId as string;

  const [detailData, setDetailData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (approvalId) {
      setLoading(true);
      fetchApprovalDetail(approvalId)
        .then((data) => {
          if (data) {
            setDetailData(data);
          } else {
            setError("Approval item not found.");
          }
        })
        .catch((err) => {
          console.error("Error fetching approval detail:", err);
          setError("Failed to load approval details.");
        })
        .finally(() => {
          setLoading(false);
        });
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

  if (!detailData) {
    return (
      <Alert
        message="Not Found"
        description="Approval item could not be loaded."
        type="warning"
        showIcon
      />
    );
  }
  return <ApprovalDetail />;
}
