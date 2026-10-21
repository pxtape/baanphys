import { describe, expect, it } from "vitest";
import { classroomEmail, normalizeClassroomUsername } from "@/lib/classroom-auth";

describe("classroom account identifiers", () => {
  it("normalizes usernames consistently before login and account creation", () => {
    expect(normalizeClassroomUsername(" STUDENT_01 ")).toBe("student_01");
    expect(classroomEmail(" STUDENT_01 ")).toBe("student_01@classroom.invalid");
  });

  it.each(["ab", "a".repeat(41), ".student", "student.", "student..01", "student@example.com", "นักเรียน", "name with spaces"])("rejects invalid username %s", (value) => {
    expect(normalizeClassroomUsername(value)).toBeNull();
    expect(classroomEmail(value)).toBeNull();
  });
});
