# บ้านฟิสิกส์ · Baanphys

โครงเว็บไซต์คอร์สฟิสิกส์ตาม draft ของเจ้าของคอร์ส: Username/รหัสผ่านที่ผู้ดูแลออกให้, สิทธิ์รายคอร์ส, pathway Pre-POSN 31 เลเวล, checklist วิดีโอ/HW และหลังบ้านปลดล็อกเลเวลเป็นรายคน

**สถานะ: โครงร่างที่ทดลอง flow ได้ พร้อมโค้ด backend สำหรับเตรียมติดตั้ง ระบบบัญชี/ฐานข้อมูลคอร์สใหม่ยังไม่ได้ติดตั้งหรือทดสอบกับ Supabase จริง** เนื้อหาและเวลาจริงรอเจ้าของคอร์สส่งผ่านแชท ตัวอย่างไม่สร้างบัญชีหรือเปลี่ยนสิทธิ์จริง

## ลองในเครื่อง

ใช้ Node.js 22 ขึ้นไป เปิด PowerShell ที่โฟลเดอร์โปรเจกต์:

```powershell
npm.cmd install
npm.cmd run dev
```

เปิด `http://localhost:3000`:

| หน้า | เส้นทาง |
| --- | --- |
| หน้าแรก | `/` |
| ตัวอย่างนักเรียน | `/preview/classroom` |
| ตัวอย่างหลังบ้าน | `/preview/admin` |
| เข้าสู่ระบบจริง | `/login` |
| คอร์สของฉัน | `/courses` |
| จัดการนักเรียนจริง | `/admin/students` |
| หน้าเว็บเดิม | `/academy` |

ในตัวอย่าง เลือก Level 9 ติ๊กวิดีโอและ HW ให้ครบ Level 10 จะยังล็อกอยู่ จากนั้นเปิดหลังบ้านตัวอย่าง เลือก `student.demo` แล้วกดปลดล็อก Level 10 เมื่อกลับหน้าห้องเรียนจะเห็นสิทธิ์ใหม่ ตัวอย่างเก็บข้อมูลใน localStorage ของเบราว์เซอร์เดียวกันเท่านั้น

## โครงสร้าง

- Next.js App Router + TypeScript + Tailwind CSS + Lucide
- Supabase Auth/PostgreSQL สำหรับบัญชี สิทธิ์เรียน และความคืบหน้า
- ตาราง `classroom_*` แยกจากระบบ Skill Tree เดิม
- นักเรียนไม่สามารถเปิดคอร์สหรือปลดล็อกเลเวลของตัวเองได้ ต้องให้แอดมินกดทุกครั้ง
- วิดีโอ/เอกสารจาก Google Drive ผ่านเส้นทางตรวจสิทธิ์ พร้อมลายน้ำชื่อผู้เรียน เวลา และห้าม cache สื่อส่วนตัว
- ใช้ GitHub เก็บ source code; เปิดออนไลน์ต้อง deploy บนโฮสต์ที่รองรับ Next.js server เว็บนี้มี server actions จึงใช้ GitHub Pages แบบ static อย่างเดียวไม่ได้ ([เอกสาร Next.js](https://nextjs.org/docs/app/guides/static-exports))

## ตั้งค่าระบบจริงเมื่อพร้อม

1. คัดลอก `.env.example` เป็น `.env.local` แล้วตั้งค่า Supabase ห้าม commit ไฟล์รหัสลับ
2. ติดตั้ง migration เดิมตามลำดับใน `supabase/migrations/` แล้วตรวจ/รัน `supabase/setup/classroom.sql` บนฐานข้อมูลทดสอบก่อน
3. ปิดการสมัครผู้ใช้ใหม่ใน Supabase Auth แล้วตั้งบัญชีแอดมินด้วยช่องทางผู้ดูแลฐานข้อมูล
4. ตั้ง `SUPABASE_SERVICE_ROLE_KEY` เฉพาะเซิร์ฟเวอร์เพื่อสร้างบัญชีนักเรียน ห้ามใช้ชื่อขึ้นต้น `NEXT_PUBLIC_`
5. ทดสอบ RLS ด้วยนักเรียนสองคนและแอดมิน ตรวจ Security Advisors แล้วจึงเปิดให้นักเรียนจริง
6. ใส่เนื้อหาและลิงก์ Drive ที่ได้รับจากเจ้าของคอร์ส คอร์ส Camp 1, Camp 2 และ TPhO รอจำนวนเลเวล/หลักสูตร

ดูรายละเอียดใน [แผนคอร์ส](docs/COURSE-PLAN.md), [บัญชีเข้าเรียน](docs/CLASSROOM-AUTH.md), [ฐานข้อมูลและสิทธิ์](docs/CLASSROOM-BACKEND.md) และ [คู่มือระบบเดิม](docs/LEGACY-README.md)

Google Drive ต้องแชร์สิทธิ์ให้บัญชี Google ของนักเรียนแยกจาก login เว็บไซต์ เลือก Restricted และจำกัดดาวน์โหลดเท่าที่ Drive รองรับ ลายน้ำช่วยลดการส่งต่อ แต่ไม่ป้องกันการอัดหน้าจอหรือการคัดลอกทั้งหมด ([Google Drive](https://support.google.com/drive/answer/2494822?hl=en))

## ตรวจโค้ด

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Unit tests ใช้บริการจำลอง ไม่ยืนยันการทำงานของ SQL/RLS จริง การตรวจผ่านเบราว์เซอร์ยังทำไม่สำเร็จในรอบสร้างโครงร่างเพราะข้อจำกัดเครื่องมือ จึงควรตรวจหน้าจอ desktop/mobile และไฟล์ Drive จริงก่อนเปิดใช้

ไม่รวม `.env.local`, `node_modules`, `.next`, คลิป และไฟล์ใน `deliverables/` ใน repository
