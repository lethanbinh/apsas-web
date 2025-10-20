"use client";

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './PaperAssignmentModal.module.css';
import Image from 'next/image'; // Import Image component for Next.js optimized images

interface PaperAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaperAssignmentModal: React.FC<PaperAssignmentModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>({
    'question01': true, // Open by default as per image
    'question02': false,
    'question03': false,
    'question04': false,
  });
  const [openCriteria, setOpenCriteria] = useState<Record<string, boolean>>({
    'question01_criteria01': false,
    'question01_criteria02': false,
    'question01_criteria03': false,
    'question01_criteria04': false,
  });

  useEffect(() => {
    if (!isOpen) {
      // Clean up portal container when modal is closed
      if (portalElement && document.body.contains(portalElement)) {
        document.body.removeChild(portalElement);
      }
      setPortalElement(null);
      return;
    }

    // Create a div element for the portal if it doesn't exist
    if (!portalElement) {
      const el = document.createElement('div');
      document.body.appendChild(el);
      setPortalElement(el);
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Clean up the portal container when the component unmounts or modal is closed
      if (portalElement && document.body.contains(portalElement)) {
        document.body.removeChild(portalElement);
      }
    };
  }, [isOpen, onClose, portalElement]);

  if (!isOpen || !portalElement) return null;

  return ReactDOM.createPortal(
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-content']} ref={modalRef}>
        <button onClick={onClose} className={styles['close-button']}>&times;</button>
        <h2 className={styles['modal-title']}>Paper Assignment 01</h2>

        {/* Question 01 */}
        <div className="mb-8">
          <h3 className={styles['question-title']} onClick={() => setOpenQuestions(prev => ({ ...prev, 'question01': !prev['question01'] }))}>
            Question 01: Create a program
            <svg
              className={`${styles['question-toggle-arrow']} ${openQuestions.question01 ? styles.rotate : ''}`}
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
          {openQuestions.question01 && (
            <div className={styles['question-content']}>
              <p className={styles['description-text']}>
                TOTC is a platform that allows educators to create online classes
                whereby they can store the course materials online; manage
                assignments, quizzes and exams; monitor due dates; grade
                results and provide students with feedback all in one place...
              </p>
              <Image
                src="https://polyflow.ch/wp-content/uploads/2020/10/Title_DataScience-380x152.jpg" // Assuming you'll add this image to /public/img
                alt="Code Example"
                width={700}
                height={400}
                className={styles['code-image']}
              />

              <div className={styles['criteria-section']}>
                <p className={styles['criteria-title']} onClick={() => setOpenCriteria(prev => ({ ...prev, 'question01_criteria01': !prev['question01_criteria01'] }))}>
                  Criteria 1
                  <svg
                    className={`${styles['criteria-toggle-arrow']} ${openCriteria.question01_criteria01 ? styles.rotate : ''}`}
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
                {openCriteria.question01_criteria01 && (
                  <div className={styles['criteria-content']}>
                    <div className={styles['criteria-grid']}>
                      <div className={styles['input-group']}>
                        <label htmlFor="criteria1Input" className={styles.label}>Criteria 1 input</label>
                        <input type="text" id="criteria1Input" defaultValue="5, 5" className={styles['input-field']} />
                      </div>
                      <div className={styles['input-group']}>
                        <label htmlFor="criteria1Output" className={styles.label}>Criteria 1 output</label>
                        <input type="text" id="criteria1Output" defaultValue="10" className={styles['input-field']} />
                      </div>
                    </div>

                    <p className={styles.label}>Test case data type</p>
                    <div className={styles['radio-group']}>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="numeric_c1" name="dataType_c1" value="numeric" defaultChecked />
                        <label htmlFor="numeric_c1" className={styles['radio-label']}>Numeric</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="boolean_c1" name="dataType_c1" value="boolean" />
                        <label htmlFor="boolean_c1" className={styles['radio-label']}>Boolean</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="character_c1" name="dataType_c1" value="character" />
                        <label htmlFor="character_c1" className={styles['radio-label']}>Character</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="special_c1" name="dataType_c1" value="special" />
                        <label htmlFor="special_c1" className={styles['radio-label']}>Special</label>
                      </div>
                    </div>

                    <div className={styles['input-group']}>
                      <label htmlFor="description_c1" className={styles.label}>Description</label>
                      <textarea id="description_c1" defaultValue="1,2" className={styles['input-field']}></textarea>
                    </div>

                    <div className={`${styles['input-group']} ${styles['score-input-group']}`}>
                      <label htmlFor="score_c1" className={styles.label}>Score</label>
                      <input type="text" id="score_c1" defaultValue="1,2" className={styles['input-field']} />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles['criteria-section']}>
                <p className={styles['criteria-title']} onClick={() => setOpenCriteria(prev => ({ ...prev, 'question01_criteria02': !prev['question01_criteria02'] }))}>
                  Criteria 2
                  <svg
                    className={`${styles['criteria-toggle-arrow']} ${openCriteria.question01_criteria02 ? styles.rotate : ''}`}
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
                {openCriteria.question01_criteria02 && (
                  <div className={styles['criteria-content']}>
                    <div className={styles['criteria-grid']}>
                      <div className={styles['input-group']}>
                        <label htmlFor="criteria2Input" className={styles.label}>Criteria 2 input</label>
                        <input type="text" id="criteria2Input" defaultValue="5, 5" className={styles['input-field']} />
                      </div>
                      <div className={styles['input-group']}>
                        <label htmlFor="criteria2Output" className={styles.label}>Criteria 2 output</label>
                        <input type="text" id="criteria2Output" defaultValue="10" className={styles['input-field']} />
                      </div>
                    </div>

                    <p className={styles.label}>Test case data type</p>
                    <div className={styles['radio-group']}>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="numeric_c2" name="dataType_c2" value="numeric" defaultChecked />
                        <label htmlFor="numeric_c2" className={styles['radio-label']}>Numeric</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="boolean_c2" name="dataType_c2" value="boolean" />
                        <label htmlFor="boolean_c2" className={styles['radio-label']}>Boolean</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="character_c2" name="dataType_c2" value="character" />
                        <label htmlFor="character_c2" className={styles['radio-label']}>Character</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="special_c2" name="dataType_c2" value="special" />
                        <label htmlFor="special_c2" className={styles['radio-label']}>Special</label>
                      </div>
                    </div>

                    <div className={styles['input-group']}>
                      <label htmlFor="description_c2" className={styles.label}>Description</label>
                      <textarea id="description_c2" defaultValue="1,2" className={styles['input-field']}></textarea>
                    </div>

                    <div className={`${styles['input-group']} ${styles['score-input-group']}`}>
                      <label htmlFor="score_c2" className={styles.label}>Score</label>
                      <input type="text" id="score_c2" defaultValue="1,2" className={styles['input-field']} />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles['criteria-section']}>
                <p className={styles['criteria-title']} onClick={() => setOpenCriteria(prev => ({ ...prev, 'question01_criteria03': !prev['question01_criteria03'] }))}>
                  Criteria 3
                  <svg
                    className={`${styles['criteria-toggle-arrow']} ${openCriteria.question01_criteria03 ? styles.rotate : ''}`}
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
                {openCriteria.question01_criteria03 && (
                  <div className={styles['criteria-content']}>
                    <div className={styles['criteria-grid']}>
                      <div className={styles['input-group']}>
                        <label htmlFor="criteria3Input" className={styles.label}>Criteria 3 input</label>
                        <input type="text" id="criteria3Input" defaultValue="5, 5" className={styles['input-field']} />
                      </div>
                      <div className={styles['input-group']}>
                        <label htmlFor="criteria3Output" className={styles.label}>Criteria 3 output</label>
                        <input type="text" id="criteria3Output" defaultValue="10" className={styles['input-field']} />
                      </div>
                    </div>

                    <p className={styles.label}>Test case data type</p>
                    <div className={styles['radio-group']}>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="numeric_c3" name="dataType_c3" value="numeric" defaultChecked />
                        <label htmlFor="numeric_c3" className={styles['radio-label']}>Numeric</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="boolean_c3" name="dataType_c3" value="boolean" />
                        <label htmlFor="boolean_c3" className={styles['radio-label']}>Boolean</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="character_c3" name="dataType_c3" value="character" />
                        <label htmlFor="character_c3" className={styles['radio-label']}>Character</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="special_c3" name="dataType_c3" value="special" />
                        <label htmlFor="special_c3" className={styles['radio-label']}>Special</label>
                      </div>
                    </div>

                    <div className={styles['input-group']}>
                      <label htmlFor="description_c3" className={styles.label}>Description</label>
                      <textarea id="description_c3" defaultValue="1,2" className={styles['input-field']}></textarea>
                    </div>

                    <div className={`${styles['input-group']} ${styles['score-input-group']}`}>
                      <label htmlFor="score_c3" className={styles.label}>Score</label>
                      <input type="text" id="score_c3" defaultValue="1,2" className={styles['input-field']} />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles['criteria-section']}>
                <p className={styles['criteria-title']} onClick={() => setOpenCriteria(prev => ({ ...prev, 'question01_criteria04': !prev['question01_criteria04'] }))}>
                  Criteria 4
                  <svg
                    className={`${styles['criteria-toggle-arrow']} ${openCriteria.question01_criteria04 ? styles.rotate : ''}`}
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
                {openCriteria.question01_criteria04 && (
                  <div className={styles['criteria-content']}>
                    <div className={styles['criteria-grid']}>
                      <div className={styles['input-group']}>
                        <label htmlFor="criteria4Input" className={styles.label}>Criteria 4 input</label>
                        <input type="text" id="criteria4Input" defaultValue="5, 5" className={styles['input-field']} />
                      </div>
                      <div className={styles['input-group']}>
                        <label htmlFor="criteria4Output" className={styles.label}>Criteria 4 output</label>
                        <input type="text" id="criteria4Output" defaultValue="10" className={styles['input-field']} />
                      </div>
                    </div>

                    <p className={styles.label}>Test case data type</p>
                    <div className={styles['radio-group']}>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="numeric_c4" name="dataType_c4" value="numeric" defaultChecked />
                        <label htmlFor="numeric_c4" className={styles['radio-label']}>Numeric</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="boolean_c4" name="dataType_c4" value="boolean" />
                        <label htmlFor="boolean_c4" className={styles['radio-label']}>Boolean</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="character_c4" name="dataType_c4" value="character" />
                        <label htmlFor="character_c4" className={styles['radio-label']}>Character</label>
                      </div>
                      <div className={styles['radio-option']}>
                        <input type="radio" id="special_c4" name="dataType_c4" value="special" />
                        <label htmlFor="special_c4" className={styles['radio-label']}>Special</label>
                      </div>
                    </div>

                    <div className={styles['input-group']}>
                      <label htmlFor="description_c4" className={styles.label}>Description</label>
                      <textarea id="description_c4" defaultValue="1,2" className={styles['input-field']}></textarea>
                    </div>

                    <div className={`${styles['input-group']} ${styles['score-input-group']}`}>
                      <label htmlFor="score_c4" className={styles.label}>Score</label>
                      <input type="text" id="score_c4" defaultValue="1,2" className={styles['input-field']} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Other Questions (placeholders) */}
        <ul>
          <li className={styles['question-list-item']}>
            <h3 className="text-xl font-semibold text-gray-700 cursor-pointer flex items-center justify-between" onClick={() => setOpenQuestions(prev => ({ ...prev, 'question02': !prev['question02'] }))}>
              Question 02: Create a program
              <svg
                className={`${styles['question-toggle-arrow']} ${openQuestions.question02 ? styles.rotate : ''}`}
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
            {openQuestions.question02 && (
              <div className={styles['question-content']}>
                <p className={styles['description-text']}>
                  Nội dung cho Câu hỏi 02.
                </p>
              </div>
            )}
          </li>
          <li className={styles['question-list-item']}>
            <h3 className="text-xl font-semibold text-gray-700 cursor-pointer flex items-center justify-between" onClick={() => setOpenQuestions(prev => ({ ...prev, 'question03': !prev['question03'] }))}>
              Question 03: Create a program
              <svg
                className={`${styles['question-toggle-arrow']} ${openQuestions.question03 ? styles.rotate : ''}`}
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
            {openQuestions.question03 && (
              <div className={styles['question-content']}>
                <p className={styles['description-text']}>
                  Nội dung cho Câu hỏi 03.
                </p>
              </div>
            )}
          </li>
          <li className={styles['question-list-item']}>
            <h3 className="text-xl font-semibold text-gray-700 cursor-pointer flex items-center justify-between" onClick={() => setOpenQuestions(prev => ({ ...prev, 'question04': !prev['question04'] }))}>
              Question 04: Create a program
              <svg
                className={`${styles['question-toggle-arrow']} ${openQuestions.question04 ? styles.rotate : ''}`}
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
            {openQuestions.question04 && (
              <div className={styles['question-content']}>
                <p className={styles['description-text']}>
                  Nội dung cho Câu hỏi 04.
                </p>
              </div>
            )}
          </li>
        </ul>
      </div>
    </div>,
    portalElement
  );
};

export default PaperAssignmentModal;
