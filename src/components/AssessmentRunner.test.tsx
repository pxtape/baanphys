import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssessmentRunner } from "@/components/AssessmentRunner";

describe("AssessmentRunner", () => {
  it("runs a sample assessment and clearly says its result is not saved", async () => {
    render(<AssessmentRunner
      type="diagnostic"
      title="แบบทดสอบตัวอย่าง"
      subtitle="สำรวจความเข้าใจ"
      durationSeconds={300}
      questions={[{ id: "one", branch: "mechanics", prompt: "แรงลัพธ์เป็นศูนย์เมื่อใด?", options: ["เมื่อความเร็วคงตัว", "เมื่อวัตถุหนัก"], correctIndex: 0, explanation: "ความเร็วคงตัวแปลว่าความเร่งเป็นศูนย์" }]}
    />);

    fireEvent.click(await screen.findByRole("button", { name: /เริ่มทำแบบทดสอบ/ }));
    fireEvent.click(screen.getByRole("radio", { name: "เมื่อความเร็วคงตัว" }));
    fireEvent.click(screen.getByRole("button", { name: /ส่งคำตอบ/ }));

    expect(await screen.findByText(/ผลนี้ไม่ถูกบันทึกในบัญชี/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/ความเร็วคงตัวแปลว่าความเร่งเป็นศูนย์/)).toBeInTheDocument();
  });
});
