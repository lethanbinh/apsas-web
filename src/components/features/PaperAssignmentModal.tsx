"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import styles from "./PaperAssignmentModal.module.css";
import Image from "next/image";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Spin } from "antd";
import {
  AssessmentTemplate,
  QuestionTemplate,
} from "@/services/assessmentTemplateService";

interface PaperAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: AssessmentTemplate;
}

const RubricCriteriaItem = ({
  rubric,
  index,
}: {
  rubric: RubricItem;
  index: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={styles["criteria-section"]}>
      <p
        className={styles["criteria-title"]}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Criteria {index + 1}
        <svg
          className={`${styles["criteria-toggle-arrow"]} ${
            isOpen ? styles.rotate : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </p>
      {isOpen && (
        <div className={styles["criteria-content"]}>
          <div className={styles["criteria-grid"]}>
            <div className={styles["input-group"]}>
              <label htmlFor={`criteria${index}Input`} className={styles.label}>
                Input
              </label>
              <input
                type="text"
                id={`criteria${index}Input`}
                value={rubric.input}
                readOnly
                className={styles["input-field"]}
              />
            </div>
            <div className={styles["input-group"]}>
              <label
                htmlFor={`criteria${index}Output`}
                className={styles.label}
              >
                Output
              </label>
              <input
                type="text"
                id={`criteria${index}Output`}
                value={rubric.output}
                readOnly
                className={styles["input-field"]}
              />
            </div>
          </div>

          <div className={styles["input-group"]}>
            <label htmlFor={`description_c${index}`} className={styles.label}>
              Description
            </label>
            <textarea
              id={`description_c${index}`}
              value={rubric.description}
              readOnly
              className={styles["input-field"]}
            ></textarea>
          </div>

          <div
            className={`${styles["input-group"]} ${styles["score-input-group"]}`}
          >
            <label htmlFor={`score_c${index}`} className={styles.label}>
              Score
            </label>
            <input
              type="text"
              id={`score_c${index}`}
              value={rubric.score}
              readOnly
              className={styles["input-field"]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionItem = ({
  question,
  index,
}: {
  question: QuestionTemplate;
  index: number;
}) => {
  const [isOpen, setIsOpen] = useState(index === 0);
  const [rubrics, setRubrics] = useState<RubricItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && question.id) {
      setIsLoading(true);
      rubricItemService
        .getRubricsForQuestion({
          assessmentQuestionId: question.id,
          pageNumber: 1,
          pageSize: 100,
        })
        .then((response) => {
          setRubrics(response.items);
        })
        .catch((err) => {
          console.error("Failed to fetch rubrics", err);
          setRubrics([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, question.id]);

  return (
    <li className={styles["question-list-item"]}>
      <h3
        className={styles["question-title"]}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Question {index + 1}: {question.questionText}
        <svg
          className={`${styles["question-toggle-arrow"]} ${
            isOpen ? styles.rotate : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </h3>
      {isOpen && (
        <div className={styles["question-content"]}>
          <p className={styles["description-text"]}>
            Sample Input: {question.questionSampleInput}
          </p>
          <p className={styles["description-text"]}>
            Sample Output: {question.questionSampleOutput}
          </p>
          <Image
            src="https://polyflow.ch/wp-content/uploads/2020/10/Title_DataScience-380x152.jpg"
            alt="Code Example"
            width={700}
            height={400}
            className={styles["code-image"]}
          />
          {isLoading ? (
            <div style={{ textAlign: "center", margin: "20px" }}>
              <Spin />
            </div>
          ) : (
            rubrics.map((rubric, i) => (
              <RubricCriteriaItem key={rubric.id} rubric={rubric} index={i} />
            ))
          )}
        </div>
      )}
    </li>
  );
};

const PaperAssignmentModal: React.FC<PaperAssignmentModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      if (portalElement && document.body.contains(portalElement)) {
        document.body.removeChild(portalElement);
      }
    };
  }, [isOpen, onClose, portalElement]);

  if (!isOpen || !portalElement) return null;

  return ReactDOM.createPortal(
    <div className={styles["modal-overlay"]}>
      <div className={styles["modal-content"]} ref={modalRef}>
        <button onClick={onClose} className={styles["close-button"]}>
          &times;
        </button>
        <h2 className={styles["modal-title"]}>
          {template?.name || "Assignment Details"}
        </h2>

        {!template ? (
          <div>No assessment template found for this assignment.</div>
        ) : (
          <ul>
            {template.papers.map((paper) =>
              paper.questions.map((question, index) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  index={index}
                />
              ))
            )}
          </ul>
        )}
      </div>
    </div>,
    portalElement
  );
};

export default PaperAssignmentModal;
