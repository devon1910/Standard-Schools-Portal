import { z } from "zod";

export const MAX_STUDENT_IMPORT_ROWS = 1000;

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const studentImportRowSchema = z.object({
  rowNumber: z.number().int().min(2),
  firstName: z.string().trim().min(1, "First name is required.").max(150),
  lastName: z.string().trim().min(1, "Last name is required.").max(149),
  className: z.string().trim().min(1, "Class is required.").max(100),
  gender: z.enum(["Male", "Female"], { error: "Gender must be Male or Female." }),
  dob: z.string().trim().refine((value) => Boolean(value && parseImportDate(value)), "Date of birth is required. Use a valid YYYY-MM-DD date."),
  dateOfAdmission: optionalText(20),
  classAtAdmission: optionalText(100),
  stateOfOrigin: optionalText(100),
  lgaOfOrigin: optionalText(100),
  tribe: optionalText(100),
  parentReligion: optionalText(100),
  parentName: optionalText(100),
  parentPhone: optionalText(50),
  parentAddress: optionalText(500),
}).transform((row) => ({ ...row, name: `${row.firstName} ${row.lastName}` }));

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;

export function parseImportDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : undefined;
}
