import {classroomClient} from "./classroom-browser";
import {questionTotal,type PracticeDay} from "./study-tracking";
export async function loadQuestionStats(userId:string,courseId:string,levelCount:number){
 const c=classroomClient();const [d,w,l]=await Promise.all([c.from("classroom_question_days").select("study_on,questions").eq("user_id",userId).eq("course_id",courseId).order("study_on"),c.from("classroom_course_workload").select("total_questions").eq("course_id",courseId).maybeSingle(),c.from("classroom_levels").select("question_count").eq("course_id",courseId)]);
 if(d.error||w.error||l.error)throw Error("โหลดจำนวนข้อไม่ได้");
 return {days:(d.data??[]) as PracticeDay[],total:courseId==="pre-posn"?677:w.data?.total_questions??questionTotal(l.data??[],levelCount)};
}
