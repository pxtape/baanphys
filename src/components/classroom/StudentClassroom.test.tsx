import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentClassroom } from "@/components/classroom/StudentClassroom";
import { DEMO_ENROLLMENTS, DEMO_ITEMS, DEMO_STUDENT } from "@/lib/course-catalog";

const { setTask } = vi.hoisted(() => ({ setTask: vi.fn() }));
vi.mock("@/app/courses/actions", () => ({ setClassroomTask: setTask }));

describe("StudentClassroom access and progress", () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    setTask.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("keeps unenrolled courses and the next level locked after completing a demo checklist", async () => {
    render(<StudentClassroom demo user={DEMO_STUDENT} enrollments={DEMO_ENROLLMENTS} items={DEMO_ITEMS} completedItemIds={[]}/>);
    expect(screen.getByRole("button", { name: "Camp 1 ยังไม่ปลดล็อก" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Level 10 / })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Level 9 / }));
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    expect(await screen.findByText("ทำครบแล้ว · ติดต่อ LINE เพื่อขอปลดล็อก")).toBeInTheDocument();
    expect(screen.getByText("การติ๊กครบเป็นการบันทึกงานของคุณ ยังไม่ได้ส่งคำขอให้ติวเตอร์ กรุณาทัก LINE ด้วยตัวเอง")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Level 10 / })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "กลับไปเส้นทางเรียน" }));
    expect(screen.getByRole("button", { name: /^Level 10 / })).toBeDisabled();
    expect(setTask).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(`baanphys:demo:completed:${DEMO_STUDENT.id}`) ?? "[]")).toEqual([
      "demo-pre-posn-9-video", "demo-pre-posn-9-homework",
    ]);
  });

  it("reflects a manual demo unlock from the admin preview", async () => {
    render(<StudentClassroom demo user={DEMO_STUDENT} enrollments={DEMO_ENROLLMENTS} items={DEMO_ITEMS} completedItemIds={[]}/>);
    expect(screen.getByRole("button", { name: /^Level 10 / })).toBeDisabled();
    act(() => {
      localStorage.setItem(`baanphys:demo:enrollments:${DEMO_STUDENT.id}`, JSON.stringify([{ ...DEMO_ENROLLMENTS[0], unlockedLevel: 10 }]));
      window.dispatchEvent(new Event("baanphys:demo:update"));
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /^Level 10 / })).toBeEnabled());
    expect(screen.getByRole("button", { name: /^Level 11 / })).toBeDisabled();
  });

  it("reverts a live progress checkbox when the server rejects access", async () => {
    setTask.mockResolvedValue({ error: "ไม่มีสิทธิ์เข้าถึงบทเรียนนี้" });
    render(<StudentClassroom user={DEMO_STUDENT} enrollments={DEMO_ENROLLMENTS} items={DEMO_ITEMS} completedItemIds={[]}/>);
    fireEvent.click(screen.getByRole("button", { name: /^Level 9 / }));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("ไม่มีสิทธิ์เข้าถึงบทเรียนนี้");
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
    expect(setTask).toHaveBeenCalledWith("demo-pre-posn-9-video", true);
    expect(localStorage.getItem(`baanphys:demo:completed:${DEMO_STUDENT.id}`)).toBeNull();
  });

  it("shows database level metadata and opens authorized media without a Drive file ID in page props", async () => {
    const level = { number: 1, title: "บทเรียนจากฐานข้อมูล", section: "กลศาสตร์", durationMinutes: 75, isPlaceholder: false };
    render(<StudentClassroom user={DEMO_STUDENT}
      enrollments={[{ ...DEMO_ENROLLMENTS[0], unlockedLevel: 1 }]}
      courseLevels={{ "pre-posn": [level] }}
      items={[{ ...DEMO_ITEMS[0], id: "live-video-one", hasMedia: true, driveFileId: null }]}
      completedItemIds={[]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Level 1 บทเรียนจากฐานข้อมูล เลเวลปัจจุบัน" }));
    expect(screen.getAllByText("1 ชม. 15 นาที")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "ซ่อนวิดีโอ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Level 1 / })).toBeNull();
    expect(screen.getByTitle(DEMO_ITEMS[0].title)).toHaveAttribute("src", "/courses/media/live-video-one");
    expect(document.querySelector('iframe[src*="drive.google.com"]')).toBeNull();
    const mediaShell = screen.getByTitle(DEMO_ITEMS[0].title).parentElement!;
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(mediaShell, "requestFullscreen", { value: requestFullscreen });
    fireEvent.click(screen.getByRole("button", { name: "ขยายเต็มจอ" }));
    await waitFor(() => expect(requestFullscreen).toHaveBeenCalledOnce());
    expect(mediaShell).toHaveClass("classroom-media-shell");
  });
});
