import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,it,expect} from "vitest";
import {StudyDashboard} from "./StudyDashboard";
afterEach(cleanup);
describe("study dashboard",()=>{
 it("saves daily totals without counting the same date twice and recalculates goals",async()=>{
 render(<StudyDashboard demo userId="demo" courseId="pre-posn" courseTitle="Pre-POSN" passedLevels={3} levelCount={31}/>);
 await screen.findByRole("img",{name:"ความคืบหน้าตามจำนวนข้อ 25%"});
 fireEvent.change(screen.getByLabelText("รวมข้อของวันนี้"),{target:{value:"12"}});
 fireEvent.click(screen.getByRole("button",{name:"บันทึกจำนวนข้อ"}));
 expect(await screen.findByRole("img",{name:"ความคืบหน้าตามจำนวนข้อ 31%"})).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"บันทึกจำนวนข้อ"}));
 expect(screen.getByRole("img",{name:"ความคืบหน้าตามจำนวนข้อ 31%"})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText("เป้าหมายของฉัน (ข้อ / สัปดาห์)"),{target:{value:"40"}});
 fireEvent.click(screen.getByRole("button",{name:"บันทึกเป้าหมาย"}));
 expect(await screen.findByRole("img",{name:"เป้าหมายสัปดาห์นี้ 50%"})).toBeInTheDocument();
 });
});
