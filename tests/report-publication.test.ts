import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), owner: vi.fn(), transaction: vi.fn(), configured: vi.fn(), term: vi.fn(),
  count: vi.fn(), score: vi.fn(), updateReports: vi.fn(), enrollment: vi.fn(), setup: vi.fn(), report: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user, requireOwner: mocks.owner }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  $transaction: mocks.transaction,
  classSubject: { findFirst: mocks.configured }, legacyTerm: { findFirst: mocks.term },
  enrollment: { count: mocks.count, findFirst: mocks.enrollment }, resultScore: { upsert: mocks.score },
  termReport: { updateMany: mocks.updateReports, upsert: mocks.report }, termSetup: { findUnique: mocks.setup },
} }));

import { saveScoreSheet, saveTermReport, unpublishClassReports } from "../app/actions/results";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ schoolId: 1, id: "staff" });
  mocks.owner.mockResolvedValue({ schoolId: 1, id: "owner" });
  mocks.configured.mockResolvedValue({ id: 1 });
  mocks.term.mockResolvedValue({ id: 2 });
  mocks.count.mockResolvedValue(1);
  mocks.enrollment.mockResolvedValue({ id: BigInt(10), sessionId: 5 });
  mocks.setup.mockResolvedValue({ schoolOpened: 70 });
});

describe("publication after edits", () => {
  it("withdraws reports for the whole class when scores change because ranks can change", async () => {
    await saveScoreSheet({ classId: 3, termId: 2, subjectId: 4, scores: [{ enrollmentId: "10", firstTest: 15, secondTest: 15, exam: 50 }] });
    expect(mocks.score).toHaveBeenCalled();
    expect(mocks.updateReports).toHaveBeenCalledWith({
      where: { schoolId: 1, termId: 2, enrollment: { classId: 3 } },
      data: { status: "DRAFT", publishedAt: null, publishedBy: null },
    });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Array));
  });

  it("makes changed report details private until the owner publishes them again", async () => {
    const data = new FormData();
    Object.entries({
      enrollmentId: "10", termId: "2", timesPresent: "65", concentration: "4", schoolAttendance: "4",
      assignments: "4", punctuality: "4", classParticipation: "4", attitudeToProperty: "4",
      cleanliness: "4", generalConduct: "4", teacherRemark: "Good work", principalRemark: "Keep it up",
    }).forEach(([key, value]) => data.set(key, value));
    await saveTermReport(data);
    expect(mocks.report.mock.calls[0][0].update).toMatchObject({ status: "DRAFT", publishedAt: null, publishedBy: null });
  });

  it("lets only the owner withdraw reports within their school", async () => {
    await unpublishClassReports(3, 2);
    expect(mocks.owner).toHaveBeenCalled();
    expect(mocks.updateReports).toHaveBeenCalledWith({
      where: { schoolId: 1, termId: 2, enrollment: { schoolId: 1, classId: 3 } },
      data: { status: "DRAFT", publishedAt: null, publishedBy: null },
    });
  });
});
