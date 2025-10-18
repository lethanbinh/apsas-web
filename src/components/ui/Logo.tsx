"use client";

import React, { useState } from "react";
import Image from "next/image";
import logoWebp from "@/assets/APSAS_logo.webp";
import logoPng from "@/assets/APSAS_logo.png"; // Fallback to PNG if webp fails

interface LogoComponentProps {
    size?: "small" | "medium" | "large";
}

export const LogoComponent: React.FC<LogoComponentProps> = ({ size = "large" }) => {
    const [imageError, setImageError] = useState(false);
    
    const getLogoDimensions = () => {
        switch (size) {
            case "small":
                return { width: 64, height: 32, className: "h-8 w-auto" };
            case "medium":
                return { width: 90, height: 36, className: "h-9 w-auto" };
            case "large":
                return { width: 150, height: 75};
            default:
                return { width: 90, height: 36, className: "h-9 w-auto" };
        }
    };

    const { width, height, className } = getLogoDimensions();

    if (imageError) {
        // Fallback: Display a styled text if image fails to load
        return (
            <div className={`
                ${size === "small" ? "w-16 h-8" : size === "medium" ? "w-20 h-10" : "w-24 h-12"}
                bg-blue-500 rounded-full flex items-center justify-center shadow-md
            `}>
                <span className="text-white font-bold text-sm">APSAS</span> 
            </div>
        );
    }

    return (
        <Image
            src={logoWebp}
            alt="APSAS Logo"
            width={width}
            height={height}
            className={className}
            onError={() => setImageError(true)}
            unoptimized
            priority
        />
    );
};
