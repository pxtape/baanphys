import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentClassroom } from "@/components/classroom/StudentClassroom";
import { DEMO_ENROLLMENTS, DEMO_ITEMS, DEMO_STUDENT } from "@/lib/course-catalog";
import {setImmediate as nextImmediate} from "node:timers";

const { setTask } = vi.hoisted(() => ({ setTask: vi.fn() }));
vi.mock("@/app/courses/actions", () => ({ setClassroomTask: setTask }));

afterEach(async()=>{cleanup();await act(async()=>{await new Promise<void>(resolve=>nextImmediate(resolve));});window.history.replaceState(null,"","/");});

describe("StudentClassroom access and progress", () => {
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
    expect(screen.queryByText("ทำครบแล้ว · ติดต่อ LINE เพื่อขอปลดล็อก")).not.toBeInTheDocument();
    expect(screen.queryByText("ก่อนเริ่ม HW · ลองให้เต็มที่ แล้วค่อยขอคำใบ้")).not.toBeInTheDocument();
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
  it("opens both solution types before a sheet or homework is completed", () => {
    for (const kind of ["sheet", "homework"] as const) {
      const item = { ...DEMO_ITEMS[0], id: "solution-test", kind, answerFileId: "answer_file_123456", solutionFileId: "solution_file_123456" };
      const view = render(<StudentClassroom directDrive user={DEMO_STUDENT} enrollments={DEMO_ENROLLMENTS} items={[item]} completedItemIds={[]}/>);
      fireEvent.click(screen.getByRole("button", { name: /^Level 1 / }));
      expect(screen.getByRole("checkbox")).not.toBeChecked();
      fireEvent.click(screen.getByRole("button", { name: "Answer only" }));
      expect(screen.getByTitle(`${item.title} — Answer only`)).toHaveAttribute("src", "https://drive.google.com/file/d/answer_file_123456/preview");
      fireEvent.click(screen.getByRole("button", { name: "Full solution" }));
      expect(screen.getByTitle(`${item.title} — Full solution`)).toHaveAttribute("src", "https://drive.google.com/file/d/solution_file_123456/preview");
      expect(setTask).not.toHaveBeenCalled();
      view.unmount();
    }
  });

});


it("opens an accessible level from a profile link but keeps locked levels closed",async()=>{window.history.replaceState(null,"","/courses?course=pre-posn&level=1");const view=render(<StudentClassroom user={DEMO_STUDENT} enrollments={DEMO_ENROLLMENTS} items={DEMO_ITEMS} completedItemIds={[]}/>);expect(await screen.findByRole("region",{name:"รายการเรียน Level 1"})).toBeInTheDocument();view.unmount();window.history.replaceState(null,"","/courses?course=pre-posn&level=10");render(<StudentClassroom user={DEMO_STUDENT} enrollments={DEMO_ENROLLMENTS} items={DEMO_ITEMS} completedItemIds={[]}/>);expect(screen.queryByRole("region",{name:"รายการเรียน Level 10"})).not.toBeInTheDocument();});

