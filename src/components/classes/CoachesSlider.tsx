"use client";

import React from "react";
import { Typography } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";



import { Pagination, Navigation } from "swiper/modules";


import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import { CoachCard } from "./CoachCard";
import styles from "./CoachesSlider.module.css";

const { Title } = Typography;


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