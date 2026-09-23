"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import ExcelJS from "exceljs";
import { importStudents, type StudentImportResult } from "@/app/actions/admin";
import { MAX_STUDENT_IMPORT_ROWS, studentImportRowSchema, type StudentImportRow } from "@/lib/student-import";

type SessionOption = { id: number; name: string };
type ClassOption = { id: number; name: string; sessionId: number };

const columns = [
  "Full Name", "Admission Number", "Gender", "Date of Birth", "Date of Admission",
  "Class at Admission", "Parent Name", "Parent Phone", "Parent Address",
] as const;

const aliases: Record<string, keyof Omit<StudentImportRow, "rowNumber">> = {
  fullname: "name", name: "name", studentname: "name",
  admissionnumber: "admissionNumber", admissionno: "admissionNumber", admission: "admissionNumber",
  gender: "gender", sex: "gender",
  dateofbirth: "dob", dob: "dob",
  dateofadmission: "dateOfAdmission", admissiondate: "dateOfAdmission",
  classatadmission: "classAtAdmission",
  parentname: "parentName", guardianname: "parentName", parentguardian: "parentName",
  parentphone: "parentPhone", guardianphone: "parentPhone", phone: "parentPhone",
  parentaddress: "parentAddress", guardianaddress: "parentAddress", address: "parentAddress",
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cellText(value: unknown, date = false) {
  if (value == null) return "";
  if (value instanceof Date) {
    if (!date) return value.toLocaleDateString();
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "object") {
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return cellText(value.result, date);
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((part: { text?: string }) => part.text ?? "").join("").trim();
  }
  return String(value).trim();
}

function parseCsv(text: string) {
  const output: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(field); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); output.push(row); row = []; field = "";
    } else field += character;
  }
  if (field || row.length) { row.push(field); output.push(row); }
  return output;
}

