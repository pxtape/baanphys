import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(), getUser: vi.fn(), from: vi.fn(), rpc: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser }, from: mocks.from, rpc: mocks.rpc,
}) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { advanceClassroomStudent, enrollClassroomStudent, revokeClassroomEnrollment, setClassroomTask } from "./actions";

const studentId = "00000000-0000-0000-0000-000000000001";

function row(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query), eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
  };
  return query;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: { id: studentId } }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
});

describe("classroom authorization and manual progression", () => {
  it("rejects an expired session before looking up or mutating course records", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await setClassroomTask("lesson-1", true)).toHaveProperty("error");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects Supabase anonymous sessions even though they use the authenticated database role", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: studentId, is_anonymous: true } }, error: null });
    expect(await setClassroomTask("lesson-1", true)).toHaveProperty("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([enrollClassroomStudent, advanceClassroomStudent, revokeClassroomEnrollment])("rejects student calls to every admin operation", async (action) => {
    mocks.from.mockReturnValue(row({ role: "student" }));
    expect(await action(studentId, "pre-posn")).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not create progress for a material hidden by database access rules", async () => {
    mocks.from.mockReturnValue(row(null));
    expect(await setClassroomTask("locked-lesson", true)).toHaveProperty("error");
    expect(mocks.from.mock.calls.map((call) => call[0])).toEqual(["classroom_items"]);
  });

  it("records completion for the authenticated owner without unlocking any level", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    mocks.from.mockImplementation((table: string) => table === "classroom_items" ? row({ id: "lesson-1" }) : { upsert });
    expect(await setClassroomTask("lesson-1", true)).toEqual({});
    expect(upsert).toHaveBeenCalledWith({ user_id: studentId, item_id: "lesson-1", completed: true }, { onConflict: "user_id,item_id" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("sends the observed level to the transactional admin operation for stale-click protection", async () => {
    mocks.from.mockImplementation((table: string) => table === "profiles" ? row({ role: "admin" }) : row({ unlocked_level: 9 }));
    expect(await advanceClassroomStudent(studentId, "pre-posn")).toEqual({});
    expect(mocks.rpc).toHaveBeenCalledWith("classroom_advance_student", { p_user_id: studentId, p_course_id: "pre-posn", p_expected_level: 9 });
  });

  it("keeps an incomplete level locked when the database rejects an advance", async () => {
    mocks.from.mockImplementation((table: string) => table === "profiles" ? row({ role: "admin" }) : row({ unlocked_level: 9 }));
    mocks.rpc.mockResolvedValue({ error: { message: "CLASSROOM_TASKS_INCOMPLETE" } });
    expect((await advanceClassroomStudent(studentId, "pre-posn")).error).toContain("ยังทำรายการเรียน");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
