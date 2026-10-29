import {describe,it,expect} from "vitest";
import {safeReturnPath} from "./classroom-navigation";
import {nextMockNumber,supportSlots,upcoming,emptyPlanning,type MockTest} from "./student-planning";
import type {SupportPlan} from "./tutor-calendar";
const mock=(n:number,status:MockTest["status"]="planned"):MockTest=>({id:String(n),user_id:"u",course_id:"pre-posn",tutor_id:"t",name:`Mock test ครั้งที่ ${n}`,starts_on:"2026-10-29",ends_on:"2026-11-04",through_level:8,status,score:null,max_score:null,completed_on:null,note:""});
const p:SupportPlan={id:"p",user_id:"u",course_id:"pre-posn",tutor_id:"t",mode:"line",first_on:"2026-10-28",ends_on:null,meeting_time:null,channel_url:"",active:true};
describe("audit regressions",()=>{
 it("never reuses the surviving Mock number after an earlier cancellation",()=>{expect(nextMockNumber([mock(1,"cancelled"),mock(2)])).toBe(3);expect(nextMockNumber([mock(1,"cancelled")])).toBe(1);});
 it("allows only classroom paths as login return destinations",()=>{expect(safeReturnPath("/courses?course=pre-posn&level=8")).toBeTruthy();expect(safeReturnPath("https://evil.test")).toBeNull();expect(safeReturnPath("//evil.test")).toBeNull();expect(safeReturnPath("/admin/content/../anything")).toBeNull();});
 it("moves only one occurrence and includes it even when moved into another calendar month",()=>{const data={...emptyPlanning,support:[p],exceptions:[{plan_id:"p",occurrence_on:"2026-10-28",rescheduled_on:"2026-11-01",meeting_time:null}]};const oct=supportSlots(data,"2026-10-28","2026-10-31");expect(oct).toHaveLength(0);const nov=supportSlots(data,"2026-11-01","2026-11-04");expect(nov.map(s=>s.day)).toEqual(["2026-11-01","2026-11-04"]);expect(nov[0].origin).toBe("2026-10-28");});
 it("stops reminding about a completed LINE update and keeps next week's reminder",()=>{const data={...emptyPlanning,support:[p],updates:[{plan_id:"p",occurrence_on:"2026-10-26",status:"done" as const,note:""}]};expect(upcoming(data,"2026-10-28")[0]?.day).toBe("2026-11-04");});
});

