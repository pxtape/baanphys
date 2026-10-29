# สำรองและกู้คืนห้องเรียน

## สำรองข้อมูลระหว่างใช้งาน

หน้าแอดมินนักเรียน → สำรองข้อมูลห้องเรียน → ดาวน์โหลดไฟล์สำรอง เก็บในที่ส่วนตัวที่แยกจากเครื่องทำงาน ไฟล์มีข้อมูลนักเรียนและลิงก์เนื้อหา ห้ามนำขึ้น repository สาธารณะ

ไฟล์ JSON รวมข้อมูลห้องเรียนทุกตาราง แต่ไม่รวม Auth/password, Supabase schema และตัวไฟล์ Google Drive จึงใช้แทน full database backup ไม่ได้

ตรวจรูปแบบและความสัมพันธ์ของไฟล์ที่ดาวน์โหลด:

```powershell
node scripts/validate-classroom-backup.mjs "C:\path\to\baanphys-backup-YYYY-MM-DD.json"
```

## กู้คืนเมื่อเกิดเหตุ

1. หยุดการเขียนข้อมูลชั่วคราว และเก็บสำเนาสถานะปัจจุบันก่อน
2. ใช้ full database backup ของโครงการเพื่อคืน schema, Auth identities และข้อมูลลงโครงการทดสอบแยก ห้ามทดลอง restore ทับ production
3. ตรวจจำนวนบัญชี สิทธิ์เรียน ความคืบหน้า วันที่ต่ออายุ นัด และคะแนน เทียบ JSON export ล่าสุด หากต้องเติมข้อมูลหลังจุดสำรอง ให้ทำ transaction ที่ตรวจ user IDs และ foreign keys ก่อนเสมอ
4. ทดลอง login นักเรียน/แอดมิน ตรวจ RLS ข้ามบัญชี และเปิดไฟล์ Drive ด้วยบัญชีที่ไม่มีสิทธิ์เจ้าของไฟล์
5. เปรียบเทียบยอดก่อนสลับกลับใช้งาน และทดสอบการบันทึกใหม่โดยใช้บัญชีทดสอบ

GitHub เก็บโค้ดและ setup SQL เท่านั้น ต้องตรวจ backup retention และความพร้อมของ full database backup ในบัญชี Supabase ด้วย การเพิ่มปุ่ม export ครั้งนี้ไม่ได้เปิดบริการ backup แบบเสียเงินหรือทำการ restore production

## ลำดับ setup เพิ่มเติม

หลัง setup เดิม ใช้ `classroom-audit-fixes.sql` → `classroom-history-snapshots.sql` → `classroom-schedule-history.sql` ตามลำดับ แต่ฐานข้อมูลจริงโครงการ baanphys ได้รับ migrations แล้ว ห้ามรันไฟล์ create ซ้ำ

ชุด SQL verification ใน `supabase/tests/` ทำงานใน transaction แล้ว rollback ใช้ตรวจ regression ไม่ได้ใช้แทนการทดสอบ full restore

