import { beforeEach, describe, expect, it, vi } from "vitest";
import { canPromote, promotionTargets, repeatedTarget, suggestedPromotionTarget } from "../lib/promotion";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), transaction: vi.fn(), sessions: vi.fn(), classes: vi.fn(), source: vi.fn(), enroll: vi.fn(), profile: vi.fn(), deactivate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner, requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction, legacyClass: {
  count: vi.fn(({ where }) => Promise.resolve(where.id.in.filter((id: number) => [1, 2, 3, 4, 5].includes(id)).length)),
} } }));
import { promoteSession } from "../app/actions/admin";

const targets = [
  { id: 1, name: "BASIC 5" }, { id: 2, name: "JSS1A" },
  { id: 3, name: "JSS2B" }, { id: 4, name: "JSS 2A" }, { id: 5, name: "JSS3A" },
];

describe("promotion class order", () => {
  it("excludes lower and equal levels and prefers the next level in the same stream", () => {
    expect(promotionTargets("JSS1A", targets).map((item) => item.id)).toEqual([4, 3, 5]);
    expect(suggestedPromotionTarget("JSS1A", targets)).toBe(4);
    expect(canPromote("JSS1A", "JSS1B")).toBe(false);
    expect(canPromote("JSS1A", "BASIC 5")).toBe(false);
  });

  it.each([["BASIC 6", "JSS1A"], ["JSS3A", "SS1A"], ["SS 2", "SSS3"], ["Nursery 3", "Primary 1"], ["Primary 5", "BASIC 6"]])("allows progression from %s to %s", (source, target) => {
    expect(canPromote(source, target)).toBe(true);
  });

  it("does not treat BASIC 7 as higher than JSS1 or unknown names as valid levels", () => {
    expect(canPromote("JSS1", "Basic 7")).toBe(false);
    expect(canPromote("JSS1", "Senior class")).toBe(false);
    expect(canPromote("JSS4", "SS1")).toBe(false);
    expect(suggestedPromotionTarget("SSS3", targets)).toBeUndefined();
  });

  it("promotes the school's Pre-Nursery class to Nursery 1 and excludes the same level", () => {
    const nurseryClasses = [{ id: 1, name: "Pre-Nursery " }, { id: 2, name: "Nursery 1A" }, { id: 3, name: "Nursery 1B" }];
    expect(promotionTargets("Pre-Nursery", nurseryClasses).map((item) => item.id)).toEqual([2, 3]);
    expect(suggestedPromotionTarget("Pre-Nursery", nurseryClasses)).toBe(2);
    expect(canPromote("Nursery 1A", "Pre-Nursery")).toBe(false);
  });

  it("matches repeats across spacing and case but rejects ambiguous matching classes", () => {
    expect(repeatedTarget(" jss 1 a ", targets)).toBe(2);
    expect(repeatedTarget("JSS1B", targets)).toBeUndefined();
    expect(repeatedTarget("JSS1A", [...targets, { id: 6, name: "JSS 1A" }])).toBeUndefined();
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.owner.mockResolvedValue({ schoolId: 1 });
  mocks.sessions.mockResolvedValue(2);
  mocks.classes.mockResolvedValue(targets);
  mocks.source.mockResolvedValue({ id: BigInt(10), studentId: BigInt(20), class: { name: "JSS1A" } });
  mocks.transaction.mockImplementation((callback) => callback({
    legacySession: { count: mocks.sessions }, legacyClass: { findMany: mocks.classes },
    enrollment: { findFirst: mocks.source, upsert: mocks.enroll, update: mocks.deactivate },
    studentProfile: { update: mocks.profile },
  }));
});

function input(outcome: "PROMOTE" | "REPEATED" | "WITHDRAWN" | "GRADUATED", targetClassId?: number) {
  return { sourceSessionId: 5, targetSessionId: 6, decisions: [{ enrollmentId: "10", outcome, targetClassId }] };
}

describe("promotion action", () => {
  it.each([1, 2, 999])("rejects lower, equal, and unavailable targets (%s) before creating an enrollment", async (target) => {
    await expect(promoteSession(input("PROMOTE", target))).rejects.toThrow();
    expect(mocks.enroll).not.toHaveBeenCalled();
  });

  it("enrolls a repeated student in the same class in the new session and keeps history", async () => {
    await promoteSession(input("REPEATED", 1));
    expect(mocks.enroll).toHaveBeenCalledWith({
      where: { studentId_sessionId: { studentId: BigInt(20), sessionId: 6 } },
      update: { classId: 2, active: true },
      create: { schoolId: 1, studentId: BigInt(20), sessionId: 6, classId: 2 },
    });
    expect(mocks.profile).toHaveBeenCalledWith({ where: { id: BigInt(20) }, data: { status: "ACTIVE" } });
    expect(mocks.deactivate).not.toHaveBeenCalled();
  });

  it("rejects repeating when no matching class exists", async () => {
    mocks.classes.mockResolvedValue(targets.filter((item) => item.id !== 2));
    await expect(promoteSession(input("REPEATED"))).rejects.toThrow(/matching class/);
    expect(mocks.enroll).not.toHaveBeenCalled();
  });

  it("promotes into the chosen higher class while retaining the source enrollment", async () => {
    await promoteSession(input("PROMOTE", 4));
    expect(mocks.enroll.mock.calls[0][0].create).toEqual({ schoolId: 1, studentId: BigInt(20), sessionId: 6, classId: 4 });
    expect(mocks.deactivate).not.toHaveBeenCalled();
    expect(mocks.source.mock.calls[0][0].where).toMatchObject({ schoolId: 1, sessionId: 5, active: true, class: { schoolId: 1, sessionId: 5, archivedAt: null } });
  });

  it.each(["WITHDRAWN", "GRADUATED"] as const)("retains the existing %s outcome", async (outcome) => {
    await promoteSession(input(outcome));
    expect(mocks.enroll).not.toHaveBeenCalled();
    expect(mocks.profile).toHaveBeenCalledWith({ where: { id: BigInt(20) }, data: { status: outcome } });
    expect(mocks.deactivate).toHaveBeenCalledWith({ where: { id: BigInt(10) }, data: { active: false } });
  });

  it("rejects sessions outside the school and missing source enrollments", async () => {
    mocks.sessions.mockResolvedValueOnce(1);
    await expect(promoteSession(input("PROMOTE", 4))).rejects.toThrow(/sessions/);
    mocks.source.mockResolvedValueOnce(null);
    await expect(promoteSession(input("PROMOTE", 4))).rejects.toThrow(/source enrollment/);
    expect(mocks.enroll).not.toHaveBeenCalled();
  });

  it("rejects duplicate decisions and promotion within the same session", async () => {
    const data = input("PROMOTE", 4);
    await expect(promoteSession({ ...data, decisions: [...data.decisions, ...data.decisions] })).rejects.toThrow(/one promotion decision/);
    await expect(promoteSession({ ...data, targetSessionId: 5 })).rejects.toThrow(/different target session/);
    expect(mocks.enroll).not.toHaveBeenCalled();
  });
});
