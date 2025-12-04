"use client";

import { Alert, Button, Modal, Space, Table } from "antd";

interface ImportError {
  row: number;
  accountCode?: string;
  email?: string;
  error: string;
}

interface ImportResults {
  success: number;
  failed: number;
  errors: ImportError[];
}

interface ImportResultsModalProps {
  open: boolean;
  results: ImportResults;
  onClose: () => void;
}

const importResultColumns = [
  {
    title: "Row",
    dataIndex: "row",
    key: "row",
    width: 80,
  },
  {
    title: "Account Code",
    dataIndex: "accountCode",
    key: "accountCode",
    width: 120,
  },
  {
    title: "Email",
    dataIndex: "email",
    key: "email",
    width: 200,
  },
  {
    title: "Error",
    dataIndex: "error",
    key: "error",
    ellipsis: true,
  },
];

export const ImportResultsModal = ({
  open,
  results,
  onClose,
}: ImportResultsModalProps) => {
  return (
    <Modal
      title="Import Results"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={800}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          message={`Import Summary: ${results.success} successful, ${results.failed} failed`}
          type={results.failed === 0 ? "success" : "warning"}
          showIcon
        />
        {results.errors.length > 0 && (
          <div>
            <h4>Errors:</h4>
            <Table
              columns={importResultColumns}
              dataSource={results.errors.map((err, idx) => ({ ...err, key: idx }))}
              pagination={{ pageSize: 10 }}
              scroll={{ y: 300 }}
              size="small"
            />
          </div>
        )}
      </Space>
    </Modal>
  );
};


