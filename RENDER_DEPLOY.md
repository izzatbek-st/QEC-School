# EduMaster loyihasini Render.com ga joylash bo'yicha to'liq qo'llanma

Ushbu qo'llanma EduMaster (PISA-QEC) loyihasini **Render.com** bulutli platformasiga tez va xatosiz joylashtirish (deploy qilish) uchun tayyorlangan.

Loyiha barcha frontend panellarni (`/teacher/` va `/student/`), API serverni (`/api/`) hamda yuklangan video/rasmlarni (`/uploads/`) **yagona Docker konteynerida** bitta umumiy domen ostida ishlatadi. Bu ortiqcha xarajatlarsiz Render'ning bepul (Free) tarifida ham to'liq ishlashini ta'minlaydi.

---

## 1. Loyihani GitHub-ga yuklash

Render ilovani GitHub (yoki GitLab) orqali avtomatik oladi va quradi. Agar loyihangiz hali GitHub'da bo'lmasa, quyidagi amallarni bajaring:

1. [GitHub](https://github.com) ga kiring va yangi repository yarating (masalan: `edumaster`).
2. Loyiha papkasida terminalni oching va quyidagi buyruqlarni bajaring:

```bash
git init
git add .
git commit -m "feat: Render deployment tayyorlandi"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```
*(USERNAME va REPO_NAME o'rniga o'zingizning GitHub foydalanuvchi nomingiz va repository nomingizni yozing)*

---

## 2. Render.com da ishga tushirish

Ikki xil usul mavjud:

### 1-usul: Blueprint orqali (Tavsiya etiladi - 1 klikda)

Loyihada barcha sozlamalar `render.yaml` faylida oldindan kiritilgan:

1. [dashboard.render.com](https://dashboard.render.com/) saytiga kiring.
2. Yuqori o'ng burchakdagi **"New +"** tugmasini bosing va **"Blueprint"** ni tanlang.
3. GitHub hisobingiz orqali yuqoridagi repository'ni tanlang va **"Connect"** tugmasini bosing.
4. Render avtomatik ravishda `render.yaml` faylini aniqlaydi.
5. Service Name (xizmat nomi) ni tekshirib, **"Apply"** tugmasini bosing.
6. Render avtomatik ravishda Docker orqali ikkala frontend va backendni qurib, ishga tushiradi!

---

### 2-usul: Manual (Web Service) orqali

Agar Blueprint o'rniga qo'lda sozlashni xohlasangiz:

1. [dashboard.render.com](https://dashboard.render.com/) da **"New +"** -> **"Web Service"** ni bosing.
2. Repository'ingizni tanlang (**Connect**).
3. Sozlamalarni quyidagicha belgilang:
   - **Name**: `edumaster` (yoki ixtiyoriy nom)
   - **Language / Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile` (yoki bo'sh qoldiring, ildizdagini oladi)
   - **Instance Type**: `Free`
4. **Health Check Path** (Advanced bo'limida): `/health`
5. **Environment Variables** (Muhit o'zgaruvchilari) bo'limida quyidagilarni kiriting:
   - `APP_ENV` = `production`
   - `APP_SECRET_KEY` = Kamida 32 belgili ixtiyoriy maxfiy kalit (yoki Generate tugmasini bosing)
   - `INITIAL_ADMIN_PASSWORD` = `admin` (yoki o'zingiz xohlagan parol)
   - `DATABASE_URL` = `sqlite:////data/edumaster.db`
   - `UPLOADS_DIR` = `/data/uploads`
6. **"Create Web Service"** tugmasini bosing.

---

## 3. Boshlang'ich Login va Parollar

Loyiha avtomatik ravishda tayyor demo ma'lumotlar bilan ishga tushadi:

### O'qituvchi (Teacher) paneli:
- **Manzil**: `https://<sizning-domen>/teacher/` (yoki asosiy `https://<sizning-domen>/`)
- **Login**: `admin` yoki `jasur@edumaster.uz`
- **Parol**: `admin`

> Birinchi kirishdan so'ng **Sozlamalar -> Parolni o'zgartirish** orqali yangi kuchli parol o'rnating.

### O'quvchi (Student) paneli:
- **Manzil**: `https://<sizning-domen>/student/`
- **Login**: `ozodbek`
- **Parol**: `ozodbek`

---

## 4. Muhim ma'lumotlar va Tavsiyalar

1. **Render Free tarifining xususiyati (Spin down)**:
   - Bepul tarifda xizmatga 15 daqiqa davomida so'rov kelmasa, u "uyqu" (sleep) rejimiga o'tadi.
   - Keyingi safar kimdir saytga kirganda, u taxminan 30-50 soniyada qayta uyg'onadi. Bu Render bepul rejasining standart holatidir.

2. **Ma'lumotlar saqlanishi (Persistent Disk)**:
   - Render bepul rejasida har safar yangi versiya (redeploy) chiqqanda konteyner qayta yaratiladi. Loyiha boshlang'ich darslar, testlar va videolarni avtomatik tarzda o'z ichiga oladi.
   - Agar foydalanuvchilar yuklagan yangi fayllar va o'quvchilar natijalari doimiy saqlanib qolishini istasangiz, Render'ning Starter rejasida ($7/oy) **Persistent Disk** ($1/oy) ulab qo'yish mumkin (mount path: `/data`).

3. **Loglarni kuzatish**:
   - Render boshqaruv panelidagi **"Logs"** bo'limida tizim qanday qurilayotgani va xatolar yuz bersa ularning sababini real vaqtda ko'rib turishingiz mumkin.
