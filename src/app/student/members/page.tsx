"use client";

import ClassRoster from "@/components/student/ClassRoster";
import React, { useState, useEffect } from "react";
import { Alert, Spin } from "antd";

export default function MemberListPage() {
  const [classId, setClassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedClassId = localStorage.getItem("selectedClassId");
    
    if (!storedClassId) {
      setIsLoading(false);
      return;
    }

    setClassId(storedClassId);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div>
        <Spin size="large" style={{ display: "block", textAlign: "center", padding: "50px" }} />
      </div>
    );
  }

  if (!classId) {
    return (
      <div>
        <Alert 
          message="No class selected" 
          description="Please select a class from My Classes first." 
          type="warning" 
          showIcon 
        />
      </div>
    );
  }

  return (
    <div>
      <ClassRoster classId={classId} />
    </div>
  );
}
