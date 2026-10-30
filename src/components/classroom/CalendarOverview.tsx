"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import type {StudentRecord} from "@/lib/course-catalog";
import {loadPlanning,emptyPlanning,calendarEntries,type Planning} from "@/lib/student-planning";
import {addDays,bangkokDay} from "@/lib/study-tracking";
import {monday} from "@/lib/tutor-calendar";
import {MonthCalendar} from "./MonthCalendar";
export function CalendarOverview({userId,admin=false,students=[]}:{userId:string;admin?:boolean;students?:StudentRecord[]}){
 const [data,setData]=useState<Planning>(emptyPlanning),[loading,setLoading]=useState(true),[error,setError]=useState(""),[range,setRange]=useState({from:monday(bangkokDay().slice(0,7)+"-01"),until:addDays(monday(bangkokDay().slice(0,7)+"-01"),41)});
 const load=useCallback(async()=>{setLoading(true);setError("");try{const result=await loadPlanning(admin?undefined:userId);setData(admin?{...result,support:result.support.filter(p=>p.tutor_id===userId),mocks:result.mocks.filter(m=>m.tutor_id===userId),legacy:result.legacy.filter(m=>m.tutor_id===userId)}:result);}catch{setError("โหลดปฏิทินไม่ได้ กรุณาลองใหม่");}finally{setLoading(false);}},[userId,admin]);
 useEffect(()=>{void load();},[load]);
 return <main className="bp-calendar mx-auto max-w-[1500px] p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">{admin?"ปฏิทินติวเตอร์":"ปฏิทินของฉัน"}</h1><p className="mt-2 text-xs text-[var(--muted)]">{admin?"ดูงานทั้งเดือน กดชื่อนักเรียนในรายการเพื่อเปิดข้อมูลและแก้นัดที่หน้านักเรียน":"วันเริ่มคอร์ส นัดคุย ช่วงสอบ และช่วงชำระต่ออายุของคุณ"}</p></div><div className="flex gap-4 text-xs">{admin&&<Link href="/admin/students" className="underline">จัดการข้อมูลและนัดของนักเรียน →</Link>}<button className="underline" onClick={()=>void load()}>โหลดใหม่</button></div></div>{loading?<p className="p-5 text-sm">กำลังโหลดปฏิทิน…</p>:error?<p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">{error}</p>:<MonthCalendar admin={admin} title={admin?"ตารางงานและนัดหมายทั้งเดือน":"ตารางเรียนและนัดหมายทั้งเดือน"} entries={calendarEntries(data,range.from,range.until,admin?id=>students.find(s=>s.id===id)?.displayName??"นักเรียน":undefined)} onMonthChange={(from,until)=>setRange({from,until})}/>}</main>;
}

