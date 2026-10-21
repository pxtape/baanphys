import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ configured: vi.fn(), getUser: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser }, from: mocks.from,
}) }));

import { GET } from "./route";

function row(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query), eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
  };
  return query;
}

function requestMedia() {
  return GET(new Request("http://localhost:3000/courses/media/lesson-1"), {
    params: Promise.resolve({ itemId: "lesson-1" }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: { id: "student-001", is_anonymous: false } }, error: null });
});

describe("protected course media", () => {
  it("does not query material records before authentication", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await requestMedia();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects anonymous sessions even if Supabase returned a user ID", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "anonymous-001", is_anonymous: true } }, error: null });
    expect((await requestMedia()).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not play media when session verification failed", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "student-001" } }, error: { message: "expired" } });
    expect((await requestMedia()).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: null },
    { data: null, error: { message: "not authorized" } },
  ])("does not reveal playback when RLS hides or rejects the item (%j)", async ({ data, error }) => {
    const itemQuery = row(data, error);
    mocks.from.mockReturnValue(itemQuery);
    const response = await requestMedia();
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("<iframe");
    expect(itemQuery.eq).toHaveBeenCalledWith("id", "lesson-1");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it.each([null, "", "short", "valid-id/../../file", 'file123456\" onload=\"alert(1)'])
    ("refuses missing or invalid Drive file ID %j", async (driveFileId) => {
      mocks.from.mockReturnValue(row({ title: "Lesson", kind: "video", drive_file_id: driveFileId }));
      const response = await requestMedia();
      expect(response.status).toBe(404);
      expect(response.headers.get("Content-Type")).toContain("text/plain");
      expect(await response.text()).not.toContain("<iframe");
      expect(mocks.from).toHaveBeenCalledTimes(1);
    });

  it("escapes the learner identity and title while including a moving watermark and restricted playback headers", async () => {
    const title = 'Lesson <script>alert("title")</script> & "quoted"';
    const displayName = 'นักเรียน <img src=x onerror="alert(1)">';
    const username = 'student.<script>alert("name")</script> & \'quoted\'';
    mocks.from.mockImplementation((table: string) => table === "classroom_items"
      ? row({ title, kind: "video", drive_file_id: "valid_file-id_12345" })
      : row({ display_name: displayName, username }));

    const response = await requestMedia();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Permissions-Policy")).toBe("fullscreen=(self)");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-src https://drive.google.com");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'none'");

    const html = await response.text();
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.title).toBe(title);
    expect(document.querySelectorAll("iframe")).toHaveLength(1);
    expect(document.querySelector("iframe")?.title).toBe(title);
    expect(document.querySelector("iframe")?.getAttribute("allow")).toBe("fullscreen 'none'");
    expect(document.querySelector("iframe")?.hasAttribute("allowfullscreen")).toBe(false);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe("https://drive.google.com/file/d/valid_file-id_12345/preview");
    expect(document.querySelectorAll("script,img")).toHaveLength(0);
    expect(document.querySelector(".watermark")?.textContent).toContain(displayName);
    expect(document.querySelector(".watermark")?.textContent).toContain(username);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("@keyframes move");
    expect(html).toContain("prefers-reduced-motion");
  });

  it("fails closed when Supabase is not configured", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await requestMedia()).status).toBe(503);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
