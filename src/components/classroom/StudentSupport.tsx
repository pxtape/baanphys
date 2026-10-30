"use client";
import {useCallback,useEffect,useState,useRef} from "react";
import Link from "next/link";
import {loadPlanning,upcoming,type Planning} from "@/lib/student-planning";
import {safeChannel} from "@/lib/tutor-calendar";
export function StudentSupport({userId,courseId}:{userId:string;courseId:string}){
 const [data,setData]=useState<Planning|null>(null),[error,setError]=useState(false);
 const request=useRef(0);
 const load=useCallback(async()=>{const ticket=++request.current;try{const result=await loadPlanning(userId);if(ticket!==request.current)return;setData({...result,plans:result.plans.filter(p=>p.course_id===courseId),support:result.support.filter(p=>p.course_id===courseId),mocks:result.mocks.filter(p=>p.course_id===courseId),legacy:result.legacy.filter(p=>p.course_id===courseId)});setError(false);}catch{if(ticket===request.current)setError(true);}},[userId,courseId]);
 useEffect(()=>{let active=true;setData(null);void load();const tick=()=>{if(active)void load();};const timer=setInterval(tick,60000);window.addEventListener("focus",tick);return()=>{active=false;request.current++;clearInterval(timer);window.removeEventListener("focus",tick);};},[load]);
 const notices=data?upcoming(data):[];const plan=data?.support.find(p=>p.active),url=plan?safeChannel(plan.channel_url,plan.mode):null;
 return <section aria-label="อีเวนท์ที่กำลังจะมาถึง" className="quiet-support mb-4 rounded-xl border border-[#dbe6d9] bg-[#f3f6ee] p-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">กำลังจะมาถึง</h2><Link href="/calendar" className="text-xs text-teal-800 underline">ปฏิทินของฉัน →</Link></div>{error?<p className="mt-2 text-xs">โหลดนัดไม่ได้ <button className="underline" onClick={()=>void load()}>ลองใหม่</button></p>:!data?<p className="mt-2 text-xs text-[var(--muted)]">กำลังโหลดนัดหมาย…</p>:<ul className="mt-2 grid gap-2 text-xs leading-6 md:grid-cols-2">{notices.length?notices.slice(0,6).map(n=><li key={n.id} className="rounded-lg bg-white/70 px-3 py-2">{n.text}</li>):<li>ยังไม่มีอีเวนท์ที่กำหนดไว้ ติวเตอร์จะเพิ่มนัดให้ในระบบ</li>}</ul>}{url&&<a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-teal-800 underline">เปิด {plan!.mode.toUpperCase()} ↗</a>}</section>;
}

