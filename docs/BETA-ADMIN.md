# หลังบ้านเวอร์ชันทดลอง

เว็บ: https://pxtape.github.io/baanphys/

1. เข้าสู่ระบบที่ `/login/` ด้วยอีเมลและรหัสผ่านบัญชีแอดมินเดิม บัญชีใหม่ของนักเรียนใช้ Username กับรหัสผ่านที่ติวเตอร์ออกให้
2. เปิดเมนู **นักเรียน** → **เพิ่มนักเรียน** กรอกชื่อ Username และรหัสผ่าน 12–128 ตัว แล้วกดสร้างบัญชี รหัสผ่านไม่เก็บเป็นข้อความในตารางและไม่บันทึกใน browser storage
3. เลือกนักเรียนที่สร้าง แล้วกด **เปิดสิทธิ์คอร์ส** เริ่มที่ Level 1
4. เปิดเมนู **ชีท / วิดีโอ / HW** เลือกคอร์สกับเลเวล ตั้งชื่อบท และเพิ่มรายการพร้อมลิงก์ Google Drive เวลาเรียน/เวลาที่แนะนำกรอกเป็นนาที เว้นไว้ได้
5. กลับมาแก้รายการเดิมได้ด้วยปุ่ม **แก้ไข** คอร์สที่ยังไม่มีเลเวลให้ระบุจำนวนเลเวลก่อน
6. เมื่อผู้เรียนติ๊กรายการครบและคุยกับติวเตอร์แล้ว แอดมินกดปลดล็อกเลเวลถัดไปในหน้านักเรียนเอง ระบบไม่เปิดเลเวลอัตโนมัติ

รองรับลิงก์ไฟล์ `drive.google.com/file/d/...`, `drive.google.com/open?id=...` และไฟล์ Google Docs ที่มี `/d/...` ไม่รับลิงก์โฟลเดอร์ ตั้งสิทธิ์ Google Drive แยกให้ผู้เรียนด้วย การเปิดสิทธิ์คอร์สไม่เปลี่ยนสิทธิ์ไฟล์ Google

ห้องเรียนจริงอยู่ `/courses/` หลังบ้านอยู่ `/admin/students/` และ `/admin/content/` ส่วน `/preview/*` ยังเป็นข้อมูลจำลองเท่านั้น

## สถาปัตยกรรม

GitHub Pages ส่งหน้าเว็บ static และใช้ Supabase Auth / RLS สำหรับข้อมูลจริง ฟังก์ชัน `classroom-admin` ตรวจ access token ด้วย Auth และอ่าน role จาก `profiles` ก่อนสร้างบัญชีผ่าน service role ที่อยู่บน Supabase เท่านั้น โค้ดในเว็บมีเพียง publishable key

ฐานข้อมูล beta ใช้ตารางใหม่ `classroom_accounts`, `classroom_courses`, `classroom_levels`, `classroom_items`, `classroom_enrollments`, `classroom_progress` และ private helper schema ไม่ได้เปลี่ยนตาราง profiles, auth trigger, role หรือข้อมูลการเรียนเดิม สคริปต์ที่ติดตั้งจริงคือ `supabase/setup/classroom-beta-isolated.sql` ผ่าน migration `isolated_classroom_beta_new_tables_only` อย่ารันสคริปต์ draft เก่า `classroom.sql` ซ้ำ

RLS integration tests รันบนฐานจริงใน transaction ที่ rollback แล้ว ยืนยันการล็อกเลเวล การป้องกันแก้สิทธิ์เอง และ manual unlock โดยไม่เก็บผู้เรียนหรือรายการทดสอบถาวร `supabase/tests/classroom-rls.sql` ใช้ UUID ตัวอย่าง ต้องแทนด้วย test principals ก่อนทดสอบซ้ำ

ระบบนี้ยังใช้การติ๊กด้วยตัวนักเรียน ไม่ยืนยันว่าวิดีโอเล่นครบทุกวินาที และไม่มีการตรวจ HW อัตโนมัติ วิดีโอมีลายน้ำผู้เรียนในตัวเล่นเว็บ แต่ป้องกันการบันทึกหน้าจอทั้งหมดไม่ได้

Security Advisors ไม่พบข้อเตือนในส่วน classroom ใหม่ ส่วนคำเตือนในระบบเก่าเกี่ยวกับ trigger functions และ leaked-password protection ยังแยกไว้ ไม่ได้แก้สิทธิ์เก่าในรอบ beta นี้

บัญชีนักเรียนที่ใช้ Username ไม่มีอีเมลรับลิงก์กู้รหัสผ่าน หากลืมรหัสผ่านให้ผู้ดูแลเปลี่ยนผ่าน Supabase Auth ก่อน ยังไม่มีเมนูรีเซ็ตรหัสในหลังบ้านรุ่นนี้
