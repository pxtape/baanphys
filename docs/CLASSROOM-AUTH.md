# บัญชีเข้าเรียน

หน้า `/login` ใช้ Username และรหัสผ่านเป็นวิธีหลัก ไม่มีหน้าสมัครบัญชีเอง แอดมินสร้างบัญชีผ่าน `createClassroomStudent` ที่ `src/app/admin/students/actions.ts` เท่านั้น แล้วจึงมอบคอร์สให้บัญชีนั้นในหลังบ้าน

Username มี 3–40 ตัว ใช้ภาษาอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง เริ่มและจบด้วยตัวอักษรหรือตัวเลข ห้ามจุดติดกัน ระบบตัดช่องว่างต้นท้ายและแปลงเป็นตัวพิมพ์เล็กเสมอ ภายใน Supabase Auth ใช้อีเมลรูปแบบ `username@classroom.invalid` เป็นตัวระบุบัญชี ไม่ใช่อีเมลสำหรับรับจดหมาย นักเรียนไม่ต้องมีอีเมล และไม่ควรส่ง magic link ไปที่ที่อยู่นี้

รหัสผ่านตั้งต้นยาว 12–128 ตัวอักษร รหัสผ่านส่งจากฟอร์มให้ Supabase Auth ผ่าน Server Action ไม่มีการเก็บรหัสผ่านเป็นข้อความในตารางเว็บหรือ log และ action ไม่คืนรหัสผ่านกลับมา UI ควรล้างช่องรหัสผ่านหลังสร้างบัญชีสำเร็จและไม่บันทึกไว้ใน localStorage

## ตั้งค่าบนเซิร์ฟเวอร์ก่อนใช้งานจริง

1. กำหนด `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` และ `SUPABASE_SERVICE_ROLE_KEY` ในสภาพแวดล้อมของเซิร์ฟเวอร์ ตัวอย่างชื่ออยู่ใน `.env.example` ห้ามเติม `NEXT_PUBLIC_` ให้ service-role key และห้าม commit `.env.local`
2. ติดตั้ง schema ของห้องเรียนตามเอกสาร backend เพื่อให้มี `profiles.username` ซึ่งฐานข้อมูลคำนวณจากอีเมลบัญชีภายใน บัญชีใหม่มี role `student` ตามค่าเริ่มต้นของฐานข้อมูล
3. ปิดการสมัครผู้ใช้ใหม่ใน Supabase Authentication Settings เพื่อให้การเรียก API สมัครจากภายนอกสร้างบัญชีเองไม่ได้ การสร้างโดย Admin API ยังใช้ได้ ตรวจบัญชีแอดมินเดิมและกำหนด role ด้วยช่องทางผู้ดูแลฐานข้อมูลที่เชื่อถือได้
4. ใช้ HTTPS เมื่อเปิดใช้งานจริง และตรวจว่า Supabase Auth มี rate limit เหมาะสม

Server Action ตรวจผู้เรียกด้วย `auth.getUser()` และอ่าน `profiles.role` ของผู้เรียกด้วย session ปกติ ต้องมีค่า `admin` ก่อนจึงสร้าง privileged client ด้วย service-role key บัญชี teacher สร้างนักเรียนไม่ได้ และไม่ใช้ `user_metadata` ในการอนุญาตสิทธิ์

### ตั้งแอดมินคนแรก

หลังติดตั้ง `supabase/setup/classroom.sql` ให้สร้างบัญชีเจ้าของผ่าน Supabase Authentication ก่อน แล้วใช้ SQL Editor ของโปรเจกต์ โดยแทนอีเมลตัวอย่างด้วยอีเมลบัญชีเจ้าของจริง:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and lower(u.email) = lower('owner@example.com');
```

SQL นี้รันผ่านบัญชีฐานข้อมูลที่เชื่อถือได้เท่านั้น trigger ที่ติดตั้งพร้อม classroom schema อนุญาตการเปลี่ยน role ให้ `postgres`, `service_role` และ `supabase_admin` ไม่อนุญาตให้นักเรียนเลื่อนสิทธิ์ตัวเองผ่าน API หลังตั้ง role แล้วล็อกอินใหม่และเปิด `/admin`

เมนู “บัญชีอีเมลเดิม” เก็บไว้สำหรับบัญชีจากระบบเดิม ส่ง magic link ด้วย `shouldCreateUser: false` จึงไม่สร้างบัญชีใหม่ผ่านฟอร์มนี้ ตัวเลือกนี้ไม่ได้ให้สิทธิ์คอร์สโดยอัตโนมัติ

การรีเซ็ตรหัสผ่านผ่านหน้าหลังบ้านยังไม่อยู่ในโครงร่างนี้ หากลืมรหัสผ่านให้ผู้ดูแลเปลี่ยนผ่านช่องทาง Admin ของ Supabase ก่อน นักเรียนที่ใช้บัญชีภายในไม่มีอีเมลรับ password-reset

## การตรวจสอบ

มี unit tests สำหรับการแปลงและปฏิเสธ Username, การส่งข้อมูล username/password ไป Auth, magic link ของบัญชีเดิม, network failure และการกันผู้ไม่ได้เป็น admin ออกจากการสร้างบัญชีจริง การทดสอบนี้ mock บริการ Auth และไม่ได้สร้างบัญชีหรือเปลี่ยนข้อมูลบน Supabase จริง ต้องทดสอบบัญชีจริงบนระบบ staging หลังติดตั้ง schema และตั้งค่าทั้งหมดแล้ว

อ้างอิง: [Supabase signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [Supabase Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
