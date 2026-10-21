# บ้านฟิสิกส์ by P'Tape

แพลตฟอร์มเรียนฟิสิกส์โอลิมปิกสำหรับนักเรียนไทย ใช้ Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL, KaTeX และ React Flow

## เปิดเว็บในเครื่อง

ต้องติดตั้ง Node.js 22 ขึ้นไปก่อน จาก PowerShell เปิดโฟลเดอร์โปรเจกต์แล้วใช้ `npm.cmd` (บน Windows เครื่องที่บล็อก PowerShell scripts อาจเรียก `npm` ตรง ๆ ไม่ได้):

```powershell
cd "C:\Users\sippa\OneDrive\Desktop\Physics Web"
npm.cmd install
npm.cmd run dev
```

เปิด <http://localhost:3000> ในเบราว์เซอร์ และปล่อย PowerShell ทำงานไว้ระหว่างใช้เว็บ กด `Ctrl+C` ในหน้าต่างนั้นเพื่อหยุด server

## Supabase Auth และฐานข้อมูล

1. สร้างไฟล์ `.env.local` จาก `.env.example` และตั้ง `NEXT_PUBLIC_SUPABASE_URL` กับ `NEXT_PUBLIC_SUPABASE_ANON_KEY` จาก Project Settings ของ Supabase ค่านี้ใช้ฝั่งเว็บได้ ห้ามใส่ `service_role` key ในตัวแปร `NEXT_PUBLIC_` หรือส่ง key/รหัสผ่านในแชต
2. รัน migration ใน Supabase SQL Editor ตามลำดับไฟล์ใน `supabase/migrations/` สำหรับฐานข้อมูลที่ติดตั้งถึง Milestone 1.5 แล้ว ให้รัน `202610160001_skill_tree_builder.sql`, `202610160002_student_learning_goals.sql` และ `202610160003_skill_learning_content.sql` เพื่อเพิ่มแผนที่ เป้าหมาย และเนื้อหาพร้อมความคืบหน้า
3. ใน Supabase Authentication → URL Configuration เพิ่ม Redirect URL `http://localhost:3000/auth/callback` และตรวจ Site URL ให้ตรงกับเว็บที่ใช้
4. ปิดและเริ่ม dev server ใหม่หลังแก้ `.env.local` ด้วย `npm.cmd run dev`

### เข้าสู่ระบบด้วย Magic Link

หน้าเข้าสู่ระบบส่งลิงก์ทางอีเมลด้วย Supabase Auth ไม่ต้องตั้งเทมเพลต OTP หรือกรอกรหัส API เพิ่มเติม ตั้งค่า Redirect URL เป็น `http://localhost:3000/auth/callback` ใน Supabase Authentication → URL Configuration และใช้เทมเพลต Magic Link มาตรฐานที่มี `{{ .ConfirmationURL }}` หากพบ `email rate limit exceeded` อย่ากดส่งซ้ำ ให้รอให้ข้อจำกัดของ Supabase ผ่านก่อน แล้วขอลิงก์ใหม่หนึ่งครั้ง ลิงก์ใช้ได้ครั้งเดียวและอาจหมดอายุหากระบบความปลอดภัยของอีเมลเปิดลิงก์ไว้ล่วงหน้า

เมื่อยังไม่ได้ตั้งค่า Supabase หน้าแดชบอร์ด Skill Tree และแบบประเมินจะระบุว่าเป็นโหมดตัวอย่าง และไม่บันทึกผล เมื่อเชื่อม Supabase แล้ว ผู้เรียนต้องเข้าสู่ระบบก่อนเริ่มแบบประเมิน ผลจะถูกบันทึกใน `assessment_attempts` ด้วยนโยบาย RLS สำหรับเจ้าของข้อมูลเท่านั้น

### Milestone 2.1: Skill Tree Builder

Migration `202610160001_skill_tree_builder.sql` เพิ่มแผนที่หลักสูตรและ prerequisite แบบแยกเส้นเชื่อม ครู/แอดมินสร้างหลายแผนที่ ลากจัดโหนด เชื่อม prerequisite หลายข้อ และเผยแพร่ให้ผู้เรียนดูได้ การบันทึกใช้ RPC ที่ตรวจ role, เจ้าของแผนที่, จำกัดจำนวนข้อมูล และป้องกัน prerequisite เป็นวงจร ระบบเก็บประวัติ progress ไว้เมื่อครูนำโหนดออกจากแผนที่ Migration `202610160002_student_learning_goals.sql` เพิ่มเป้าหมายส่วนตัวของนักเรียน แผนที่สาธารณะยังเปิดให้ดูได้ทุกคน ส่วน `202610160003_skill_learning_content.sql` เพิ่มลิงก์ชีท Google Drive, วิดีโอ YouTube, HW และ progress รายการที่อ่านได้เฉพาะผู้เข้าสู่ระบบ

ลิงก์ YouTube/Drive เก็บเป็น URL ภายนอก เว็บซ่อน URL จากผู้ที่ไม่ได้เข้าสู่ระบบ แต่ไม่ได้ควบคุมสิทธิ์ของ Google: YouTube Private ต้องเชิญบัญชีนักเรียน, YouTube Unlisted ใครมีลิงก์ก็ส่งต่อได้, และ Drive แบบ Restricted ต้องแชร์ให้บัญชีนักเรียนหรือ Google Group เอง การแชร์ให้กลุ่ม Google ช่วยดูแลง่ายขึ้น แต่ผู้เรียนยังต้องเปิดบัญชี Google ที่ได้รับสิทธิ์

