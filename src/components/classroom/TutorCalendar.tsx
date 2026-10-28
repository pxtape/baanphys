"use client";
import type {CourseDefinition,StudentRecord} from "@/lib/course-catalog";
import {CalendarOverview} from "./CalendarOverview";
export function TutorCalendar({tutorId,students}:{tutorId:string;students:StudentRecord[];courses:CourseDefinition[]}){return <CalendarOverview userId={tutorId} admin students={students}/>;}
