import type {CourseLevel,LearningItem} from "./course-catalog";
export function learningHistory(levels:CourseLevel[],items:LearningItem[],completedIds:string[],counts:Record<string,number>){
 const completed=new Set(completedIds);
 return levels.map(level=>{const tasks=items.filter(i=>i.levelNumber===level.number);const documents=tasks.filter(i=>i.kind!=="video");const known=documents.filter(i=>i.questionCount!=null);return {level,tasks,completedTasks:tasks.filter(i=>completed.has(i.id)).length,finished:tasks.length>0&&tasks.every(i=>completed.has(i.id)),questions:known.reduce((sum,i)=>sum+Math.min(i.questionCount!,counts[i.id]??0),0),questionTotal:documents.length>0&&documents.every(i=>i.questionCount!=null)?documents.reduce((sum,i)=>sum+i.questionCount!,0):null};});
}
