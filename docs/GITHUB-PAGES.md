# เปิดเว็บด้วย GitHub Pages

ลิงก์เว็บไซต์เมื่อเปิด Pages และ deployment สำเร็จ: https://pxtape.github.io/baanphys/

ชุดนี้ส่งเฉพาะโครงร่างสาธารณะบน GitHub Pages ไม่ใส่ข้อมูลบัญชีจริง คลิปจริง ไฟล์ environment หรือระบบหลังบ้านที่ใช้ secret key ข้อมูลตัวอย่างเก็บเฉพาะเบราว์เซอร์ และป้ายบอกโหมดตัวอย่างแสดงทุกหน้า

## เปิดใช้งานครั้งแรก

1. ล็อกอิน GitHub ด้วยบัญชีเจ้าของ repository
2. เปิด https://github.com/pxtape/baanphys/settings/pages
3. ใน Build and deployment เลือก Source เป็น **GitHub Actions**
4. เปิด Actions → Publish GitHub Pages ถ้า build รอบก่อนล้มเพราะยังไม่เปิด Pages ให้กด Re-run all jobs หรือ Run workflow
5. เมื่อ workflow สำเร็จเปิด https://pxtape.github.io/baanphys/

หลังเปิดครั้งแรก การเปลี่ยนโค้ดบน main ในไฟล์ที่กำหนดจะ build และ deploy อัตโนมัติ

## สิ่งที่ลองได้

- หน้าแรกและคอร์ส 4 คอร์ส
- ตัวอย่างห้องเรียน Pre-POSN 31 เลเวล
- ติ๊กวิดีโอ/HW ที่ Level 9 แล้วสลับหลังบ้านไปปลดล็อก Level 10
- เพิ่มนักเรียนจำลองและลองจัดสิทธิ์ โดยไม่สร้างบัญชีหรือรหัสผ่านจริง

ใช้ browser profile เดียวกันเมื่อต้องการแชร์ข้อมูลจำลองระหว่างห้องเรียนกับหลังบ้าน URL `/login/` อธิบายสถานะโครงร่างและไม่รับรหัสผ่านจริง

## Build

`npm.cmd run build:pages` หรือ `pnpm run build:pages` สร้าง Next.js static export ที่ `.pages-build/out` โดยคัดลอกเฉพาะไฟล์ที่อนุญาตเข้าโปรเจกต์ build แยก ไม่มีการแก้โค้ด production server เดิม ไม่มี middleware / server actions / API secrets ในผลลัพธ์ Pages

ไฟล์ `.github/workflows/pages.yml` ติดตั้ง dependency ตาม lockfile แล้ว build/upload/deploy ด้วย GitHub Actions ทางการ

หากใช้ชื่อ repository หรือ custom domain ต่างจากเดิม ให้แก้ `PAGES_BASE_PATH` ใน workflow ค่าเริ่มต้นคือ `/baanphys`

บัญชีนักเรียนและสิทธิ์จริงยังคงใช้โค้ด Next.js/Supabase ที่เตรียมไว้ในโปรเจกต์หลัก การนำระบบจริงมาใช้ร่วมกับ GitHub Pages ต้องปรับส่วน backend ให้เรียกผ่านบริการภายนอกที่ตรวจสิทธิ์อย่างเหมาะสม ไม่สามารถนำ server actions เดิมมาเปิดเป็นไฟล์ static ได้

อ้างอิง: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports)
