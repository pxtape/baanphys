import {describe,it,expect} from "vitest";
import {monday,occurrences,safeChannel,nextMeeting,type SupportPlan} from "./tutor-calendar";
import {addCalendarMonths,questionTotal} from "./study-tracking";
const plan:SupportPlan={id:"p",user_id:"u",course_id:"pre-posn",tutor_id:"t",mode:"discord",first_on:"2026-10-28",ends_on:null,meeting_time:"19:00:00",channel_url:"",active:true};
describe("weekly tutor calendar",()=>{
 it("anchors Monday through Sunday across month boundaries",()=>{expect(monday("2026-11-01")).toBe("2026-10-26");expect(monday("2026-11-02")).toBe("2026-11-02");});
 it("generates weekly one-hour calls in Thai time within plan dates",()=>{const slots=occurrences({...plan,ends_on:"2026-11-04"},"2026-10-01","2026-11-30");expect(slots.map(s=>s.day)).toEqual(["2026-10-28","2026-11-04"]);expect(slots[0].startsAt).toBe("2026-10-28T12:00:00.000Z");expect(slots[0].endsAt).toBe("2026-10-28T13:00:00.000Z");});
 it("keeps LINE and inactive plans off booked calendar slots",()=>{expect(occurrences({...plan,mode:"line"},"2026-10-28","2026-11-05")).toEqual([]);expect(occurrences({...plan,active:false},"2026-10-28","2026-11-05")).toEqual([]);});
 it("keeps an ongoing call and finds the next one after it ends",()=>{expect(nextMeeting(plan,new Date("2026-10-28T12:30:00Z"))?.day).toBe("2026-10-28");expect(nextMeeting(plan,new Date("2026-10-28T13:00:00Z"))?.day).toBe("2026-11-04");});
 it("restricts channel URLs to the selected provider",()=>{expect(safeChannel("https://line.me/test","line")).toBe("https://line.me/test");for(const u of ["javascript:alert(1)","https://line.me.evil.com/test","https://evil@line.me/test","http://line.me/test","https://discord.com/test"])expect(safeChannel(u,"line")).toBeNull();});
});
describe("monthly renewal and course totals",()=>{
 it("clamps to month end and restores the original billing day",()=>{expect(addCalendarMonths("2026-01-31")).toBe("2026-02-28");expect(addCalendarMonths("2026-02-28",1,31)).toBe("2026-03-31");expect(addCalendarMonths("2028-01-31")).toBe("2028-02-29");expect(addCalendarMonths("2026-12-15")).toBe("2027-01-15");});
 it("does not present partial totals as the full course",()=>{expect(questionTotal([{question_count:10},{question_count:20}],2)).toBe(30);expect(questionTotal([{question_count:10},{question_count:null}],2)).toBeNull();expect(questionTotal([{question_count:10}],2)).toBeNull();expect(questionTotal([{question_count:0}],1)).toBe(0);expect(questionTotal([],0)).toBeNull();});
});
