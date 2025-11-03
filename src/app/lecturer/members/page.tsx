"use client";

import ClassRoster from "@/components/student/ClassRoster";
import { useEffect, useState } from "react";

export default function MemberListPage() {
  const [classId, setClassId] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setClassId(localStorage.getItem("selectedClassId") || "");
    }
  }, []);

  return <ClassRoster classId={classId} />;
}