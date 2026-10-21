import { z } from "zod";

export const studentIdConfigSchema = z.object({
  prefix: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z-]{0,19}$/, "Use 1 to 20 letters or hyphens. Start with a letter."),
  digits: z.coerce.number().int().min(1).max(10),
  start: z.coerce.number().int().min(1).max(2_000_000_000),
  confirmed: z.literal("on", { error: "Confirm that the student ID format can only be set once." }),
});

export function formatStudentId(prefix: string, digits: number, number: number) {
  return `${prefix}${String(number).padStart(digits, "0")}`;
}

export function displayStudentId(student: { id: bigint; studentId: string | null; admissionNumber: string | null }) {
  return student.studentId || student.admissionNumber || student.id.toString();
}
