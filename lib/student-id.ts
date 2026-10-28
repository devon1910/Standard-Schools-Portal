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

export type StudentAdmission = { year: number; classCode: string };
export type StudentAdmissionInput = {
  admissionNumber?: string | null; dateOfAdmission?: Date | null; yearOfAdmission?: string | null;
  classAtAdmission?: string | null; className: string; sessionName?: string;
};

export class StudentAdmissionError extends Error {}

export function admissionClassCode(name: string) {
  const code = name.toUpperCase().replace(/[\s._-]+/g, "");
  if (/^PRENURSERY[A-Z]*$/.test(code)) return code.replace("PRENURSERY", "PK");
  if (/^CRECHE[A-Z]*$/.test(code)) return code.replace("CRECHE", "CR");
  const numbered = /^(NURSERY|KINDERGARTEN|KG|K|BASIC|PRIMARY|PRY|JSS|SSS|SS)(\d+)([A-Z]*)$/.exec(code);
  if (numbered) {
    const [, stage, year, stream] = numbered;
    if (stage === "JSS") return `B${Number(year) + 6}${stream}`;
    const prefix = ["NURSERY", "KINDERGARTEN", "KG", "K"].includes(stage) ? "KG" : ["SSS", "SS"].includes(stage) ? "SSS" : "B";
    return `${prefix}${Number(year)}${stream}`;
  }
  if (!/^[A-Z][A-Z0-9]*$/.test(code)) throw new StudentAdmissionError("Use a class name or code for the class at admission.");
  return code;
}

export function parseAdmissionStudentId(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase().replace(/\s/g, "").replace(/\/+/g, "/");
  const match = normalized && /^(\d{4})\/?([A-Z][A-Z0-9]*)\/(\d+)$/.exec(normalized);
  if (!match) return null;
  const sequence = Number(match[3]);
  if (!Number.isSafeInteger(sequence) || Number(match[1]) < 1000) return null;
  return { year: Number(match[1]), classCode: admissionClassCode(match[2]), sequence };
}

export function studentAdmission(input: StudentAdmissionInput): StudentAdmission {
  const original = parseAdmissionStudentId(input.admissionNumber);
  if (original) return { year: original.year, classCode: original.classCode };
  const numberYear = input.admissionNumber?.trim().match(/^(\d{4})\//)?.[1];
  const year = numberYear ? Number(numberYear) : input.dateOfAdmission?.getUTCFullYear()
    ?? (/^\d{4}$/.test(input.yearOfAdmission ?? "") ? Number(input.yearOfAdmission) : undefined)
    ?? Number(input.sessionName?.match(/^(\d{4})(?:\D|$)/)?.[1] ?? new Date().getUTCFullYear());
  if (!Number.isInteger(year) || year < 1000 || year > 9999) throw new StudentAdmissionError("Use a valid four-digit admission year.");
  return { year, classCode: admissionClassCode(input.classAtAdmission?.trim() || input.className) };
}

export function formatAdmissionStudentId(admission: StudentAdmission, sequence: number) {
  return `${admission.year}/${admission.classCode}/${String(sequence).padStart(5, "0")}`;
}

export function displayStudentId(student: { id: bigint; studentId: string | null; admissionNumber: string | null }) {
  return student.studentId || student.admissionNumber || student.id.toString();
}
