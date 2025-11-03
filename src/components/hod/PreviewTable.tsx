"use client";

import React from "react";
import { Table } from "antd";
import type { TableProps } from "antd";
import styles from "./PreviewPlanModal.module.css";

interface PreviewTableProps {
  columns: TableProps<any>["columns"];
  dataSource: any[];
}

export const PreviewTable: React.FC<PreviewTableProps> = ({
  columns,
  dataSource,
}) => {
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      className={styles.previewTable}
      scroll={{ x: 'max-content' }}
    />
  );
};
