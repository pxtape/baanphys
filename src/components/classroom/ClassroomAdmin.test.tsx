import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassroomAdmin } from "@/components/classroom/ClassroomAdmin";
import { DEMO_ITEMS, DEMO_STUDENTS, type StudentRecord } from "@/lib/course-catalog";

const actions = vi.hoisted(() => ({
  advanceClassroomStudent: vi.fn(),
  enrollClassroomStudent: vi.fn(),
  revokeClassroomEnrollment: vi.fn(),
  createClassroomStudent: vi.fn(),
}));
vi.mock("@/app/courses/actions", () => ({
  advanceClassroomStudent: actions.advanceClassroomStudent,
  enrollClassroomStudent: actions.enrollClassroomStudent,
  revokeClassroomEnrollment: actions.revokeClassroomEnrollment,
}));
vi.mock("@/app/admin/students/actions", () => ({ createClassroomStudent: actions.createClassroomStudent }));

describe("ClassroomAdmin", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    actions.advanceClassroomStudent.mockResolvedValue({});
    actions.enrollClassroomStudent.mockResolvedValue({});
    actions.revokeClassroomEnrollment.mockResolvedValue({});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it("keeps the next level locked while the current checklist is incomplete", async () => {
    render(<ClassroomAdmin demo students={DEMO_STUDENTS}/>);
    fireEvent.click(screen.getByRole("button", { name: "ปลดล็อก Level 10" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Level 9 ยังทำรายการไม่ครบ");
    expect(screen.getByText("เปิดถึง Level 9 / 31")).toBeInTheDocument();
    expect(localStorage.getItem("baanphys:demo:enrollments:demo-student-001")).toBeNull();
    expect(actions.advanceClassroomStudent).not.toHaveBeenCalled();
  });

  it("refreshes persisted student completion but only advances after the admin clicks", async () => {
    render(<ClassroomAdmin demo students={DEMO_STUDENTS}/>);
    const currentItems = DEMO_ITEMS.filter((item) => item.courseId === "pre-posn" && item.levelNumber === 9);
    act(() => {
      localStorage.setItem("baanphys:demo:completed:demo-student-001", JSON.stringify(currentItems.map((item) => item.id)));
      window.dispatchEvent(new Event("baanphys:demo:update"));
    });
    expect(await screen.findByText("รายการ Level 9: ทำครบ 2 / 2 รายการ")).toBeInTheDocument();
    expect(screen.getByText("เปิดถึง Level 9 / 31")).toBeInTheDocument();
    expect(localStorage.getItem("baanphys:demo:enrollments:demo-student-001")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "ปลดล็อก Level 10" }));
    expect(await screen.findByText("เปิดถึง Level 10 / 31")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("baanphys:demo:enrollments:demo-student-001")!)).toEqual([
      { studentId: "demo-student-001", courseId: "pre-posn", unlockedLevel: 10 },
    ]);
    expect(actions.advanceClassroomStudent).not.toHaveBeenCalled();
    expect(actions.enrollClassroomStudent).not.toHaveBeenCalled();
    expect(actions.revokeClassroomEnrollment).not.toHaveBeenCalled();
    expect(actions.createClassroomStudent).not.toHaveBeenCalled();
  });

  it("does not let one student's completed checklist unlock another student's level", async () => {
    localStorage.setItem("baanphys:demo:completed:demo-student-001", JSON.stringify(DEMO_ITEMS.map((item) => item.id)));
    render(<ClassroomAdmin demo students={DEMO_STUDENTS}/>);
    fireEvent.click(screen.getByRole("button", { name: /นักเรียนเริ่มต้น @student.new/ }));
    fireEvent.click(screen.getByRole("button", { name: "ปลดล็อก Level 2" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Level 1 ยังทำรายการไม่ครบ");
    expect(screen.getByText("เปิดถึง Level 1 / 31")).toBeInTheDocument();
    expect(localStorage.getItem("baanphys:demo:enrollments:demo-student-002")).toBeNull();
  });

  it("creates a live account without persisting its initial password to browser storage", async () => {
    const student: StudentRecord = { id: "student-id", username: "student01", displayName: "นักเรียนใหม่", enrollments: [] };
    actions.createClassroomStudent.mockResolvedValue({ student });
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    render(<ClassroomAdmin students={[]}/>);
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มนักเรียน" }));
    fireEvent.change(screen.getByLabelText("ชื่อนักเรียน"), { target: { value: student.displayName } });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: student.username } });
    fireEvent.change(screen.getByLabelText("รหัสผ่านเริ่มต้น (12 ตัวขึ้นไป)"), { target: { value: "secret-initial-password" } });
    fireEvent.click(screen.getByRole("button", { name: "สร้างบัญชี" }));

    await waitFor(() => expect(actions.createClassroomStudent).toHaveBeenCalledWith({ username: "student01", password: "secret-initial-password", displayName: "นักเรียนใหม่" }));
    expect(await screen.findByRole("status")).toHaveTextContent("สร้างบัญชีนักเรียนแล้ว");
    expect(storageWrite).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("รหัสผ่านเริ่มต้น (12 ตัวขึ้นไป)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มนักเรียน" }));
    expect(screen.getByLabelText("รหัสผ่านเริ่มต้น (12 ตัวขึ้นไป)")).toHaveValue("");
  });

  it("does not optimistically unlock a live level when the server rejects it", async () => {
    actions.advanceClassroomStudent.mockResolvedValue({ error: "รายการยังไม่ครบ" });
    render(<ClassroomAdmin students={DEMO_STUDENTS}/>);
    fireEvent.click(screen.getByRole("button", { name: "ปลดล็อก Level 10" }));
    expect(await screen.findByRole("status")).toHaveTextContent("รายการยังไม่ครบ");
    expect(screen.getByText("เปิดถึง Level 9 / 31")).toBeInTheDocument();
    expect(actions.advanceClassroomStudent).toHaveBeenCalledWith("demo-student-001", "pre-posn");
  });
});
