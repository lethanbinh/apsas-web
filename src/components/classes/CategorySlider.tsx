"use client";
import { Typography } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
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
export default function CategorySlider() {
  return (
    <div className={styles.sliderSection}>
      <Title level={3} className={styles.sectionTitle}>
        Course category
      </Title>
      <Swiper
        modules={[Pagination, Navigation]}
        spaceBetween={30}
        pagination={{ clickable: true }}
        className={styles.swiperContainer}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 30,
          },
        }}
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