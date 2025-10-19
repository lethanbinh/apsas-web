"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Import styles
import styles from './DatePickerModal.module.css'; // Custom styles for modal positioning and look

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ isOpen, onClose, onDateSelect, selectedDate }) => {
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
      const el = document.createElement('div');
      document.body.appendChild(el);
      setPortalElement(el);
    }

    // Handle clicks outside the modal to close it
    const handleClickOutside = (event: MouseEvent) => {
      if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (portalElement && document.body.contains(portalElement)) {
        document.body.removeChild(portalElement);
      }
    };
  }, [isOpen, onClose, portalElement]);

  if (!isOpen || !portalElement) return null;

  return ReactDOM.createPortal(
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-content']} ref={modalContentRef}>
        <DatePicker
          selected={selectedDate}
          onChange={(date: Date) => {
            onDateSelect(date);
            onClose();
          }}
          inline
          calendarClassName={styles['custom-calendar']}
        />
      </div>
    </div>,
    portalElement
  );
};

export default DatePickerModal;
