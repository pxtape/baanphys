import {render,screen,cleanup} from "@testing-library/react";
import {describe,it,expect,vi,afterEach} from "vitest";
import {TutorCalendar} from "./TutorCalendar";
import {COURSES} from "@/lib/course-catalog";
import {bangkokDay} from "@/lib/study-tracking";
vi.mock("@/lib/student-planning",async()=>{const actual=await vi.importActual<typeof import("@/lib/student-planning")>("@/lib/student-planning");return {...actual,loadPlanning:vi.fn(async()=>({...actual.emptyPlanning,plans:[{user_id:"student",course_id:"pre-posn",started_on:bangkokDay(),last_renewed_on:null,paid_until:null}]}))};});
afterEach(cleanup);
describe("tutor calendar overview",()=>{
 it("links each student's event to that student's central page",async()=>{render(<TutorCalendar tutorId="tutor" students={[{id:"student",username:"test",displayName:"Test Student",enrollments:[]}]} courses={COURSES}/>);const links=await screen.findAllByRole("link",{name:/Test Student/});expect(links[0]).toHaveAttribute("href","/admin/students?student=student");});
 it("has no duplicate student scheduling form",async()=>{render(<TutorCalendar tutorId="tutor" students={[]} courses={COURSES}/>);await screen.findByRole("heading",{name:"ตารางงานและนัดหมายทั้งเดือน"});expect(screen.queryByRole("button",{name:"เพิ่มนัดสอบ"})).not.toBeInTheDocument();expect(screen.getByRole("link",{name:/จัดการข้อมูลและนัด/})).toHaveAttribute("href","/admin/students");});
});
