# License Key Admin (ภาษาไทย)

> English version: [README.md](README.md). รันได้ทันทีโดยไม่ต้องมี backend จริง (โหมด demo — ดู README.md)

แผงคุม License Key + หน้าให้ลูกค้าย้ายเครื่องเอง คุยกับ license API ผ่าน route ของตัวเองเท่านั้น

## Environment

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `LICENSE_API_URL` | ปลายทาง API จริง **ไม่ตั้ง = โหมด demo** (ใช้ข้อมูลจำลองในหน่วยความจำ) |
| `ADMIN_SECRET` | คุยกับ license API — **ฝั่ง server เท่านั้น** ห้าม import เข้า client component |
| `ADMIN_PASSWORD` | รหัสผ่านหน้า `/login` (8 ตัวขึ้นไป) |
| `SESSION_SECRET` | เซ็นคุกกี้ session (16 ตัวขึ้นไป) เปลี่ยนเมื่อไหร่ = เตะทุกคนออก |

โหมด demo: ไม่ตั้ง `ADMIN_PASSWORD` / `SESSION_SECRET` ก็ใช้ค่า demo ได้ (รหัสผ่าน `demo1234`)
โหมดจริง (ตั้ง `LICENSE_API_URL`): ไม่ตั้ง `ADMIN_PASSWORD` หรือ `SESSION_SECRET` → เข้าสู่ระบบไม่ได้เลย (ตั้งใจให้ fail closed)

## แยกฝั่งลูกค้ากับฝั่งแอดมิน — โครงไฟล์บอกเองว่าอันไหนเป็นอันไหน

| โฟลเดอร์ | URL | ใครเข้าได้ | แตะ secret ไหม |
|---|---|---|---|
| `app/(public)/` | `/login` `/reset` | ทุกคน | ไม่ |
| `app/api/public/` | `/api/public/*` | ทุกคน | ไม่ |
| `app/(admin)/` | `/dashboard` `/keys` `/create` | ต้องมี session | — |
| `app/api/admin/` | `/api/admin/*` | ต้องมี session | ใช่ (ฝั่ง server) |

`app/lib/` แยกเป็น 3 ไฟล์เพื่อไม่ให้เผลอข้ามฝั่ง:
`admin-api.ts` (ยิง `/api/admin/*`) · `customer-api.ts` (ยิง `/api/public/*` อย่างเดียว) · `types.ts` (ของกลาง)

**`proxy.ts` เป็น deny-by-default** — path ไหนไม่อยู่ในลิสต์ public ถือเป็นของแอดมินทันที
หน้าใหม่ที่เพิ่งสร้างจึงเป็น "ปิด" ไว้ก่อนเสมอ ต้องตั้งใจย้ายเข้า `(public)` + เติมลิสต์ถึงจะเปิด

## กติกาสำคัญ

- **ห้ามเอา admin secret ไปไว้ในโค้ดฝั่ง browser** — ทุกคำสั่งที่ต้องใช้ secret ต้องวิ่งผ่าน `app/api/admin/*` เท่านั้น
- **หน้า `/reset` ของลูกค้าห้ามใช้ `ADMIN_SECRET`** — endpoint ฝั่ง API เป็น public
  อยู่แล้ว และลิมิตวันละครั้งบังคับที่ฝั่ง backend ถ้าแนบ secret = ข้ามลิมิตให้ทุกคน
- proxy ของ Next 16 คือไฟล์ `proxy.ts` **ไม่ใช่ `middleware.ts`** — ตรวจว่า build
  ขึ้นบรรทัด `ƒ Proxy (Middleware)` ไม่งั้นแปลว่าไฟล์ไม่ถูกโหลดและไม่มีอะไรกั้นเลย

## รันในเครื่อง

```bash
npm ci
npm run dev      # เปิด http://localhost:3000 รหัสผ่าน demo1234
npm test         # unit test ของ mock store
```
