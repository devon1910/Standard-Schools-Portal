"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import ExcelJS from "exceljs";
import { importStudents, type StudentImportResult } from "@/app/actions/admin";
import { type StudentImportRow } from "@/lib/student-import";
import { createWordTemplate, importColumns as columns, importExample, parseStudentGrid, readWordTable } from "@/lib/student-import-file";

type SessionOption = { id: number; name: string };
type ClassOption = { id: number; name: string; sessionId: number };

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
  const visibleClasses = classes.filter((item) => item.sessionId === sessionId);
  const readVersion = useRef(0);
  const [rows, setRows] = useState<StudentImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<StudentImportResult>();
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState(false);
  const availableNames = new Set(visibleClasses.map((item) => item.name.trim().toLowerCase()));
  const unmatchedClasses = [...new Set(rows.filter((row) => !availableNames.has(row.className.trim().toLowerCase())).map((row) => row.className))];
  const exampleClass = visibleClasses[0]?.name ?? importExample[2];

  function changeSession(value: number) {
    setSessionId(value);
    setResult(undefined);
  }

  async function downloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students");
    worksheet.addRow([...columns]);
    worksheet.addRow(importExample.map((value, index) => index === 2 ? exampleClass : value));
    worksheet.columns.forEach((column, index) => { column.width = Math.max(columns[index].length + 3, 18); });
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "student-import-template.xlsx");
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function readFile(file?: File) {
    const version = ++readVersion.current;
    setRows([]);
    setResult(undefined);
    setParseErrors([]);
    if (!file) return;
    setFileName(file.name);
    setReading(true);
    try {
      if (file.size > 5_000_000) throw new Error("Use a file smaller than 5 MB.");
      let grid: unknown[][];
      if (file.name.toLowerCase().endsWith(".csv")) {
        grid = parseCsv(await file.text());
      } else if (file.name.toLowerCase().endsWith(".docx")) {
        grid = await readWordTable(await file.arrayBuffer());
      } else if (file.name.toLowerCase().endsWith(".xlsx")) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error("The workbook has no worksheet.");
        grid = [];
        sheet.eachRow({ includeEmpty: true }, (sheetRow) => {
          const values: unknown[] = [];
          sheetRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => { values[columnNumber - 1] = cell.value; });
          grid.push(values);
        });
      } else throw new Error("Use .docx, .xlsx, or .csv. For an older Word .doc file, open it in Word and save it as .docx.");
      const parsed = parseStudentGrid(grid);
      if (version !== readVersion.current) return;
      setRows(parsed.rows);
      setParseErrors(parsed.errors);
    } catch (error) {
      if (version === readVersion.current) setParseErrors([error instanceof Error ? error.message : "This file could not be read. Upload a valid .docx, .xlsx, or .csv file."]);
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }

  function confirmImport() {
    startTransition(async () => {
      try { setResult(await importStudents({ sessionId, rows })); }
      catch { setResult({ success: false, imported: 0, errors: [{ rowNumber: 0, message: "The import failed. No students were imported. Try again." }] }); }
    });
  }

  return (
    <div className="student-import">
      <div className="notice" style={{ marginBottom: 16 }}>
        Use Word (.docx), Excel (.xlsx), or CSV. Keep the headings and enter one student per row. First name, last name, class, gender, and date of birth are required. All other fields are optional. The system generates student IDs from school Settings. Use YYYY-MM-DD for dates. Class must match a class in the selected session. Save older Word .doc files as .docx first.
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="import-session">Session</label>
          <select id="import-session" className="select" value={sessionId} disabled={pending} onChange={(event) => changeSession(Number(event.target.value))}>
            {sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="field" role="group" aria-labelledby="import-classes-label">
          <span className="field-label" id="import-classes-label">Available classes ({visibleClasses.length})</span>
          {visibleClasses.length ? <ul className="class-list">{visibleClasses.map((item) => <li key={item.id}>{item.name}</li>)}</ul> : <p className="small muted">Create classes in this session before importing.</p>}
        </div>
      </div>
      <div className="header-actions" style={{ marginTop: 16, flexWrap: "wrap" }}>
        <button className="button button-secondary" type="button" disabled={pending || !visibleClasses.length} onClick={() => void downloadTemplate()}><Download size={15} /> Download Excel template</button>
        <button className="button button-secondary" type="button" disabled={pending || !visibleClasses.length} onClick={async () => download(new Blob([await createWordTemplate()], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "student-import-template.docx")}><Download size={15} /> Download Word template</button>
        <label className="button button-secondary" style={{ cursor: "pointer" }}>
          <Upload size={15} /> Choose file
          <input type="file" accept=".docx,.xlsx,.csv" disabled={pending} hidden onChange={(event) => void readFile(event.target.files?.[0])} />
        </label>
        {fileName && <span className="small muted import-file-name"><FileSpreadsheet size={14} style={{ verticalAlign: "middle" }} /> {fileName}</span>}
      </div>
      {reading && <p className="small muted" role="status">Reading file...</p>}

      {!!parseErrors.length && <div className="notice error" style={{ marginTop: 16 }}>{parseErrors.slice(0, 8).map((error) => <div key={error}>{error}</div>)}</div>}
      {!!unmatchedClasses.length && !parseErrors.length && !result?.success && <div className="notice warning" role="alert" style={{ marginTop: 16 }}>These classes are not in the selected session: <strong>{unmatchedClasses.join(", ")}</strong>. Use the class names shown above or choose a different session.</div>}
      {result && <div className={`notice ${result.success ? "success" : "error"}`} style={{ marginTop: 16 }}>
        {result.success ? `${result.imported} student${result.imported === 1 ? "" : "s"} imported successfully.` : (
          <><strong>Nothing was imported. Correct these rows and upload again:</strong>{result.errors.slice(0, 12).map((error) => <div key={`${error.rowNumber}-${error.message}`}>{error.rowNumber ? `Row ${error.rowNumber}: ` : ""}{error.message}</div>)}</>
        )}
      </div>}

      {!!rows.length && !parseErrors.length && !result?.success && (
        <>
          <div className="table-wrap" style={{ marginTop: 18, maxHeight: 310 }}>
            <table className="table">
              <thead><tr><th>Row</th><th>Student</th><th>Class</th><th>Gender</th><th>Date of birth</th></tr></thead>
              <tbody>{rows.slice(0, 100).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.name}</td><td>{row.className}</td><td>{row.gender}</td><td>{row.dob}</td></tr>)}</tbody>
            </table>
          </div>
          {rows.length > 100 && <p className="small muted">Showing the first 100 of {rows.length} valid records.</p>}
          <div className="form-actions">
            <button className="button button-primary" type="button" disabled={pending || reading || !visibleClasses.length || !!unmatchedClasses.length} onClick={confirmImport}>
              {pending ? "Importing students..." : `Import ${rows.length} student${rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
