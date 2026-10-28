import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,it,expect} from "vitest";
import {StudyDashboard} from "./StudyDashboard";
afterEach(cleanup);
describe("checklist dashboard",()=>{it("uses 677 as Pre-POSN total and removes daily entry",async()=>{render(<StudyDashboard demo userId="demo" courseId="pre-posn" courseTitle="Pre-POSN" passedLevels={3} levelCount={31}/>);expect(await screen.findByRole("img",{name:"ความคืบหน้าตามจำนวนข้อ 7%"})).toBeInTheDocument();expect(screen.getByText(/50 \/ 677 ข้อ/)).toBeInTheDocument();expect(screen.queryByLabelText("รวมข้อของวันนี้")).not.toBeInTheDocument();fireEvent.click(screen.getByText("ตั้งเป้ารายสัปดาห์"));fireEvent.change(screen.getByLabelText("เป้าหมายของฉัน (ข้อ / สัปดาห์)"),{target:{value:"40"}});fireEvent.click(screen.getByRole("button",{name:"บันทึกเป้าหมาย"}));expect(await screen.findByRole("img",{name:"เป้าหมายสัปดาห์นี้ 20%"})).toBeInTheDocument();});});
