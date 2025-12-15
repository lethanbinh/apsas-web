"use client";

import ClassRoster from "@/components/student/ClassRoster";
import React, { useState, useEffect } from "react";
import { Alert } from "antd";

export default function MemberListPage() {
  const [classId, setClassId] = useState<string | null>(null);

  useEffect(() => {
    const storedClassId = localStorage.getItem("selectedClassId");
    setClassId(storedClassId);
  }, []);

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
