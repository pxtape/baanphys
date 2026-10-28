import {createClient} from "npm:@supabase/supabase-js@2.58.0";
const origins=new Set(["https://pxtape.github.io","http://localhost:3000","http://127.0.0.1:3000"]);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");const headers={"Access-Control-Allow-Origin":origin&&origins.has(origin)?origin:"https://pxtape.github.io","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin","Cache-Control":"no-store","Content-Type":"application/json"};const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return json({error:"Origin not allowed"},403);if(req.method==="OPTIONS")return new Response("ok",{headers});if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{const authorization=req.headers.get("Authorization")??"";if(!authorization.startsWith("Bearer "))return json({error:"กรุณาเข้าสู่ระบบ"},401);
 const url=Deno.env.get("SUPABASE_URL")!;const caller=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data:{user},error}=await caller.auth.getUser(authorization.slice(7));if(error||!user||user.is_anonymous)return json({error:"กรุณาเข้าสู่ระบบใหม่"},401);
 const role=await caller.from("profiles").select("role").eq("id",user.id).maybeSingle();if(role.error||role.data?.role!=="admin")return json({error:"เฉพาะแอดมินเท่านั้น"},403);
 const text=await req.text();if(text.length>4096)return json({error:"ข้อมูลยาวเกินไป"},413);let body;try{body=JSON.parse(text);}catch{return json({error:"ข้อมูลไม่ถูกต้อง"},400);}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId??""))return json({error:"ไม่พบนักเรียน"},400);
 if(!["username","password"].includes(body.action))return json({error:"ไม่รองรับรายการนี้"},400);
 const value=typeof body.value==="string"?body.value:"";const username=value.trim().toLowerCase();
 if(body.action==="password"&&(value.length<12||value.length>128))return json({error:"รหัสใหม่ต้องมี 12–128 ตัวอักษร"},400);
 if(body.action==="username"&&(!/^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$/.test(username)||username.includes("..")||username==="admin"))return json({error:"ไอดีต้องมี 3–40 ตัวอักษร และห้ามใช้ admin"},400);
 const target=await caller.from("classroom_accounts").select("username").eq("user_id",body.userId).maybeSingle();if(target.error||!target.data)return json({error:"ไม่พบนักเรียน"},404);
 const admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 if(body.action==="password"){const r=await admin.auth.admin.updateUserById(body.userId,{password:value});if(r.error)return json({error:"เปลี่ยนรหัสผ่านไม่ได้"},400);return json({ok:true});}
 const lock=crypto.randomUUID();const locked=await admin.from("classroom_accounts").update({credential_lock:lock,credential_lock_until:new Date(Date.now()+300000).toISOString()}).eq("user_id",body.userId).or(`credential_lock_until.is.null,credential_lock_until.lt.${new Date().toISOString()}`).select("user_id").maybeSingle();
 if(locked.error||!locked.data)return json({error:"มีการแก้ไอดีอยู่ กรุณารอสักครู่แล้วลองใหม่"},409);
 try{
 const old=await admin.auth.admin.getUserById(body.userId);const oldEmail=old.data.user?.email;if(old.error||!oldEmail)return json({error:"ไม่พบบัญชีเข้าเรียน"},404);
 if(!oldEmail.endsWith("@classroom.invalid"))return json({error:"บัญชีอีเมลแอดมินเดิมยังคงใช้ไอดี admin หรืออีเมลเดิมได้ เปลี่ยนไอดีได้สำหรับบัญชีนักเรียน"},400);
 const changed=await admin.auth.admin.updateUserById(body.userId,{email:`${username}@classroom.invalid`,email_confirm:true});if(changed.error)return json({error:"ไอดีนี้อาจมีผู้ใช้งานแล้ว"},400);
 const updated=await admin.from("classroom_accounts").update({username}).eq("user_id",body.userId).eq("credential_lock",lock).select("user_id").maybeSingle();
 if(updated.error||!updated.data){const rollback=await admin.auth.admin.updateUserById(body.userId,{email:oldEmail,email_confirm:true});return json({error:rollback.error?"อัปเดตไอดีไม่ครบ กรุณาติดต่อผู้ดูแลระบบก่อนลองใหม่":"บันทึกไอดีไม่ได้ ไอดีเดิมยังใช้ได้ กรุณาลองใหม่"},500);}
 }finally{await admin.from("classroom_accounts").update({credential_lock:null,credential_lock_until:null}).eq("user_id",body.userId).eq("credential_lock",lock);}

 return json({ok:true,username});
 }catch{return json({error:"ระบบบัญชีขัดข้อง กรุณาลองใหม่"},500);}
});