export default function StudentImportForm({ sessions, classes, defaultSessionId }: {
  sessions: SessionOption[];
  classes: ClassOption[];
  defaultSessionId?: number;
}) {
  const [sessionId, setSessionId] = useState(defaultSessionId ?? sessions[0]?.id ?? 0);
  const visibleClasses = useMemo(() => classes.filter((item) => item.sessionId === sessionId), [classes, sessionId]);
  const [classId, setClassId] = useState(visibleClasses[0]?.id ?? 0);
  const [rows, setRows] = useState<StudentImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<StudentImportResult>();
  const [pending, startTransition] = useTransition();

  function changeSession(value: number) {
    setSessionId(value);
    setClassId(classes.find((item) => item.sessionId === value)?.id ?? 0);
    setResult(undefined);
  }

  async function downloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students");
    worksheet.addRow([...columns]);
    worksheet.addRow(["Ada Okafor", "STD/2026/001", "Female", "2014-05-12", "2026-09-15", "JSS 1", "Chika Okafor", "08012345678", "12 School Road"]);
    worksheet.columns.forEach((column, index) => { column.width = Math.max(columns[index].length + 3, 18); });
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-import-template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function readFile(file?: File) {
    setRows([]);
    setResult(undefined);
    setParseErrors([]);
    if (!file) return;
    setFileName(file.name);
    try {
      let grid: unknown[][];
      if (file.name.toLowerCase().endsWith(".csv")) {
        grid = parseCsv(await file.text());
      } else {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        grid = [];
        sheet.eachRow({ includeEmpty: true }, (sheetRow) => {
          const values: unknown[] = [];
          sheetRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => { values[columnNumber - 1] = cell.value; });
          grid.push(values);
        });
      }
      const headers = (grid[0] ?? []).map((value) => aliases[normalizeHeader(value)]);
      const missing = ["name", "admissionNumber"].filter((key) => !headers.includes(key as keyof Omit<StudentImportRow, "rowNumber">));
      if (missing.length) {
        setParseErrors(["The file must contain Full Name and Admission Number columns. Use the downloadable template."]);
        return;
      }
      const dataRows = grid.slice(1).filter((row) => row.some((value) => String(value).trim()));
      if (!dataRows.length) {
        setParseErrors(["The spreadsheet has no student records."]);
        return;
      }
      if (dataRows.length > MAX_STUDENT_IMPORT_ROWS) {
        setParseErrors([`A single import can contain at most ${MAX_STUDENT_IMPORT_ROWS.toLocaleString()} students.`]);
        return;
      }
      const parsedRows: StudentImportRow[] = [];
      const issues: string[] = [];
      dataRows.forEach((cells, index) => {
        const record: Record<string, unknown> = { rowNumber: index + 2 };
        headers.forEach((key, cellIndex) => {
          if (key) record[key] = cellText(cells[cellIndex], key === "dob" || key === "dateOfAdmission");
        });
        const gender = String(record.gender ?? "").toLowerCase();
        record.gender = gender === "male" ? "Male" : gender === "female" ? "Female" : record.gender ?? "";
        const parsed = studentImportRowSchema.safeParse(record);
        if (parsed.success) parsedRows.push(parsed.data);
        else issues.push(`Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "Invalid record."}`);
      });
      setRows(parsedRows);
      setParseErrors(issues);
    } catch {
      setParseErrors(["This file could not be read. Upload a valid .xlsx or .csv file."]);
    }
  }

  function confirmImport() {
    startTransition(async () => setResult(await importStudents({ sessionId, classId, rows })));
  }

  return (
    <div style={{ width: "min(900px, 84vw)" }}>
      <div className="notice" style={{ marginBottom: 16 }}>
        Download the template, keep its column headings, and enter one student per row. Admission numbers must be unique.
      </div>
      <div className="form-grid">
        <div className="field">
          <label>Session</label>
          <select className="select" value={sessionId} onChange={(event) => changeSession(Number(event.target.value))}>
            {sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Class</label>
          <select className="select" value={classId} onChange={(event) => setClassId(Number(event.target.value))} disabled={!visibleClasses.length}>
            {!visibleClasses.length && <option value={0}>No classes in this session</option>}
            {visibleClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>
      <div className="header-actions" style={{ marginTop: 16, flexWrap: "wrap" }}>
        <button className="button button-secondary" type="button" onClick={() => void downloadTemplate()}><Download size={15} /> Download Excel template</button>
        <label className="button button-secondary" style={{ cursor: "pointer" }}>
          <Upload size={15} /> Choose file
          <input type="file" accept=".xlsx,.csv" hidden onChange={(event) => void readFile(event.target.files?.[0])} />
        </label>
        {fileName && <span className="small muted"><FileSpreadsheet size={14} style={{ verticalAlign: "middle" }} /> {fileName}</span>}
      </div>

      {!!parseErrors.length && <div className="notice error" style={{ marginTop: 16 }}>{parseErrors.slice(0, 8).map((error) => <div key={error}>{error}</div>)}</div>}
      {result && <div className={`notice ${result.success ? "success" : "error"}`} style={{ marginTop: 16 }}>
        {result.success ? `${result.imported} student${result.imported === 1 ? "" : "s"} imported successfully.` : (
          <><strong>Nothing was imported. Correct these rows and upload again:</strong>{result.errors.slice(0, 12).map((error) => <div key={`${error.rowNumber}-${error.message}`}>{error.rowNumber ? `Row ${error.rowNumber}: ` : ""}{error.message}</div>)}</>
        )}
      </div>}

      {!!rows.length && !parseErrors.length && !result?.success && (
        <>
          <div className="table-wrap" style={{ marginTop: 18, maxHeight: 310 }}>
            <table className="table">
              <thead><tr><th>Row</th><th>Student</th><th>Admission no.</th><th>Gender</th><th>Parent phone</th></tr></thead>
              <tbody>{rows.slice(0, 100).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.name}</td><td>{row.admissionNumber}</td><td>{row.gender || "-"}</td><td>{row.parentPhone || "-"}</td></tr>)}</tbody>
            </table>
          </div>
          {rows.length > 100 && <p className="small muted">Showing the first 100 of {rows.length} valid records.</p>}
          <div className="form-actions">
            <button className="button button-primary" type="button" disabled={pending || !classId} onClick={confirmImport}>
              {pending ? "Importing students..." : `Import ${rows.length} student${rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
