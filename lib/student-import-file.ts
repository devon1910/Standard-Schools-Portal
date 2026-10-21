import JSZip from "jszip";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { MAX_STUDENT_IMPORT_ROWS, studentImportRowSchema, type StudentImportRow } from "./student-import";
import { validateOrigin } from "./nigeria-locations";

export const importColumns = [
  "First Name", "Last Name", "Class", "Gender", "Date of Birth", "Admission Number",
  "Date of Admission", "Class at Admission", "Parent Name", "Parent Phone", "Parent Address",
  "State of Origin", "LGA of Origin", "Tribe", "Parent Religion",
];
export const importExample = ["Ada", "Okafor", "JSS 1", "Female", "2014-05-12"];
const aliases: Record<string, string> = {
  firstname: "firstName", givenname: "firstName", lastname: "lastName", surname: "lastName",
  fullname: "name", name: "name", studentname: "name", class: "className", classname: "className",
  admissionnumber: "admissionNumber", admissionno: "admissionNumber", admission: "admissionNumber",
  gender: "gender", sex: "gender", dateofbirth: "dob", dob: "dob",
  dateofadmission: "dateOfAdmission", admissiondate: "dateOfAdmission", classatadmission: "classAtAdmission",
  parentname: "parentName", guardianname: "parentName", parentguardian: "parentName",
  parentphone: "parentPhone", guardianphone: "parentPhone", phone: "parentPhone",
  parentaddress: "parentAddress", guardianaddress: "parentAddress", address: "parentAddress",
  stateoforigin: "stateOfOrigin", state: "stateOfOrigin",
  lgaoforigin: "lgaOfOrigin", localgovernmentarea: "lgaOfOrigin", lga: "lgaOfOrigin",
  tribe: "tribe", parentreligion: "parentReligion", guardianreligion: "parentReligion",
};
const headerKey = (value: unknown) => aliases[String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")];

export function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  if (typeof value === "object") {
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return cellText(value.result);
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((part: { text?: string }) => part.text ?? "").join("").trim();
  }
  return String(value).trim();
}

export function parseStudentGrid(grid: unknown[][]): { rows: StudentImportRow[]; errors: string[] } {
  const headers = (grid[0] ?? []).map(headerKey);
  const hasName = headers.includes("name") || (headers.includes("firstName") && headers.includes("lastName"));
  if (!hasName || ["className", "gender", "dob"].some((key) => !headers.includes(key))) {
    return { rows: [], errors: ["Include First Name, Last Name, Class, Gender, and Date of Birth columns. Use a template below."] };
  }
  const dataRows = grid.slice(1).map((cells, index) => ({ cells, rowNumber: index + 2 })).filter(({ cells }) => cells.some((value) => cellText(value)));
  if (!dataRows.length) return { rows: [], errors: ["The file has no student records."] };
  if (dataRows.length > MAX_STUDENT_IMPORT_ROWS) return { rows: [], errors: [`A single import can contain at most ${MAX_STUDENT_IMPORT_ROWS.toLocaleString()} students.`] };
  const rows: StudentImportRow[] = [];
  const errors: string[] = [];
  for (const { cells, rowNumber } of dataRows) {
    const record: Record<string, unknown> = { rowNumber };
    headers.forEach((key, index) => { if (key) record[key] = cellText(cells[index]); });
    if (!record.firstName && !record.lastName && record.name) {
      const [firstName, ...rest] = String(record.name).trim().split(/\s+/);
      record.firstName = firstName;
      record.lastName = rest.join(" ");
    }
    const gender = String(record.gender ?? "").toLowerCase();
    record.gender = gender === "male" ? "Male" : gender === "female" ? "Female" : record.gender;
    const parsed = studentImportRowSchema.safeParse(record);
    if (!parsed.success) { errors.push(`Row ${rowNumber}: ${parsed.error.issues[0]?.message}`); continue; }
    const origin = validateOrigin(parsed.data.stateOfOrigin, parsed.data.lgaOfOrigin);
    if (origin.error) errors.push(`Row ${rowNumber}: ${origin.error}`);
    else rows.push({ ...parsed.data, stateOfOrigin: origin.state ?? "", lgaOfOrigin: origin.lga ?? "" });
  }
  return { rows, errors };
}

type XmlNode = { [key: string]: XmlNode[] | string };
function children(node: XmlNode, tag: string): XmlNode[] {
  const value = node[tag];
  return Array.isArray(value) ? value : [];
}
function textContent(nodes: XmlNode[]): string {
  return nodes.map((node) => Object.entries(node).map(([key, value]) => {
    if (key === "#text") return String(value);
    if (key === "tab" || key === "br") return " ";
    return Array.isArray(value) ? textContent(value) : "";
  }).join("")).join("");
}

export async function readWordTable(data: ArrayBuffer): Promise<string[][]> {
  const zip = await JSZip.loadAsync(data);
  const document = zip.file("word/document.xml");
  if (!document) throw new Error("This is not a Word .docx document.");
  const xml = await document.async("string");
  if (xml.length > 8_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("The Word document is too large or contains invalid XML.");
  const nodes: XmlNode[] = new XMLParser({ preserveOrder: true, removeNSPrefix: true, ignoreAttributes: true, parseTagValue: false, trimValues: false }).parse(xml);
  const body = children(nodes.find((node) => node.document) ?? {}, "document").flatMap((node) => children(node, "body"));
  const tables = body.flatMap((node) => children(node, "tbl"));
  const grids = body.filter((node) => node.tbl).map((node) => children(node, "tbl").filter((row) => row.tr).map((row) =>
    children(row, "tr").filter((cell) => cell.tc).map((cell) => textContent(children(cell, "tc")).trim()),
  ));
  // Prefer a table with student headings. Introductory layout tables can occur first.
  const grid = grids.find((table) => table[0]?.some((value) => ["firstName", "name"].includes(headerKey(value)))) ?? grids[0];
  if (!tables.length || !grid) throw new Error("The Word document must contain a table with one student per row. Use the Word template.");
  return grid;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function createWordTemplate(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const paragraph = (value: string) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`;
  const tableGrid = `<w:tblGrid>${importColumns.map(() => '<w:gridCol w:w="1500"/>').join("")}</w:tblGrid>`;
  const table = [importColumns, importColumns.map((_, index) => importExample[index] ?? "")].map((row) => `<w:tr>${row.map((value) => `<w:tc>${paragraph(value)}</w:tc>`).join("")}</w:tr>`).join("");
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph("Student import")}${paragraph("Required: First Name, Last Name, Class, Gender, Date of Birth (YYYY-MM-DD). All other fields are optional. Class must match a class in the selected session. Replace the example row. Keep the column headings. Save as .docx.")}<w:tbl><w:tblPr><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((side) => `<w:${side} w:val="single" w:sz="4" w:color="999999"/>`).join("")}</w:tblBorders></w:tblPr>${tableGrid}${table}</w:tbl><w:sectPr><w:pgSz w:w="23811" w:h="16838" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}
