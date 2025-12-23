import AllCoursesSlider from "@/components/classes/AllCoursesSlider";
import CategorySlider from "@/components/classes/CategorySlider";
import CoachesSlider from "@/components/classes/CoachesSlider";
import JoinClassSection from "@/components/classes/JoinClassSection";
import { Layout } from "@/components/layout/Layout";
import React from "react";
export default function ClassesPage() {
  return (
    <Layout>
      <JoinClassSection />
      <CategorySlider />
      <AllCoursesSlider />
      <CoachesSlider />
    </Layout>
  );
}