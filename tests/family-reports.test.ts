import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ report: vi.fn(), classData: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { termReport: { findFirst: mocks.report } } }));
vi.mock("@/lib/report-data", () => ({ getClassReportData: mocks.classData }));

import { getFamilyReport } from "../lib/family-reports";

const report = { id: BigInt(20), termId: 2, status: "PUBLISHED", enrollment: { id: BigInt(10), sessionId: 5, classId: 3 } };
const student = { enrollment: { id: BigInt(10), studentId: BigInt(8) }, report };

beforeEach(() => { vi.clearAllMocks(); mocks.report.mockResolvedValue(report); mocks.classData.mockResolvedValue({ students: [student] }); });

describe("family report access", () => {
  it("requires the authenticated school, student link, and published status", async () => {
    expect(await getFamilyReport(1, BigInt(8), BigInt(20))).toMatchObject({ student });
    expect(mocks.report).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: BigInt(20), schoolId: 1, status: "PUBLISHED", enrollment: { schoolId: 1, studentId: BigInt(8) },
    } }));
  });

  it("does not load a class for an unavailable or unauthorized report", async () => {
    mocks.report.mockResolvedValue(null);
    expect(await getFamilyReport(1, BigInt(8), BigInt(21))).toBeNull();
    expect(mocks.classData).not.toHaveBeenCalled();
  });

  it("keeps historical reports accessible after graduation or withdrawal", async () => {
    await getFamilyReport(1, BigInt(8), BigInt(20));
    expect(mocks.classData).toHaveBeenCalledWith(1, 5, 2, 3);
  });

  it("rechecks publication and ownership after loading class data", async () => {
    for (const value of [
      { ...student, report: { ...report, status: "DRAFT" } },
      { ...student, report: null },
      { ...student, enrollment: { ...student.enrollment, studentId: BigInt(9) } },
    ]) {
      mocks.classData.mockResolvedValue({ students: [value] });
      expect(await getFamilyReport(1, BigInt(8), BigInt(20))).toBeNull();
    }
  });
});
