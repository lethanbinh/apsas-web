"use client";

import type { TableProps } from "antd";
import { Button, Space, Table, Tag, Tooltip } from "antd";
import { CourseElement } from "@/services/semesterService";

interface CourseElementsTableProps {
  elements: CourseElement[];
  onEdit: (element: CourseElement) => void;
  onDelete: (elementId: number) => void;
  isSemesterEnded?: boolean;
  elementsWithAssessment?: Set<number>;
  elementsWithApprovedRequest?: Set<number>;
}

export const CourseElementsTable = ({
  elements,
  onEdit,
  onDelete,
  isSemesterEnded = false,
  elementsWithAssessment = new Set(),
  elementsWithApprovedRequest = new Set(),
}: CourseElementsTableProps) => {
  const getElementTypeLabel = (elementType: number) => {
    switch (elementType) {
      case 0:
        return "Assignment";
      case 1:
        return "Lab";
      case 2:
        return "PE";
      default:
        return "Unknown";
    }
  };

  const getElementTypeColor = (elementType: number) => {
    switch (elementType) {
      case 0:
        return "blue";
      case 1:
        return "green";
      case 2:
        return "orange";
      default:
        return "default";
    }
  };

  const columns: TableProps<CourseElement>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Element Type",
      dataIndex: "elementType",
      key: "elementType",
      render: (elementType: number) => (
        <Tag color={getElementTypeColor(elementType)}>
          {getElementTypeLabel(elementType)}
        </Tag>
      ),
    },
    {
      title: "Weight",
      dataIndex: "weight",
      key: "weight",
      render: (weight: number) => `${(weight * 100).toFixed(1)}%`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const hasAssessment = elementsWithAssessment.has(record.id);
        const hasApprovedRequest = elementsWithApprovedRequest.has(record.id);
        const isEditDisabled = isSemesterEnded || hasAssessment || hasApprovedRequest;
        const isDeleteDisabled = isSemesterEnded || hasApprovedRequest;

        let editTooltipTitle = "";
        if (isEditDisabled) {
          if (hasApprovedRequest) {
            editTooltipTitle = "This course element has an approved assign request. Editing is not allowed.";
          } else if (hasAssessment) {
            editTooltipTitle = "This course element already has an assessment template. Editing is not allowed.";
          } else if (isSemesterEnded) {
            editTooltipTitle = "The semester has ended. Editing is not allowed.";
          }
        }

        let deleteTooltipTitle = "";
        if (isDeleteDisabled) {
          if (hasApprovedRequest) {
            deleteTooltipTitle = "This course element has an approved assign request. Deletion is not allowed.";
          } else if (isSemesterEnded) {
            deleteTooltipTitle = "The semester has ended. Deletion is not allowed.";
          }
        }

        const editButton = (
          <Button
            type="link"
            onClick={() => onEdit(record)}
            disabled={isEditDisabled}
          >
            Edit
          </Button>
        );

        const deleteButton = (
          <Button
            type="link"
            danger
            onClick={() => onDelete(record.id)}
            disabled={isDeleteDisabled}
          >
            Delete
          </Button>
        );

        return (
          <Space>
            {isEditDisabled ? (
              <Tooltip title={editTooltipTitle}>
                <span>{editButton}</span>
              </Tooltip>
            ) : (
              editButton
            )}
            {isDeleteDisabled ? (
              <Tooltip title={deleteTooltipTitle}>
                <span>{deleteButton}</span>
              </Tooltip>
            ) : (
              deleteButton
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={elements}
      rowKey="id"
      pagination={false}
      scroll={{ x: 'max-content' }}
    />
  );
};

