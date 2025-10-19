import CategorySlider from "@/components/classes/CategorySlider";
import MyCoursesGrid from "@/components/classes/MyCoursesGrid";
import { Layout } from "@/components/layout/Layout";
import React from "react";

export default function MyClassesPage() {
  return (
    <Layout>
      <MyCoursesGrid />
      <CategorySlider />
    </Layout>
  );
}
