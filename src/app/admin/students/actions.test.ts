import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClassroomStudent } from "@/app/admin/students/actions";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  createAdminClient: vi.fn(),
  createUser: vi.fn(),
  insertAccount: vi.fn(),
  deleteUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ single: mocks.profile }) }) }),
}) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createAdminClient }));

describe("createClassroomStudent authorization", () => {
  const validInput = { username: " STUDENT_01 ", password: "a-12-character-password", displayName: " Student " };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-id" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "admin" }, error: null });
    mocks.createAdminClient.mockReturnValue({ auth: { admin: { createUser: mocks.createUser, deleteUser: mocks.deleteUser } }, from: () => ({ insert: mocks.insertAccount }) });
    mocks.createUser.mockResolvedValue({ data: { user: { id: "new-id" } }, error: null });
    mocks.insertAccount.mockResolvedValue({ error: null });
    mocks.deleteUser.mockResolvedValue({ error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("never constructs a privileged client for an unauthenticated caller", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await createClassroomStudent(validInput)).error).toContain("แอดมิน");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it.each(["teacher", "student"])("does not grant account creation to role %s", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role }, error: null });
    expect((await createClassroomStudent(validInput)).error).toContain("เฉพาะแอดมิน");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("uses server-only credentials after verifying admin and never sets an authorization role in metadata", async () => {
    expect(await createClassroomStudent(validInput)).toEqual({ student: { id: "new-id", displayName: "Student", username: "student_01" } });
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: "student_01@classroom.invalid",
      password: validInput.password,
      email_confirm: true,
      user_metadata: { display_name: "Student", username: "student_01" },
    });
  });

  it("does not attempt creation without a configured server secret", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect((await createClassroomStudent(validInput)).error).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rolls back only the newly created account if classroom storage fails", async () => {
    mocks.insertAccount.mockResolvedValue({ error: { message: "storage failed" } });
    expect((await createClassroomStudent(validInput)).error).toBeTruthy();
    expect(mocks.deleteUser).toHaveBeenCalledWith("new-id");
  });

  it("requires a strong initial password before any Auth call", async () => {
    expect((await createClassroomStudent({ ...validInput, password: "short" })).error).toContain("12–128");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});
