"use client";

import { Typography } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
// BỎ FreeMode và thêm Navigation (nếu muốn) hoặc để Pagination
import { Pagination, Navigation } from "swiper/modules";

// Import CSS của Swiper
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation"; // Thêm CSS cho nút

import { CategoryCard } from "./CategoryCard";
import styles from "./CategorySlider.module.css";

import {
  EditOutlined,
  CodeOutlined,
  DatabaseOutlined,
  RocketOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import React from "react";

const { Title } = Typography;

// --- Dữ liệu mẫu (Giữ nguyên, không thay đổi) ---
interface CategoryDataItem {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}
const categoryData: CategoryDataItem[] = [
  {
    id: 1,
    title: "Design",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmodadipiscing elit, sed do eiusmod",
    icon: <EditOutlined />,
    iconBgColor: "#E0FBF6",
    iconColor: "#00C49A",
  },
  {
    id: 2,
    title: "Development",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmodadipiscing elit, sed do eiusmod",
    icon: <CodeOutlined />,
    iconBgColor: "#E6E0F8",
    iconColor: "#9D82E8",
  },
  {
    id: 3,
    title: "Development",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmodadipiscing elit, sed do eiusmod",
    icon: <DatabaseOutlined />,
    iconBgColor: "#E0EEF8",
    iconColor: "#5B9DEF",
  },
  {
    id: 4,
    title: "Marketing",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmodadipiscing elit, sed do eiusmod",
    icon: <RocketOutlined />,
    iconBgColor: "#F8E0E0",
    iconColor: "#E88282",
  },
  {
    id: 5,
    title: "Business",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmodadipiscing elit, sed do eiusmod",
    icon: <DollarOutlined />,
    iconBgColor: "#F8F4E0",
    iconColor: "#E8D182",
  },
];
// --- Hết dữ liệu mẫu ---

export default function CategorySlider() {
  return (
    <div className={styles.sliderSection}>
      <Title level={3} className={styles.sectionTitle}>
        Course category
      </Title>

      <Swiper
        // CẬP NHẬT MODULES
        modules={[Pagination, Navigation]} // Thêm Navigation (nút)
        spaceBetween={30}
        // Bỏ slidesPerView="auto" và freeMode

        pagination={{ clickable: true }}
        className={styles.swiperContainer}
        // THÊM BREAKPOINTS ĐỂ RESPONSIVE
        breakpoints={{
          // Khi màn hình >= 640px
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          // Khi màn hình >= 1024px
          1024: {
            slidesPerView: 3, // 3 slide trên màn lớn
            spaceBetween: 30,
          },
        }}
        // slidesPerView={1.2} // Số slide mặc định trên mobile (dưới 640px)
        // centeredSlides={true} // Căn giữa slide trên mobile nếu slidesPerView là 1.2
      >
        {categoryData.map((category) => (
          <SwiperSlide key={category.id} className={styles.swiperSlide}>
            <CategoryCard
              icon={category.icon}
              title={category.title}
              description={category.description}
              iconBgColor={category.iconBgColor}
              iconColor={category.iconColor}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
