import {addDays,bangkokDay} from "./study-tracking";
export type SupportPlan={id:string;user_id:string;course_id:string;tutor_id:string;mode:"line"|"discord";first_on:string|null;ends_on:string|null;meeting_time:string|null;channel_url:string;active:boolean};
export type SupportUpdate={plan_id:string;occurrence_on:string;status:"done"|"missed"|"cancelled";note:string};
export type TutorEvent={id:string;user_id:string;course_id:string;tutor_id:string;starts_at:string;ends_at:string;through_level:number;status:"planned"|"done"|"cancelled";note:string};
export function monday(day:string){return addDays(day,-((weekday(day)+6)%7));}
export function weekday(day:string){return new Date(`${day}T12:00:00Z`).getUTCDay();}
export function occurrences(plan:SupportPlan,from:string,until:string){
 if(!plan.active||plan.mode!=="discord"||!plan.first_on||!plan.meeting_time)return [];
 const result:{day:string;startsAt:string;endsAt:string}[]=[];
 for(let day=from;day<=until;day=addDays(day,1))if(day>=plan.first_on&&(!plan.ends_on||day<=plan.ends_on)&&weekday(day)===weekday(plan.first_on)){
 const starts=new Date(`${day}T${plan.meeting_time.slice(0,5)}:00+07:00`);result.push({day,startsAt:starts.toISOString(),endsAt:new Date(starts.getTime()+3600000).toISOString()});}
 return result;
}
export function safeChannel(url:string,mode?:"line"|"discord"){try{const u=new URL(url);const hosts=mode==="line"?["line.me","lin.ee"]:mode==="discord"?["discord.gg","discord.com"]:["line.me","lin.ee","discord.gg","discord.com"];return u.protocol==="https:"&&!u.username&&!u.password&&hosts.includes(u.hostname)?u.href:null;}catch{return null;}}
export function dateThai(day:string){return new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",timeZone:"Asia/Bangkok"}).format(new Date(`${day}T12:00:00+07:00`));}
export function timeThai(at:string){return new Intl.DateTimeFormat("th-TH",{hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"Asia/Bangkok"}).format(new Date(at));}
export function nextMeeting(plan:SupportPlan,now=new Date()){const from=bangkokDay(now);return occurrences(plan,from,addDays(from,7)).find(o=>new Date(o.endsAt)>now)??null;}
