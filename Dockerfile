# ==========================================
# 1-bosqich: O'quvchi (Student) frontendini qurish
# ==========================================
FROM node:22-alpine AS student-build
WORKDIR /app/student
COPY student/package*.json ./
RUN npm ci
COPY student/ ./
RUN npm run build

# ==========================================
# 2-bosqich: O'qituvchi (Teacher) frontendini qurish
# ==========================================
FROM node:22-alpine AS teacher-build
WORKDIR /app/teacher
COPY teacher/package*.json ./
RUN npm ci
COPY teacher/ ./
RUN npm run build

# ==========================================
# 3-bosqich: Python backend va yagona server
# ==========================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000

WORKDIR /app

# Backend kutubxonalarini o'rnatish
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Backend kodlari va boshlang'ich ma'lumotlarni nusxalash
COPY backend/ ./backend/

# Qurilgan frontend statik fayllarini nusxalash
COPY --from=student-build /app/student/dist ./frontend/student/
COPY --from=teacher-build /app/teacher/dist ./frontend/teacher/

# Xavfsiz tizim foydalanuvchisi va data papkasini sozlash
RUN useradd --system --uid 10001 appuser \
    && mkdir -p /data/uploads \
    && chown -R appuser:appuser /app /data

USER appuser
EXPOSE 10000

# Render $PORT o'zgaruvchisi orqali serverni ishga tushirish
CMD ["sh", "-c", "cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
