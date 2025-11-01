"use client";

import { Spin, Button, Input, Radio, Space } from "antd";
import { useState, useEffect } from "react";
import styles from "./Tasks.module.css";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import {
  AssessmentQuestion,
  assessmentQuestionService,
} from "@/services/assessmentQuestionService";
import {
  AssessmentPaper,
  assessmentPaperService,
} from "@/services/assessmentPaperService";
import { AssignRequestItem } from "@/services/assignRequestService";
import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
const { TextArea } = Input;

const RubricItemComponent = ({
  rubric,
  onDelete,
  onUpdate,
  isEditable,
}: {
  rubric: RubricItem;
  onDelete: (id: number) => void;
  onUpdate: (id: number, payload: any) => void;
  isEditable: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(rubric.description);
  const [input, setInput] = useState(rubric.input);
  const [output, setOutput] = useState(rubric.output);
  const [score, setScore] = useState(rubric.score);

  const handleUpdate = () => {
    onUpdate(rubric.id, { description, input, output, score });
    setIsEditing(false);
  };

  return (
    <div className={styles["criteria-sub-section"]}>
      <div
        className={styles["criteria-header"]}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className={styles["criteria-title-text"]}>{rubric.description}</h4>
        <Space>
          {isEditable && (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          )}
          {isEditable && (
            <Button
              size="small"
              danger
              onClick={(e) => {
                e.stopPropagation();
                onDelete(rubric.id);
              }}
            >
              Delete
            </Button>
          )}
          <svg
            className={`${styles["question-dropdown-arrow"]} ${
              isOpen ? styles.rotate : ""
            }`}
            viewBox="0 0 24 24"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Space>
      </div>
      {isOpen && (
        <div className={styles["criteria-content"]}>
          <div className={styles["input-group"]}>
            <label className={styles.label}>Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className={styles["input-group"]}>
            <label className={styles.label}>Input</label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className={styles["input-group"]}>
            <label className={styles.label}>Output</label>
            <Input
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className={styles["input-group"]}>
            <label className={styles.label}>Score</label>
            <Input
              type="number"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              disabled={!isEditing}
            />
          </div>
          {isEditing && (
            <Button type="primary" onClick={handleUpdate}>
              Save Changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

const QuestionItemComponent = ({
  question,
  onDelete,
  onUpdate,
  onRubricChange,
  isEditable,
}: {
  question: AssessmentQuestion;
  onDelete: (id: number) => void;
  onUpdate: (id: number, payload: any) => void;
  onRubricChange: () => void;
  isEditable: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [rubrics, setRubrics] = useState<RubricItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingRubric, setIsAddingRubric] = useState(false);

  const [questionText, setQuestionText] = useState(question.questionText);
  const [sampleInput, setSampleInput] = useState(question.questionSampleInput);
  const [sampleOutput, setSampleOutput] = useState(
    question.questionSampleOutput
  );
  const [score, setScore] = useState(question.score);

  const [newRubricDesc, setNewRubricDesc] = useState("");
  const [newRubricInput, setNewRubricInput] = useState("");
  const [newRubricOutput, setNewRubricOutput] = useState("");
  const [newRubricScore, setNewRubricScore] = useState(0);

  const fetchRubrics = async () => {
    setIsLoading(true);
    try {
      const data = await rubricItemService.getRubricsForQuestion(question.id);
      setRubrics(data);
    } catch (error) {
      console.error("Failed to fetch rubrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRubrics();
    }
  }, [isOpen]);

  const handleUpdate = () => {
    onUpdate(question.id, {
      questionText: questionText,
      questionSampleInput: sampleInput,
      questionSampleOutput: sampleOutput,
      score: score,
    });
    setIsEditing(false);
  };

  const handleCreateRubric = async () => {
    try {
      await rubricItemService.createRubricItem({
        description: newRubricDesc,
        input: newRubricInput,
        output: newRubricOutput,
        score: newRubricScore,
        assessmentQuestionId: question.id,
      });
      setNewRubricDesc("");
      setNewRubricInput("");
      setNewRubricOutput("");
      setNewRubricScore(0);
      fetchRubrics();
      onRubricChange();
      setIsAddingRubric(false);
    } catch (error) {
      console.error("Failed to create rubric:", error);
    }
  };

  const handleDeleteRubric = async (id: number) => {
    try {
      await rubricItemService.deleteRubricItem(id);
      fetchRubrics();
      onRubricChange();
    } catch (error) {
      console.error("Failed to delete rubric:", error);
    }
  };

  const handleUpdateRubric = async (id: number, payload: any) => {
    try {
      await rubricItemService.updateRubricItem(id, payload);
      fetchRubrics();
    } catch (error) {
      console.error("Failed to update rubric:", error);
    }
  };

  return (
    <div className={styles["question-card"]}>
      <div
        className={styles["question-header"]}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className={styles["question-title-text"]}>{questionText}</h3>
        <Space>
          {isEditable && (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          )}
          {isEditable && (
            <Button
              size="small"
              danger
              onClick={(e) => {
                e.stopPropagation();
                onDelete(question.id);
              }}
            >
              Delete
            </Button>
          )}
          <svg
            className={`${styles["question-dropdown-arrow"]} ${
              isOpen ? styles.rotate : ""
            }`}
            viewBox="0 0 24 24"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Space>
      </div>
      {isOpen && (
        <div className={styles["question-content-wrapper"]}>
          <div className={styles["question-details-grid"]}>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Question Text</label>
              <TextArea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                disabled={!isEditing}
                rows={4}
              />
            </div>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Sample Input</label>
              <TextArea
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                disabled={!isEditing}
                rows={4}
              />
            </div>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Sample Output</label>
              <TextArea
                value={sampleOutput}
                onChange={(e) => setSampleOutput(e.target.value)}
                disabled={!isEditing}
                rows={4}
              />
            </div>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Score</label>
              <Input
                type="number"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                disabled={!isEditing}
              />
            </div>
          </div>
          {isEditing && (
            <Button
              type="primary"
              onClick={handleUpdate}
              style={{ marginTop: 10, marginBottom: 20 }}
            >
              Save Question
            </Button>
          )}

          <h4 className={styles["criteria-title-text"]}>Rubrics</h4>
          {isLoading ? (
            <Spin />
          ) : (
            rubrics.map((rubric) => (
              <RubricItemComponent
                key={rubric.id}
                rubric={rubric}
                onDelete={handleDeleteRubric}
                onUpdate={handleUpdateRubric}
                isEditable={isEditable}
              />
            ))
          )}
          {isEditable && !isAddingRubric && (
            <Button
              type="dashed"
              onClick={() => setIsAddingRubric(true)}
              style={{ marginTop: 15, width: "100%" }}
            >
              Add New Rubric
            </Button>
          )}
          {isEditable && isAddingRubric && (
            <div
              className={styles["criteria-sub-section"]}
              style={{
                border: "1px solid #d9d9d9",
                padding: "10px",
                borderRadius: "8px",
                marginTop: "15px",
              }}
            >
              <h4 className={styles["criteria-title-text"]}>Add New Rubric</h4>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Description</label>
                <Input
                  value={newRubricDesc}
                  onChange={(e) => setNewRubricDesc(e.target.value)}
                />
              </div>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Input</label>
                <Input
                  value={newRubricInput}
                  onChange={(e) => setNewRubricInput(e.target.value)}
                />
              </div>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Output</label>
                <Input
                  value={newRubricOutput}
                  onChange={(e) => setNewRubricOutput(e.target.value)}
                />
              </div>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Score</label>
                <Input
                  type="number"
                  value={newRubricScore}
                  onChange={(e) => setNewRubricScore(Number(e.target.value))}
                />
              </div>
              <Space style={{ marginTop: 10 }}>
                <Button type="primary" onClick={handleCreateRubric}>
                  Add Rubric
                </Button>
                <Button onClick={() => setIsAddingRubric(false)}>Cancel</Button>
              </Space>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PaperItemComponent = ({
  paper,
  onDelete,
  onUpdate,
  onQuestionChange,
  isEditable,
}: {
  paper: AssessmentPaper;
  onDelete: (id: number) => void;
  onUpdate: (id: number, payload: any) => void;
  onQuestionChange: () => void;
  isEditable: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  const [name, setName] = useState(paper.name);
  const [description, setDescription] = useState(paper.description);

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newSampleInput, setNewSampleInput] = useState("");
  const [newSampleOutput, setNewSampleOutput] = useState("");
  const [newScore, setNewScore] = useState(0);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      });
      setQuestions(data.items);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
    }
  }, [isOpen]);

  const handleUpdate = () => {
    onUpdate(paper.id, { name, description });
    setIsEditing(false);
  };

  const handleCreateQuestion = async () => {
    try {
      await assessmentQuestionService.createAssessmentQuestion({
        questionText: newQuestionText,
        questionSampleInput: newSampleInput,
        questionSampleOutput: newSampleOutput,
        score: newScore,
        assessmentPaperId: paper.id,
      });
      setNewQuestionText("");
      setNewSampleInput("");
      setNewSampleOutput("");
      setNewScore(0);
      fetchQuestions();
      onQuestionChange();
      setIsAddingQuestion(false);
    } catch (error) {
      console.error("Failed to create question:", error);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    try {
      await assessmentQuestionService.deleteAssessmentQuestion(id);
      fetchQuestions();
      onQuestionChange();
    } catch (error) {
      console.error("Failed to delete question:", error);
    }
  };

  const handleUpdateQuestion = async (id: number, payload: any) => {
    try {
      await assessmentQuestionService.updateAssessmentQuestion(id, payload);
      fetchQuestions();
    } catch (error) {
      console.error("Failed to update question:", error);
    }
  };

  return (
    <div className={styles["basic-assignment-section"]}>
      <div
        className={styles["basic-assignment-header"]}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles["basic-assignment-title"]}>
          <svg viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          {name}
        </div>
        <Space>
          {isEditable && (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Cancel" : "Edit Paper"}
            </Button>
          )}
          {isEditable && (
            <Button
              size="small"
              danger
              onClick={(e) => {
                e.stopPropagation();
                onDelete(paper.id);
              }}
            >
              Delete Paper
            </Button>
          )}
          <svg
            className={`${styles["question-dropdown-arrow"]} ${
              isOpen ? styles.rotate : ""
            }`}
            viewBox="0 0 24 24"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Space>
      </div>
      {isOpen && (
        <div style={{ paddingLeft: "20px" }}>
          {isEditing && (
            <div
              className={styles["criteria-content"]}
              style={{ marginBottom: 20 }}
            >
              <div className={styles["input-group"]}>
                <label className={styles.label}>Paper Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Paper Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button type="primary" onClick={handleUpdate}>
                Save Paper
              </Button>
            </div>
          )}

          {isLoading ? (
            <Spin />
          ) : (
            questions.map((q) => (
              <QuestionItemComponent
                key={q.id}
                question={q}
                onDelete={handleDeleteQuestion}
                onUpdate={handleUpdateQuestion}
                onRubricChange={onQuestionChange}
                isEditable={isEditable}
              />
            ))
          )}

          {isEditable && !isAddingQuestion && (
            <Button
              type="dashed"
              onClick={() => setIsAddingQuestion(true)}
              style={{ marginTop: 15, width: "100%" }}
            >
              Add New Question
            </Button>
          )}

          {isEditable && isAddingQuestion && (
            <div
              className={styles["question-card"]}
              style={{
                border: "1px solid #1890ff",
                padding: "10px",
                borderRadius: "8px",
                marginTop: "15px",
              }}
            >
              <h3 className={styles["question-title-text"]}>
                Add New Question
              </h3>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Question Text</label>
                <TextArea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Sample Input</label>
                <TextArea
                  value={newSampleInput}
                  onChange={(e) => setNewSampleInput(e.target.value)}
                  rows={4}
                />
              </div>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Sample Output</label>
                <TextArea
                  value={newSampleOutput}
                  onChange={(e) => setNewSampleOutput(e.target.value)}
                  rows={4}
                />
              </div>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Score</label>
                <Input
                  type="number"
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                />
              </div>
              <Space style={{ marginTop: 10 }}>
                <Button type="primary" onClick={handleCreateQuestion}>
                  Add Question
                </Button>
                <Button onClick={() => setIsAddingQuestion(false)}>
                  Cancel
                </Button>
              </Space>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const LecturerTaskContent = ({
  task,
  lecturerId,
}: {
  task: AssignRequestItem;
  lecturerId: number;
}) => {
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [papers, setPapers] = useState<AssessmentPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingPaper, setIsAddingPaper] = useState(false);

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateType, setNewTemplateType] = useState(0);

  const [newPaperName, setNewPaperName] = useState("");
  const [newPaperDesc, setNewPaperDesc] = useState("");

  const isEditable = task.status !== 2 && task.status !== 3;

  const fetchTemplate = async () => {
    setIsLoading(true);
    try {
      const response = await assessmentTemplateService.getAssessmentTemplates({
        assignRequestId: task.id,
        pageNumber: 1,
        pageSize: 10,
      });
      if (response.items.length > 0) {
        setTemplate(response.items[0]);
        fetchPapers(response.items[0].id);
      } else {
        setTemplate(null);
      }
    } catch (error) {
      console.error("Failed to fetch template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPapers = async (templateId: number) => {
    try {
      const response = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: templateId,
        pageNumber: 1,
        pageSize: 100,
      });
      setPapers(response.items);
    } catch (error) {
      console.error("Failed to fetch papers:", error);
    }
  };

  useEffect(() => {
    fetchTemplate();
  }, [task.id]);

  const handleCreateTemplate = async () => {
    try {
      await assessmentTemplateService.createAssessmentTemplate({
        name: newTemplateName,
        description: newTemplateDesc,
        templateType: newTemplateType,
        assignRequestId: task.id,
        createdByLecturerId: lecturerId,
        assignedToHODId: task.assignedByHODId,
      });
      setNewTemplateName("");
      setNewTemplateDesc("");
      fetchTemplate();
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const handleCreatePaper = async () => {
    if (!template) return;
    try {
      await assessmentPaperService.createAssessmentPaper({
        name: newPaperName,
        description: newPaperDesc,
        assessmentTemplateId: template.id,
      });
      setNewPaperName("");
      setNewPaperDesc("");
      fetchPapers(template.id);
      setIsAddingPaper(false);
    } catch (error) {
      console.error("Failed to create paper:", error);
    }
  };

  const handleDeletePaper = async (id: number) => {
    if (!template) return;
    try {
      await assessmentPaperService.deleteAssessmentPaper(id);
      fetchPapers(template.id);
    } catch (error) {
      console.error("Failed to delete paper:", error);
    }
  };

  const handleUpdatePaper = async (id: number, payload: any) => {
    if (!template) return;
    try {
      await assessmentPaperService.updateAssessmentPaper(id, payload);
      fetchPapers(template.id);
    } catch (error) {
      console.error("Failed to update paper:", error);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div className={`${styles["task-content"]} ${styles["nested-content"]}`}>
      {!template ? (
        isEditable ? (
          <div className={styles["basic-assignment-section"]}>
            <h3>No Template Found. Create one.</h3>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Template Name</label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Template Description</label>
              <Input
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
              />
            </div>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Template Type</label>
              <Radio.Group
                onChange={(e) => setNewTemplateType(e.target.value)}
                value={newTemplateType}
              >
                <Radio value={0}>DSA</Radio>
                <Radio value={1}>WEBAPI</Radio>
              </Radio.Group>
            </div>
            <Button type="primary" onClick={handleCreateTemplate}>
              Create Template
            </Button>
          </div>
        ) : (
          <div className={styles["basic-assignment-section"]}>
            <h3>No template created for this task.</h3>
          </div>
        )
      ) : (
        <>
          {papers.map((paper) => (
            <PaperItemComponent
              key={paper.id}
              paper={paper}
              onDelete={handleDeletePaper}
              onUpdate={handleUpdatePaper}
              onQuestionChange={() => fetchPapers(template.id)}
              isEditable={isEditable}
            />
          ))}
          {isEditable && !isAddingPaper && (
            <Button
              type="primary"
              onClick={() => setIsAddingPaper(true)}
              style={{ marginTop: 15, width: "100%" }}
            >
              Add New Paper
            </Button>
          )}
          {isEditable && isAddingPaper && (
            <div
              className={styles["basic-assignment-section"]}
              style={{
                border: "1px solid #1890ff",
                padding: "10px",
                borderRadius: "8px",
                marginTop: "15px",
              }}
            >
              <h3 className={styles["question-title-text"]}>Add New Paper</h3>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Paper Name</label>
                <Input
                  value={newPaperName}
                  onChange={(e) => setNewPaperName(e.target.value)}
                />
              </div>
              <div className={styles["input-group"]}>
                <label className={styles.label}>Paper Description</label>
                <Input
                  value={newPaperDesc}
                  onChange={(e) => setNewPaperDesc(e.target.value)}
                />
              </div>
              <Space style={{ marginTop: 10 }}>
                <Button type="primary" onClick={handleCreatePaper}>
                  Add Paper
                </Button>
                <Button onClick={() => setIsAddingPaper(false)}>Cancel</Button>
              </Space>
            </div>
          )}
        </>
      )}
    </div>
  );
};
