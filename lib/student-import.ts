import { z } from "zod";

export const MAX_STUDENT_IMPORT_ROWS = 1000;

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const studentImportRowSchema = z.object({
  rowNumber: z.number().int().min(2),
  name: z.string().trim().min(2, "Full name is required.").max(300),
  admissionNumber: z.string().trim().min(1, "Admission number is required.").max(80),
  gender: z.enum(["Male", "Female"]).or(z.literal("")),
  dob: optionalText(20),
  dateOfAdmission: optionalText(20),
  classAtAdmission: optionalText(100),
  parentName: optionalText(100),
  parentPhone: optionalText(50),
  parentAddress: optionalText(500),
});

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;

export function parseImportDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}
