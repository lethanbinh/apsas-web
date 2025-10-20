"use client";
import React from "react";
import { Typography } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
// 1. Bỏ FreeMode, thêm Navigation
import { Pagination, Navigation } from "swiper/modules";

// 2. Thêm CSS cho Navigation
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import styles from "../classes/CoachesSlider.module.css";
import { CoachCard } from "../classes/CoachCard";

const { Title } = Typography;
const recommendedData = [
  {
    id: 1,
    name: "SangNM",
    category: "Frontend",
    imageUrl: "/classes/class.png",
  },
  {
    id: 2,
    name: "SangNM",
    category: "Frontend",
    imageUrl: "/classes/class.png",
  },
  {
    id: 3,
    name: "SangNM",
    category: "Frontend",
    imageUrl: "/classes/class.png",
  },
  {
    id: 4,
    name: "SangNM",
    category: "Frontend",
    imageUrl: "/classes/class.png",
  },
  {
    id: 5,
    name: "SangNM",
    category: "Frontend",
    imageUrl: "/classes/class.png",
  },
];

export default function RecommendedSlider() {
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
        // 3. Cập nhật modules
        modules={[Pagination, Navigation]}
        spaceBetween={24}
        // 4. Bỏ slidesPerView={"auto"}
        pagination={{ clickable: true }}
        className={styles.swiperContainer}
        // 6. THÊM BREAKPOINTS
        breakpoints={{
          // Khi màn hình >= 640px (tablet nhỏ)
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
            centeredSlides: false, // Bỏ căn giữa
          },
          // Khi màn hình >= 768px (tablet lớn)
          768: {
            slidesPerView: 3,
            spaceBetween: 24,
          },
          // Khi màn hình >= 1024px (desktop)
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