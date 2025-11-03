"use client";

import React from "react";
import { Typography } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";

// 1. THAY ĐỔI MODULES
// Bỏ FreeMode, Thêm Navigation
import { Pagination, Navigation } from "swiper/modules";

// Import CSS
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation"; // 2. THÊM CSS CHO NÚT

import { CoachCard } from "./CoachCard";
import styles from "./CoachesSlider.module.css";

const { Title } = Typography;

// Dữ liệu mẫu (giữ nguyên)
const coachData = [
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

export default function CoachesSlider() {
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
        Coaches list
      </Title>

      <Swiper
        // 3. CẬP NHẬT MODULES
        modules={[Pagination, Navigation]}
        spaceBetween={24}
        
        // 4. BỎ slidesPerView={4} CỐ ĐỊNH

        pagination={{ clickable: true }}
        className={styles.swiperContainer}

        // 6. THÊM BREAKPOINTS ĐỂ RESPONSIVE
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
            slidesPerView: 4, // 4 slides như bạn muốn
            spaceBetween: 24,
          },
        }}
        
        // 7. THÊM SETTING CHO MOBILE (MẶC ĐỊNH)
        slidesPerView={1.4} // Hiển thị 1 card và 1 phần card tiếp theo
      >
        {coachData.map((coach) => (
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