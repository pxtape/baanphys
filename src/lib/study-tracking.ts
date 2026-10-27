export type PracticeDay = { study_on: string; questions: number };
export const DAY_MS = 86400000;
export function bangkokDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const value = (kind: string) => parts.find(p=>p.type===kind)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function dayStart(day: string) { return Date.parse(`${day}T00:00:00+07:00`); }
export function addDays(day: string, days: number) { return new Date(Date.parse(`${day}T12:00:00Z`)+days*DAY_MS).toISOString().slice(0,10); }
export function addCalendarMonths(day: string, months = 1, anchorDay = Number(day.slice(8,10))) {
 const date = new Date(`${day.slice(0,7)}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth()+months);
 const last = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
 date.setUTCDate(Math.min(anchorDay,last));return date.toISOString().slice(0,10);
}
export function questionTotal(rows: {question_count:number|null}[], expected: number) {
 return expected>0 && rows.length===expected && rows.every(r=>r.question_count!==null && Number.isInteger(r.question_count) && r.question_count>=0) ? rows.reduce((sum,r)=>sum+r.question_count!,0) : null;
}
export function percent(value: number, total: number) { return total>0 ? Math.min(100,Math.max(0,Math.round(value/total*100))) : 0; }
export function studySummary(start: string|null, paidUntil: string|null, goal: number|null, total: number|null, days: PracticeDay[], now=new Date()) {
 const today=bangkokDay(now), started=Boolean(start && dayStart(start)<=now.getTime());
 const elapsed=start ? Math.max(0,(now.getTime()-dayStart(start))/DAY_MS) : 0;
 const weekIndex=Math.floor(elapsed/7), weekStart=start ? addDays(start,weekIndex*7) : null;
 const weekEnd=weekStart ? addDays(weekStart,7) : null;
 const valid=days.filter(d=>d.study_on<=today && (!start || d.study_on>=start));
 const completed=valid.reduce((sum,d)=>sum+d.questions,0);
 const weekly=started && weekStart && weekEnd ? valid.filter(d=>d.study_on>=weekStart && d.study_on<weekEnd).reduce((sum,d)=>sum+d.questions,0) : 0;
 const due=paidUntil ?? (start ? addCalendarMonths(start) : null);
 const remaining=total===null ? null : Math.max(0,total-completed);
 const estimatedDays=goal && remaining!==null ? Math.ceil(remaining/goal*7) : null;
 const history=started && start ? Array.from({length:Math.min(weekIndex+1,8)},(_,i)=>{
   const index=weekIndex-Math.min(weekIndex,7)+i, from=addDays(start,index*7), until=addDays(from,7);
   return {number:index+1,from,until,questions:valid.filter(d=>d.study_on>=from && d.study_on<until).reduce((sum,d)=>sum+d.questions,0)};
 }) : [];
 return {today,started,elapsedDays:Math.floor(elapsed),weekNumber:started?weekIndex+1:0,weekStart,weekEnd,weekly,completed,coursePercent:total ? percent(completed,total):null,goalPercent:goal?percent(weekly,goal):0,weekTimePercent:started?Math.min(100,Math.floor((elapsed-weekIndex*7)/7*100)):0,due,daysToDue:due?Math.ceil((dayStart(due)-now.getTime())/DAY_MS):null,remaining,estimatedDays,estimatedFinish:estimatedDays!==null?addDays(start && start>today ? start : today,estimatedDays):null,history};
}
