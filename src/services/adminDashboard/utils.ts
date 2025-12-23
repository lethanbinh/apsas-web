export function isPracticalExamTemplate(template: any): boolean {
  const name = (template.name || "").toLowerCase();
  const keywords = [
    "exam",
    "pe",
    "practical exam",
    "practical",
    "test",
    "kiểm tra thực hành",
    "thi thực hành",
    "bài thi",
    "bài kiểm tra",
  ];
  return keywords.some((keyword) => name.includes(keyword));
}
export function isLabTemplate(template: any): boolean {
  const name = (template.name || "").toLowerCase();
  const keywords = [
    "lab",
    "laboratory",
    "thực hành",
    "bài thực hành",
    "lab session",
    "lab work",
  ];
  return keywords.some((keyword) => name.includes(keyword));
}