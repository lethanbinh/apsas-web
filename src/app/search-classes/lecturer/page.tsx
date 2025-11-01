"use client";

import { Layout } from "@/components/layout/Layout";
import CourseGrid from "@/components/search/CourseGrid";
import RecommendedSlider from "@/components/search/RecommendedSlider";
import { SearchBanner } from "@/components/search/SearchBanner";
import React, { useState, useEffect, useMemo } from "react";
import { classService, ClassInfo } from "@/services/classService";
import { CourseCardProps } from "@/components/classes/CourseCard";
import { Spin } from "antd";
import { useLecturer } from "@/hooks/useLecturer";

const categories = ["UI/UX", "BE", "FE", "BA", "Testing"];
const background = "/classes/search-banner.png";

function mapApiDataToCardProps(classes: ClassInfo[]): CourseCardProps[] {
  return classes.map((cls) => ({
    id: cls.id,
    title: cls.courseName || cls.classCode,
    authorName: cls.lecturerName,
    description: cls.description,
    imageUrl: "/classes/class.png",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    lecturerId: cls.lecturerId,
  }));
}

export default function SearchClassesPage() {
  const [allCourses, setAllCourses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { lecturerId: currentLecturerId, isLoading: isLecturerLoading } =
    useLecturer();

  useEffect(() => {
    const fetchAllClasses = async () => {
      try {
        setIsLoading(true);
        const { classes } = await classService.getClassList({
          pageNumber: 1,
          pageSize: 1000,
        });
        setAllCourses(classes);
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllClasses();
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleCategoryClick = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory("");
    } else {
      setSelectedCategory(category);
    }
  };

  const filteredMappedCourses = useMemo(() => {
    let filtered = allCourses;

    if (selectedCategory) {
      filtered = filtered.filter(
        (cls) =>
          (cls.courseName || "")
            .toLowerCase()
            .includes(selectedCategory.toLowerCase()) ||
          (cls.description || "")
            .toLowerCase()
            .includes(selectedCategory.toLowerCase())
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (cls) =>
          (cls.courseName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (cls.classCode || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    return mapApiDataToCardProps(filtered);
  }, [allCourses, searchTerm, selectedCategory]);

  const pageLoading = isLoading || isLecturerLoading;

  return (
    <Layout>
      <SearchBanner
        backgroundImageUrl={background}
        categories={categories}
        onSearch={handleSearch}
        onCategoryClick={handleCategoryClick}
      />
      {pageLoading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      ) : (
        <CourseGrid
          courses={filteredMappedCourses}
          currentLecturerId={currentLecturerId}
        />
      )}
      <RecommendedSlider />
    </Layout>
  );
}