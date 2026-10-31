# EduMaster serverga joylashtirish

Ishlab chiqarish muhiti bitta domen ostida ishlaydi: o'qituvchi paneli `/teacher/`, o'quvchi paneli `/student/`, API esa `/api/` manzilida. Nginx API so'rovlarini backendga uzatadi. SQLite bazasi va yuklangan fayllar Docker volume ichida saqlanadi.

## Talablar

- Docker Engine va `docker compose`
- Domen uchun HTTPS/TLS reverse proxy (masalan, host Nginx yoki Caddy)

## Birinchi ishga tushirish

1. Loyihaning ildiz papkasida `.env.example` faylini `.env` nomi bilan nusxalang.
2. `APP_SECRET_KEY` uchun kamida 32 belgili tasodifiy maxfiy kalit, `INITIAL_ADMIN_PASSWORD` uchun esa kamida 12 belgili kuchli parol belgilang. Bu faylni ommaga ulashmang yoki repozitoriyga qo'shmang. Kalit yaratish uchun:

   ```sh
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

3. Serverda quyidagini bajaring:

   ```sh
   docker compose up -d --build
   ```

4. Reverse proxy orqali HTTPS trafikni `127.0.0.1:8080` ga yo'naltiring. HTTP port internetga bevosita ochilmaydi.
5. O'qituvchi paneli `https://domeningiz/teacher/`, o'quvchi paneli `https://domeningiz/student/` manzilida ochiladi. O'qituvchi login nomi dastlab `admin`, paroli `.env` dagi `INITIAL_ADMIN_PASSWORD` bo'ladi.

`INITIAL_ADMIN_PASSWORD` yangi bazadagi dastlabki o'qituvchi parolini o'rnatadi. Oldindan mavjud bo'lgan ochiq matndagi parolni migratsiya qilishda ham u bir marta ishlatiladi; parol hash qilingandan keyingi qayta ishga tushirishlarda u bazani qayta sozlamaydi. Eski, migratsiya qilinmagan bazani serverga ko'chirishdan avval ma'lumotlar bazasi va `uploads` papkasining zaxira nusxasini yarating.

Birinchi kirishdan so'ng o'qituvchi panelidagi **Sozlamalar / Parolni o'zgartirish** bo'limida dastlabki parolni almashtiring. Parol o'zgartirish uchun amaldagi parol kerak; yangi parol kamida 12 belgidan iborat bo'lishi kerak.

## Ishlash va texnik xizmat

- `docker compose ps` bilan servis holatini, `docker compose logs -f backend web` bilan loglarni tekshiring.
- Ilova sog'lig'i `http://127.0.0.1:8080/health` orqali kuzatiladi.
- Ma'lumotlar `edumaster_data` nomli Docker volume ichida: `/data/edumaster.db` va `/data/uploads`. Yangilash paytida volume'ni o'chirmang; muntazam zaxira nusxa oling.
- Yangi versiyani joylashtirish: `docker compose up -d --build`. Ma'lumotlar bazasi va fayllarni alohida zaxiralang.
- `APP_SECRET_KEY` ni almashtirish barcha faol sessiyalarni yaroqsiz qiladi. Keyin foydalanuvchilar qayta tizimga kiradi.

Windows'da `start.bat` kerakli Python muhitini yaratadi va frontend bog'liqliklari mavjud bo'lmasa o'rnatadi. Panellar Vite orqali, API esa `127.0.0.1:8000` da ishga tushadi; Vite `/api` va `/uploads` so'rovlarini backendga yo'naltiradi.

## Render.com bulutli platformasiga joylash

Render.com ga 1-klikda yoki Docker orqali joylashtirish bo'yicha batafsil qo'llanma: [RENDER_DEPLOY.md](RENDER_DEPLOY.md).
Loyiha `render.yaml` va ildizdagi `Dockerfile` orqali to'liq avtomatlashtirilgan.
