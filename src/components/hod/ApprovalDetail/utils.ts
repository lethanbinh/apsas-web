export const getStatusProps = (status: number) => {
  switch (status) {
    case 1:
      return { color: "default", text: "Pending" };
    case 2:
      return { color: "processing", text: "Accepted" };
    case 3:
      return { color: "error", text: "Rejected" };
    case 4:
      return { color: "warning", text: "In Progress" };
    case 5:
      return { color: "success", text: "Completed" };
    default:
      return { color: "default", text: `Unknown (${status})` };
  }
};
export const calculateTotalScore = (
  questions: { [paperId: number]: any[] },
  rubrics: { [questionId: number]: any[] }
): number => {
  let total = 0;
  Object.values(questions).forEach((paperQuestions) => {
    paperQuestions.forEach((question) => {
      const questionRubrics = rubrics[question.id] || [];
      const questionTotal = questionRubrics.reduce((sum, rubric) => sum + (rubric.score || 0), 0);
      total += questionTotal;
    });
  });
  return total;
};