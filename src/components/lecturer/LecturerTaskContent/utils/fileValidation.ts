import type { UploadProps } from "antd";
import { Upload } from "antd";
import type { NotificationInstance } from "antd/es/notification/interface";

export const beforeUploadSql: (notification: NotificationInstance) => UploadProps["beforeUpload"] = (notification) => (file) => {
  const fileName = file.name.toLowerCase();
  const isSqlExtension = fileName.endsWith(".sql");
  
  if (!isSqlExtension) {
    notification.error({
      message: "Invalid File Type",
      description: "Only SQL files are accepted! Please select a file with .sql extension",
    });
    return Upload.LIST_IGNORE;
  }
  
  const isLt100M = file.size / 1024 / 1024 < 100;
  if (!isLt100M) {
    notification.error({
      message: "File Too Large",
      description: "File must be smaller than 100MB!",
    });
    return Upload.LIST_IGNORE;
  }
  
  return false;
};

export const beforeUploadPostman: (notification: NotificationInstance) => UploadProps["beforeUpload"] = (notification) => (file) => {
  const fileName = file.name.toLowerCase();
  const isPostmanExtension = fileName.endsWith(".postman_collection");
  
  if (!isPostmanExtension) {
    notification.error({
      message: "Invalid File Type",
      description: "Only Postman collection files are accepted! Please select a file with .postman_collection extension",
    });
    return Upload.LIST_IGNORE;
  }
  
  const isLt100M = file.size / 1024 / 1024 < 100;
  if (!isLt100M) {
    notification.error({
      message: "File Too Large",
      description: "File must be smaller than 100MB!",
    });
    return Upload.LIST_IGNORE;
  }
  
  return false;
};

