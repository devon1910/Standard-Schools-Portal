export const SCORE_LIMITS = { firstTest: 20, secondTest: 20, exam: 60 } as const;

export function scoreTotal(firstTest: number, secondTest: number, exam: number) {
  return firstTest + secondTest + exam;
}

export function gradeFor(total: number) {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  if (total >= 40) return "E";
  return "F";
}

export function remarkFor(total: number) {
  if (total >= 90) return "Outstanding";
  if (total >= 80) return "Excellent";
  if (total >= 70) return "Very Good";
  if (total >= 60) return "Good";
  if (total >= 50) return "Average";
  if (total >= 40) return "Pass";
  return "Fail";
}

export function competitionRanks(values: Array<{ id: string; value: number }>) {
  const sorted = [...values].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const ranks = new Map<string, number>();
  let previous: number | undefined;
  let rank = 0;
  sorted.forEach((item, index) => {
    if (previous === undefined || item.value !== previous) rank = index + 1;
    ranks.set(item.id, rank);
    previous = item.value;
  });
  return ranks;
}

export function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  return `${value}${value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`;
}