### Milestone 2.2–2.3: เนื้อหาการเรียนและตรวจการบ้าน

ครู/แอดมินที่ดูแลแผนที่เปิดหน้าทักษะแล้วเพิ่มชีท, วิดีโอ, HW ได้ แต่ละรายการมีน้ำหนักและลำดับ ความคืบหน้าของทักษะแสดงจากสัดส่วนรายการที่เรียนจบ ส่วน HW จะนับเมื่อครูตรวจว่า “ผ่าน” เท่านั้น นักเรียนที่เข้าสู่ระบบส่งรูป/PDF ได้สูงสุด 8 ไฟล์, 10 MB ต่อไฟล์ และ 25 MB รวมต่อครั้ง ไฟล์เก็บใน private Supabase Storage ครูตรวจผ่านเมนู “ตรวจการบ้าน” ได้ ให้คะแนน 4 ด้าน ด้านละ 0–5 พร้อม Feedback และตัดสินผ่าน/ให้แก้ไข

ก่อนใช้งานจริง ให้รัน migration `202610160003_skill_learning_content.sql` ใน Supabase SQL Editor หลัง migration 001 และ 002 และตรวจว่า project เปิดใช้ Storage ได้ ครูต้องมี role teacher/admin และเป็นเจ้าของแผนที่ (ยกเว้น admin) ใน Supabase Auth ต้องกำหนดบัญชีครูด้วย SQL ที่เอกสารส่วนก่อนหน้าอธิบาย การตรวจและการอัปเดต progress ทำใน database transaction เดียว ส่วนการอัปโหลดผ่าน browser โดยตรง

ข้อจำกัดปัจจุบัน: ยังไม่มีการกำหนดโควตาตามแพ็กเกจ, การมอบหมายงานให้ tutor หลายคน, ไฟล์เฉลย/ไฟล์ annotation, การแจ้งเตือน, หรือ LMS สำหรับวิดีโอ ผู้เรียนส่งใหม่ได้หลังครูตรวจรอบก่อนแล้ว แต่ระบบนี้ยังไม่มีตัวจำกัดจำนวนครั้งตามสมาชิก และลิงก์ Google/YouTube ต้องจัดสิทธิ์แยกในบริการนั้น

หลังผู้ใช้ล็อกอินครั้งแรก ให้เจ้าของโปรเจกต์กำหนดบัญชีครู/แอดมินผ่าน Supabase SQL Editor เท่านั้น (แทนอีเมลตัวอย่างด้วยอีเมลในบัญชีของคุณ โดยไม่ส่งให้ผู้อื่น):

```sql
update public.profiles p
set role = 'teacher'
from auth.users u
where p.id = u.id and lower(u.email) = lower('your-teacher@example.com');
```

จากนั้นเปิด `/teacher/skill-trees` เพื่อสร้างแผนที่ โดยลากจากจุดเชื่อมขวาของ prerequisite ไปยังจุดเชื่อมซ้ายของทักษะถัดไป แล้วเลือกเผยแพร่ ผู้เรียนเปิด `/skill-tree` เพื่อดูแผนที่ค่ายสาธารณะ คลิกโหนดเพื่อดูรายละเอียด และดับเบิลคลิกเพื่อเปิดหน้าทักษะ

ระบบ Question Bank แบบเดิมถูกถอดออกจากเว็บไซต์เพื่อโฟกัสเส้นทาง Skill Tree หากฐานข้อมูลเดิมเคยติดตั้งตารางโจทย์ ตารางเหล่านั้นยังคงอยู่และไม่ได้ถูกลบ

ระดับ Pre-Camp 1, Camp 1, Camp 2 และ Olympiad เป็นเกณฑ์ภายในเพื่อแนะนำการเรียน ไม่ได้แสดงว่าเป็นคุณวุฒิหรือผลคัดเลือก POSN แพ็กเกจสมาชิกแสดงข้อมูลเท่านั้น ยังไม่มีระบบชำระเงินจริง

## คำสั่งตรวจสอบ

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## ฟีเจอร์

- Landing ภาษาไทยพร้อมแบบแผนภาพฟิสิกส์และ CTA ทำแบบทดสอบวัดระดับ
- Dashboard เชื่อมเป้าหมายที่นักเรียนเลือกกับความคืบหน้าทักษะในแผนที่ของระดับนั้น
- แผนที่ Skill Tree ที่เผยแพร่ดูได้ทุกคน นักเรียนเลือกโฟกัสเป้าหมายได้ (ต้องรัน migration `202610160001_skill_tree_builder.sql` ถึง `202610160003_skill_learning_content.sql`)
- ครูเพิ่มลิงก์ชีท/วิดีโอ/HW พร้อมน้ำหนักรายทักษะได้ ความคืบหน้าใช้รายการที่เรียนจบจริงและน้ำหนักที่ครูกำหนด
- แบบทดสอบวัดระดับและ Mock Exam จับเวลา พร้อมคำอธิบายคำตอบ
- โครงสร้างสมาชิก Explorer, Challenger, Academy และ Mentorship โดยไม่มี checkout
- Supabase magic-link sign-in, sign-out, roles และ RLS ที่เตรียมไว้
