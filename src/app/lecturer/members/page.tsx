"use client";

import ClassRoster from "@/components/student/ClassRoster";
const id = localStorage.getItem("selectedClassId") || "";

export default function MemberListPage() {
  return <ClassRoster classId={id} />;
}