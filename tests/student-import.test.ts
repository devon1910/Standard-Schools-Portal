import { describe, expect, it } from "vitest";
import { parseImportDate, studentImportRowSchema } from "../lib/student-import";
import { NIGERIAN_LOCATIONS, validateOrigin } from "../lib/nigeria-locations";
import { createWordTemplate, importColumns, parseStudentGrid, readWordTable } from "../lib/student-import-file";
import JSZip from "jszip";

describe("student import validation", () => {
  it("accepts a real ISO calendar date", () => {
    expect(parseImportDate("2014-05-12")).toBeInstanceOf(Date);
    expect(parseImportDate("2014-05-12")?.toISOString()).toBe("2014-05-12T00:00:00.000Z");
  });

  it("rejects normalized and non-ISO dates", () => {
    expect(parseImportDate("2026-02-31")).toBeUndefined();
    expect(parseImportDate("31/01/2026")).toBeUndefined();
  });

  const required = { rowNumber: 2, firstName: "Ada", lastName: "Okafor", className: "JSS 1A", gender: "Female", dob: "2014-05-12" };

  it("requires only names, class, gender, and date of birth", () => {
    expect(studentImportRowSchema.parse(required).name).toBe("Ada Okafor");
    for (const key of ["firstName", "lastName", "className", "gender", "dob"]) {
      expect(studentImportRowSchema.safeParse({ ...required, [key]: "" }).success).toBe(false);
    }
    expect(studentImportRowSchema.safeParse({ ...required, gender: "Other" }).success).toBe(false);
    expect(studentImportRowSchema.safeParse({ ...required, dob: "2026-02-31" }).success).toBe(false);
  });

  it("reads the actual Word template as a valid import with optional fields blank", async () => {
    const buffer = await createWordTemplate();
    const packageFiles = await JSZip.loadAsync(buffer);
    const documentXml = await packageFiles.file("word/document.xml")!.async("string");
    expect(documentXml).toContain("<w:tblGrid>");
    expect(documentXml.match(/<w:gridCol /g)).toHaveLength(importColumns.length);
    const grid = await readWordTable(buffer);
    expect(grid[0]).toEqual(importColumns);
    const parsed = parseStudentGrid(grid);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject(required);
    expect(parsed.rows[0].parentPhone).toBe("");
  });

  it("preserves Word text split across runs, XML characters, and blank cells", async () => {
    const zip = await JSZip.loadAsync(await createWordTemplate());
    const xml = await zip.file("word/document.xml")!.async("string");
    zip.file("word/document.xml", xml.replace(
      '<w:t xml:space="preserve">Ada</w:t>',
      '<w:t>A</w:t></w:r><w:r><w:t>da &amp; Joy</w:t>',
    ));
    const parsed = parseStudentGrid(await readWordTable(await zip.generateAsync({ type: "arraybuffer" })));
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].firstName).toBe("Ada & Joy");
    expect(parsed.rows[0].parentName).toBe("");
  });

  it("escapes XML characters in Word class names", async () => {
    const parsed = parseStudentGrid(await readWordTable(await createWordTemplate("JSS 1A & B")));
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].className).toBe("JSS 1A & B");
  });

  it("reports source row numbers and validates missing headings", () => {
    const grid = [importColumns, [], ["Ada", "Okafor", "JSS 1", "Female", "2014-02-31"]];
    expect(parseStudentGrid(grid).errors[0]).toMatch(/^Row 3:/);
    expect(parseStudentGrid([["First Name"]]).errors[0]).toMatch(/Class/);
  });

  it("accepts legacy full name headings when all required fields exist", () => {
    const parsed = parseStudentGrid([["Full Name", "Class", "Gender", "DOB"], ["Ada Joy Okafor", "JSS 1", "female", "2014-05-12"]]);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].name).toBe("Ada Joy Okafor");
  });

  it("rejects non-Word ZIP files and documents without student tables", async () => {
    const zip = new JSZip();
    zip.file("hello.txt", "hello");
    await expect(readWordTable(await zip.generateAsync({ type: "arraybuffer" }))).rejects.toThrow(/not a Word/);
    zip.file("word/document.xml", '<w:document xmlns:w="urn:word"><w:body><w:p/></w:body></w:document>');
    await expect(readWordTable(await zip.generateAsync({ type: "arraybuffer" }))).rejects.toThrow(/table/);
  });
});

describe("student origin validation", () => {
  it("uses all states and their LGAs", () => {
    expect(Object.keys(NIGERIAN_LOCATIONS)).toHaveLength(37);
    expect(Object.values(NIGERIAN_LOCATIONS).flat()).toHaveLength(774);
  });

  it("normalizes case but rejects misspellings and mismatched LGAs", () => {
    expect(validateOrigin("lagos", "ikeja")).toEqual({ state: "Lagos", lga: "Ikeja" });
    expect(validateOrigin("Lags", "Ikeja").error).toMatch(/State of origin/);
    expect(validateOrigin("Lagos", "Aba North").error).toMatch(/does not belong/);
    expect(validateOrigin("", "Ikeja").error).toMatch(/Choose a state/);
  });
});
