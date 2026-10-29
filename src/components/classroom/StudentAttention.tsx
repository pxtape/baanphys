"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import type {StudentRecord} from "@/lib/course-catalog";
import {loadPlanning,cycleMockCount,daysUntil,supportSlots} from "@/lib/student-planning";
import {bangkokDay} from "@/lib/study-tracking";
export function StudentAttention({students}:{students:StudentRecord[]}){
 const [rows,setRows]=useState<{id:string;name:string;text:string}[]>([]),[error,setError]=useState("");
 useEffect(()=>{let active=true;void loadPlanning().then(data=>{const today=bangkokDay(),result:{id:string;name:string;text:string}[]=[];for(const s of students){for(const e of s.enrollments){const p=data.plans.find(p=>p.user_id===s.id&&p.course_id===e.courseId);const messages:string[]=[];if(!p?.started_on||!p.paid_until)messages.push("ยังไม่กำหนดรอบเรียนครบ");else{const left=daysUntil(p.paid_until,today);if(left<=7)messages.push(left<0?`เกินกำหนดต่ออายุ ${-left} วัน`:`ต่ออายุอีก ${left} วัน`);const n=cycleMockCount(data.mocks.filter(m=>m.user_id===s.id&&m.course_id===e.courseId),p,data.legacy.filter(m=>m.user_id===s.id&&m.course_id===e.courseId));if(n!==null&&n<2)messages.push(`ยังนัด Mock ไม่ครบ (${n}/2)`);}if(messages.length)result.push({id:s.id,name:s.displayName,text:`${e.courseId} · ${messages.join(" · ")}`});}if(supportSlots({...data,support:data.support.filter(p=>p.user_id===s.id)},today,today).some(x=>!x.done))result.push({id:s.id,name:s.displayName,text:"มีนัด / รออัปเดตวันนี้"});}if(active){setRows(result);setError("");}}).catch(()=>{if(active)setError("โหลดรายการที่ต้องตามไม่ได้");});return()=>{active=false;};},[students]);
 return <details className="mt-4 rounded-xl border bg-white p-3"><summary className="cursor-pointer text-xs font-semibold">งานที่ควรเช็ก ({rows.length})</summary>{error?<p className="mt-2 text-xs">{error}</p>:rows.length?<div className="mt-2 max-h-60 space-y-2 overflow-y-auto">{rows.map((r,i)=><Link key={`${r.id}-${i}`} href={`/admin/students?student=${r.id}`} className="block rounded-lg bg-[#f5f7f2] p-3 text-xs"><b>{r.name}</b> · {r.text}</Link>)}</div>:<p className="mt-2 text-xs">ยังไม่พบรายการที่ต้องตามจากข้อมูลปัจจุบัน</p>}</details>;
}

