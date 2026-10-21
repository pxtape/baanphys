// Exercise the actual deployed handler without creating real student accounts.
// @vitest-environment node
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";

let handler: (request: Request) => Promise<Response>;
const getUser = vi.fn(); const profile = vi.fn(); const createUser = vi.fn(); const insertAccount = vi.fn(); const deleteUser = vi.fn(); const createClient = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "admin" } }, error: null });
  profile.mockResolvedValue({ data: { role: "admin" }, error: null });
  createUser.mockResolvedValue({ data: { user: { id: "new-student" } }, error: null });
  insertAccount.mockResolvedValue({ error: null }); deleteUser.mockResolvedValue({ error: null });
  createClient.mockImplementation((_url, key) => key === "SUPABASE_SERVICE_ROLE_KEY" ? { auth: { admin: { createUser, deleteUser } }, from: () => ({ insert: insertAccount }) } : { auth: { getUser }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: profile }) }) }) });
  const source = fs.readFileSync("supabase/functions/classroom-admin/index.ts", "utf8").replace(/^import .*;\s*/m, "");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { createClient, Request, Response, Set, JSON, Deno: { env: { get: (key: string) => key }, serve: (value: typeof handler) => { handler = value; } } });
});
const input = { username: "Student.001", displayName: " Test Student ", password: "test-password-12345" };
function request(body: unknown = input, origin = "https://pxtape.github.io", token = "test-access-token") { return new Request("https://example.test", { method: "POST", headers: { Origin: origin, Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); }
describe("classroom account Edge Function", () => {
  it("does not trust a supplied role or return the password", async () => {
    const response = await handler(request({ ...input, role: "admin" }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ student: { id: "new-student", username: "student.001", displayName: "Test Student" } });
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ user_metadata: { display_name: "Test Student" } }));
    expect(JSON.stringify(body)).not.toContain(input.password);
    expect(insertAccount).toHaveBeenCalledWith({ user_id: "new-student", username: "student.001", display_name: "Test Student" });
  });
  it("rejects invalid authentication before accessing privileged credentials", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    expect((await handler(request())).status).toBe(401); expect(createClient).toHaveBeenCalledTimes(1);
  });
  it.each(["student", "teacher"])("does not allow %s to issue accounts", async (role) => {
    profile.mockResolvedValue({ data: { role }, error: null });
    expect((await handler(request())).status).toBe(403); expect(createUser).not.toHaveBeenCalled();
  });
  it("rejects an unapproved browser origin", async () => { expect((await handler(request(input, "https://untrusted.example"))).status).toBe(403); expect(getUser).not.toHaveBeenCalled(); });
  it("checks passwords and usernames before creating anything", async () => { expect((await handler(request({ ...input, password: "short" }))).status).toBe(400); expect(createUser).not.toHaveBeenCalled(); });
  it("rolls back just the account created in the failed request", async () => { insertAccount.mockResolvedValue({ error: { message: "failure" } }); expect((await handler(request())).status).toBe(500); expect(deleteUser).toHaveBeenCalledWith("new-student"); });
});
