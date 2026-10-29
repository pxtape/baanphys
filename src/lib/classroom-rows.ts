import {classroomClient} from "./classroom-browser";
/** Explicit stable pagination, including tables with composite primary keys. */
export async function classroomRows(table:string,order:string[],filter?:{column:string;value:string}){
 const rows=[]; // Dynamic table names are limited to the callers' classroom allowlists.
 for(let offset=0;;offset+=500){let q=classroomClient().from(table).select("*");if(filter)q=q.eq(filter.column,filter.value);for(const column of order)q=q.order(column);const r=await q.range(offset,offset+499);if(r.error)throw r.error;rows.push(...(r.data??[]));if((r.data??[]).length<500)break;}
 return rows;
}

