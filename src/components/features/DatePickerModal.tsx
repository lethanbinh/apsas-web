"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./DatePickerModal.module.css";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
  minDate?: Date;
  maxDate?: Date;
  showTimeSelect?: boolean;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  onDateSelect,
  selectedDate,
  minDate,
  maxDate,
  showTimeSelect = false,
}) => {
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      if (portalElement && document.body.contains(portalElement)) {
        document.body.removeChild(portalElement);
      }
      setPortalElement(null);
      return;
    }

    if (!portalElement) {
      const el = document.createElement("div");
      document.body.appendChild(el);
      setPortalElement(el);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalContentRef.current &&
        !modalContentRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (portalElement && document.body.contains(portalElement)) {
        document.body.removeChild(portalElement);
      }
    };
  }, [isOpen, onClose, portalElement]);

  if (!isOpen || !portalElement) return null;

  return ReactDOM.createPortal(
    <div className={styles["modal-overlay"]}>
      <div className={styles["modal-content"]} ref={modalContentRef}>
        <DatePicker
          selected={selectedDate}
          onChange={(date: Date | null) => {
            if (date) {
              onDateSelect(date);
            }
          }}
          inline
          calendarClassName={styles["custom-calendar"]}
          minDate={minDate}
          maxDate={maxDate}
          showTimeSelect={showTimeSelect}
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="Pp"
        />
      </div>
    </div>,
    portalElement
  );
};

export default DatePickerModal;