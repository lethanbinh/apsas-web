"use client";

import { Layout } from "@/components/layout/Layout";
import CourseGrid from "@/components/search/CourseGrid";
import RecommendedSlider from "@/components/search/RecommendedSlider";
import { SearchBanner } from "@/components/search/SearchBanner";
import React from "react";

const categories = ["UI/UX", "BE", "FE", "BA", "Testing"];
const background = "/classes/search-banner.png";
export default function SearchClassesPage() {
  const handleSearch = (value: string) => {
    console.log("Searching for:", value);
  };

  const handleCategoryClick = (category: string) => {
    console.log("Category clicked:", category);
  };
  return (
    <Layout>
      <SearchBanner
        backgroundImageUrl={background}
        categories={categories}
        onSearch={handleSearch}
        onCategoryClick={handleCategoryClick}
      />
      <CourseGrid />
      <RecommendedSlider />
    </Layout>
  );
}
