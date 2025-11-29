import { Spin } from "antd";
import React from "react";

interface LoadingSpinnerProps {
  loading: boolean;
  minHeight?: string;
  size?: "small" | "default" | "large";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  loading, 
  minHeight = "400px",
  size = "large"
}) => {
  if (!loading) return null;
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight 
    }}>
      <Spin size={size} />
    </div>
  );
};

