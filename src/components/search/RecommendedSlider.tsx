"use client";
import React, { useState, useEffect } from "react";
import { Typography, Spin } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import styles from "../classes/CoachesSlider.module.css";
import { CoachCard } from "../classes/CoachCard";
import { classService, ClassInfo } from "@/services/classService";

const { Title } = Typography;

interface MappedCoachProps {
  id: string | number;
  name: string;
  category: string;
  imageUrl: string;
}

function shuffleArray(array: any[]) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

function mapClassToCoachProps(cls: ClassInfo): MappedCoachProps {
  return {
    id: cls.id,
    name: cls.lecturerName,
    category: cls.courseName,
    imageUrl: "/classes/class.png",
  };
}

export default function RecommendedSlider() {
  const [recommendedData, setRecommendedData] = useState<MappedCoachProps[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        const { classes } = await classService.getClassList({
          pageNumber: 1,
          pageSize: 20,
        });

        const shuffled = shuffleArray(classes);
        const recommendations = shuffled
          .slice(0, 5)
          .map(mapClassToCoachProps);

        setRecommendedData(recommendations);
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.sliderSection} style={{ textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (recommendedData.length === 0) {
    return null;
  }

  return (
    <div className={styles.sliderSection}>
      <Title
        level={3}
        style={{
          fontWeight: 700,
          color: "#2F327D",
          marginBottom: "30px",
          fontSize: "2rem",
          paddingLeft: "5%",
        }}
      >
        Recommended for you
      </Title>

      <Swiper
        modules={[Pagination, Navigation]}
        spaceBetween={24}
        pagination={{ clickable: true }}
        className={styles.swiperContainer}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
            centeredSlides: false,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 24,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 24,
          },
        }}
        slidesPerView={1.4}
      >
        {recommendedData.map((coach) => (
          <SwiperSlide key={coach.id} className={styles.swiperSlide}>
            <CoachCard
              name={coach.name}
              category={coach.category}
              imageUrl={coach.imageUrl}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}