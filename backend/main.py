import base64
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request, Response
from fastapi.responses import RedirectResponse, FileResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import models, schemas
from database import SessionLocal, engine, get_db
from quizzes import grade_quiz, parse_quiz_data, public_quiz_data

production = os.getenv("APP_ENV", "development").lower() == "production"
secret_key = os.getenv("APP_SECRET_KEY")
if not secret_key:
    if production:
        import logging
        logging.warning(
            "WARNING: APP_SECRET_KEY is not set in production. Generated a temporary key. "
            "Set APP_SECRET_KEY in Render environment variables to preserve login sessions across restarts."
        )
        secret_key = secrets.token_urlsafe(48)
    else:
        # Stable secret key for local development to prevent session loss on restart/reload
        secret_key = "qec_school_secure_local_dev_secret_key_fixed_2026"
elif len(secret_key) < 32:
    raise RuntimeError("APP_SECRET_KEY must contain at least 32 characters")

SECRET_KEY = secret_key.encode("utf-8")
INITIAL_ADMIN_PASSWORD = os.getenv("INITIAL_ADMIN_PASSWORD")
if production and INITIAL_ADMIN_PASSWORD and len(INITIAL_ADMIN_PASSWORD) < 12:
    import logging
    logging.warning(
        "WARNING: INITIAL_ADMIN_PASSWORD contains less than 12 characters. "
        "A stronger password is recommended for production."
    )

UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", Path(__file__).resolve().parent / "uploads"))
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Auto-seed initial media files to custom UPLOADS_DIR if empty
default_uploads_dir = Path(__file__).resolve().parent / "uploads"
if UPLOADS_DIR.resolve() != default_uploads_dir.resolve() and default_uploads_dir.exists():
    import shutil
    try:
        for item in default_uploads_dir.iterdir():
            target = UPLOADS_DIR / item.name
            if not target.exists() and item.is_file():
                shutil.copy2(item, target)
    except Exception:
        pass

class SinglePageApplication(StaticFiles):
    """
    Serves static files, falling back to index.html for client-side routing (SPA).
    """
    def __init__(self, directory: str, index_file: str = "index.html"):
        super().__init__(directory=directory, html=True)
        self.index_file = index_file

    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
            if response.status_code == 404 and "." not in Path(path).name:
                return await super().get_response(self.index_file, scope)
            return response
        except (HTTPException, StarletteHTTPException) as exc:
            if exc.status_code == 404 and "." not in Path(path).name:
                return await super().get_response(self.index_file, scope)
            raise exc

app = FastAPI(
    title="QEC-School API",
    docs_url=None if production else "/docs",
    redoc_url=None if production else "/redoc",
)

@app.head("/uploads/{file_name:path}")
@app.get("/uploads/{file_name:path}")
async def serve_upload(file_name: str, request: Request):
    """
    Serves uploaded media files with full HTTP 206 Partial Content (Range request)
    support so video players on mobile (iOS/Android) and desktop can stream, seek,
    and buffer properly without issues.
    """
    target_path = (UPLOADS_DIR / file_name).resolve()
    uploads_resolved = UPLOADS_DIR.resolve()

    if not str(target_path).startswith(str(uploads_resolved)) or not target_path.is_file():
        raise HTTPException(status_code=404, detail="Fayl topilmadi")

    file_size = target_path.stat().st_size
    content_type, _ = mimetypes.guess_type(str(target_path))
    content_type = content_type or "application/octet-stream"

    base_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
    }

    if request.method == "HEAD":
        return Response(
            status_code=200,
            headers={
                **base_headers,
                "Content-Length": str(file_size),
                "Content-Type": content_type,
            }
        )

    range_header = request.headers.get("range")
    if not range_header:
        return FileResponse(
            str(target_path),
            media_type=content_type,
            headers={
                **base_headers,
                "Content-Length": str(file_size),
            }
        )

    range_match = re.match(r"^bytes=(\d+)-(\d+)?$", range_header.strip())
    if not range_match:
        return Response(
            status_code=416,
            headers={"Content-Range": f"bytes */{file_size}"}
        )

    start_str, end_str = range_match.groups()
    start = int(start_str)
    end = int(end_str) if end_str is not None else file_size - 1

    if start >= file_size or end >= file_size or start > end:
        return Response(
            status_code=416,
            headers={"Content-Range": f"bytes */{file_size}"}
        )

    content_length = end - start + 1

    def file_iterator(path: Path, start_pos: int, length: int, chunk_size: int = 128 * 1024):
        with open(path, "rb") as f:
            f.seek(start_pos)
            bytes_left = length
            while bytes_left > 0:
                read_amount = min(chunk_size, bytes_left)
                chunk = f.read(read_amount)
                if not chunk:
                    break
                bytes_left -= len(chunk)
                yield chunk

    response_headers = {
        **base_headers,
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(content_length),
        "Content-Type": content_type,
    }

    return StreamingResponse(
        file_iterator(target_path, start, content_length),
        status_code=206,
        headers=response_headers,
        media_type=content_type,
    )

# Dynamic frontend discovery and mounting for single-container deployment (Render / Docker)
def find_frontend_dir(name: str) -> str | None:
    env_val = os.getenv(f"FRONTEND_{name.upper()}_DIR")
    if env_val and Path(env_val).exists() and (Path(env_val) / "index.html").exists():
        return env_val

    candidates = [
        Path(__file__).resolve().parent.parent / "frontend" / name,
        Path(__file__).resolve().parent.parent / name / "dist",
        Path(__file__).resolve().parent / "frontend" / name,
        Path(f"/app/frontend/{name}"),
    ]
    for c in candidates:
        if c.exists() and (c / "index.html").exists():
            return str(c)
    return None

student_frontend_dir = find_frontend_dir("student")
teacher_frontend_dir = find_frontend_dir("teacher")

if student_frontend_dir:
    app.mount("/student", SinglePageApplication(directory=student_frontend_dir), name="student")

if teacher_frontend_dir:
    app.mount("/teacher", SinglePageApplication(directory=teacher_frontend_dir), name="teacher")

@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/teacher/", status_code=302)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
if not production:
    allowed_origins.extend(["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"])

if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

bearer_scheme = HTTPBearer(auto_error=False)
PASSWORD_PREFIX = "pbkdf2_sha256$"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), 310_000
    )
    return f"{PASSWORD_PREFIX}{salt}${digest.hex()}"


def verify_password(password: str, stored_password: str) -> tuple[bool, bool]:
    if not isinstance(stored_password, str):
        return False, False
    if not stored_password.startswith(PASSWORD_PREFIX):
        return hmac.compare_digest(password, stored_password), True

    try:
        _, salt, expected_digest = stored_password.split("$", 2)
        actual_digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt), 310_000
        ).hex()
    except (ValueError, TypeError):
        return False, False
    return hmac.compare_digest(actual_digest, expected_digest), False


def encode_token(payload: dict) -> str:
    token_data = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    encoded = base64.urlsafe_b64encode(token_data).rstrip(b"=")
    signature = hmac.new(SECRET_KEY, encoded, hashlib.sha256).digest()
    return f"{encoded.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def create_access_token(role: str, user_id: int) -> str:
    return encode_token({"role": role, "sub": user_id, "exp": int(time.time()) + 43_200})


def decode_token(token: str) -> dict:
    try:
        encoded, signature = token.split(".", 1)
        expected = hmac.new(SECRET_KEY, encoded.encode(), hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, actual):
            raise ValueError("Invalid token signature")
        payload = json.loads(
            base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        )
        if not isinstance(payload, dict):
            raise ValueError("Invalid token claims")
        if not isinstance(payload.get("sub"), int) or payload.get("role") not in {"teacher", "student"}:
            raise ValueError("Invalid token claims")
        if payload.get("exp", 0) <= int(time.time()):
            raise ValueError("Expired token")
        return payload
    except (ValueError, TypeError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Sessiya yaroqsiz yoki muddati tugagan") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Tizimga qayta kiring")
    return decode_token(credentials.credentials)


def require_teacher(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Bu amal faqat o'qituvchi uchun")
    return current_user


def authorize_student(student_id: int, current_user: dict) -> None:
    if current_user["role"] == "student" and current_user["sub"] != student_id:
        raise HTTPException(status_code=403, detail="Bu o'quvchi ma'lumotlariga ruxsat yo'q")


def authorize_block(block: models.Block, current_user: dict, db: Session) -> None:
    if current_user["role"] == "teacher":
        return
    student = db.query(models.Student).filter(
        models.Student.id == current_user["sub"]
    ).first()
    if not student or not student.group or block not in student.group.blocks:
        raise HTTPException(status_code=403, detail="Bu dars blokiga ruxsat yo'q")


def sanitize_stored_media_url(url: str | None) -> str | None:
    if not url:
        return url
    clean = url.strip()
    clean = re.sub(r"^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/uploads/.*)", r"\1", clean)
    return clean


def student_topic_payload(
    topic: models.Topic,
    student_id: int,
    db: Session = None,
    attempt: models.QuizAttempt = None,
    is_lesson_completed: bool = False,
) -> dict:
    passing_score = topic.passing_score if topic.passing_score is not None else 70
    clean_video_url = sanitize_stored_media_url(topic.video_url)
    clean_content = topic.content
    if clean_content:
        clean_content = re.sub(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/uploads/[^\s\"'>]+)", r"\1", clean_content)

    payload = {
        "id": topic.id,
        "block_id": topic.block_id,
        "title": topic.title,
        "video_url": clean_video_url,
        "content": clean_content,
        "order_index": topic.order_index,
        "item_type": topic.item_type,
        "quiz_data": topic.quiz_data,
        "passing_score": passing_score,
        "completed": False,
        "is_locked": False,
        "locked_reason": None,
        "attempt": None,
    }
    if topic.item_type == "quiz":
        if attempt is None and db is not None:
            attempt = db.query(models.QuizAttempt).filter(
                models.QuizAttempt.student_id == student_id,
                models.QuizAttempt.topic_id == topic.id,
            ).first()

        if attempt is not None:
            score_pct = round((attempt.best_score / (attempt.total_questions or 1)) * 100)
            is_passed = score_pct >= passing_score
            payload["completed"] = is_passed
            questions = json.loads(attempt.results_data) if attempt.results_data else None
            answers = json.loads(attempt.answers_data) if attempt.answers_data else {}
            payload["attempt"] = {
                "id": attempt.id,
                "correct": attempt.best_score,
                "incorrect": max(0, attempt.total_questions - attempt.best_score),
                "total": attempt.total_questions,
                "score": attempt.best_score,
                "best_score": attempt.best_score,
                "percentage": score_pct,
                "is_passed": is_passed,
                "passing_score": passing_score,
                "attempt_count": attempt.attempt_count,
                "created_at": (attempt.created_at or attempt.updated_at).isoformat() if (attempt.created_at or attempt.updated_at) else None,
                "questions": questions,
                "answers": answers,
            }
        else:
            try:
                questions = parse_quiz_data(topic.quiz_data)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
            payload["quiz_data"] = public_quiz_data(
                questions, SECRET_KEY, student_id, topic.id
            )
    else:
        if is_lesson_completed:
            payload["completed"] = True
        elif db is not None:
            comp = db.query(models.LessonCompletion).filter(
                models.LessonCompletion.student_id == student_id,
                models.LessonCompletion.topic_id == topic.id,
            ).first()
            if comp is not None:
                payload["completed"] = True
    return payload


def seed_from_template_if_empty(db: Session):
    # If blocks already exist, do not re-seed
    if db.query(models.Block).first() is not None:
        return

    import sqlite3
    seed_db_path = Path(__file__).resolve().parent / "pisa_backend.db"
    if not seed_db_path.exists():
        return

    try:
        conn = sqlite3.connect(seed_db_path)
        cur = conn.cursor()

        # 1. Blocks
        cur.execute("SELECT id, title, category, desc, topics, badge, badge_class FROM blocks")
        for row in cur.fetchall():
            db.add(models.Block(
                id=row[0], title=row[1], category=row[2], desc=row[3],
                topics=row[4], badge=row[5], badge_class=row[6]
            ))
        db.commit()

        # 2. Topics
        cur.execute("SELECT id, block_id, title, video_url, content, order_index, item_type, quiz_data FROM topics")
        for row in cur.fetchall():
            clean_seed_video = sanitize_stored_media_url(row[3])
            clean_seed_content = row[4]
            if clean_seed_content:
                clean_seed_content = re.sub(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/uploads/[^\s\"'>]+)", r"\1", clean_seed_content)
            db.add(models.Topic(
                id=row[0], block_id=row[1], title=row[2], video_url=clean_seed_video,
                content=clean_seed_content, order_index=row[5], item_type=row[6], quiz_data=row[7]
            ))
        db.commit()

        # 3. Groups
        cur.execute("SELECT id, name, desc FROM groups")
        for row in cur.fetchall():
            db.add(models.Group(id=row[0], name=row[1], desc=row[2]))
        db.commit()

        # 4. Block-Group associations
        cur.execute("SELECT block_id, group_id FROM block_group")
        for row in cur.fetchall():
            db.execute(models.block_group_association.insert().values(block_id=row[0], group_id=row[1]))
        db.commit()

        # 5. Students
        cur.execute("SELECT id, name, initials, username, password, color, group_id, score FROM students")
        for row in cur.fetchall():
            db.add(models.Student(
                id=row[0], name=row[1], initials=row[2], username=row[3],
                password=row[4], color=row[5], group_id=row[6], score=row[7]
            ))
        db.commit()

        # Reset Postgres sequences if using postgresql
        from database import SQLALCHEMY_DATABASE_URL
        if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
            from sqlalchemy import text
            for table in ["settings", "blocks", "topics", "groups", "students", "quiz_attempts"]:
                try:
                    db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM {table}"))
                    db.commit()
                except Exception:
                    pass
        conn.close()
    except Exception as e:
        print("Seed template error:", e)


def ensure_quiz_attempts_columns():
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(quiz_attempts)")
                columns = [row[1] for row in cursor.fetchall()]
                if "answers_data" not in columns:
                    cursor.execute("ALTER TABLE quiz_attempts ADD COLUMN answers_data TEXT")
                if "results_data" not in columns:
                    cursor.execute("ALTER TABLE quiz_attempts ADD COLUMN results_data TEXT")
                if "created_at" not in columns:
                    cursor.execute("ALTER TABLE quiz_attempts ADD COLUMN created_at DATETIME")
                
                cursor.execute("PRAGMA table_info(topics)")
                t_cols = [row[1] for row in cursor.fetchall()]
                if "passing_score" not in t_cols:
                    cursor.execute("ALTER TABLE topics ADD COLUMN passing_score INTEGER DEFAULT 70")
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lesson_completions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        student_id INTEGER NOT NULL,
                        topic_id INTEGER NOT NULL,
                        completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uq_student_lesson_completion UNIQUE (student_id, topic_id),
                        FOREIGN KEY(student_id) REFERENCES students(id),
                        FOREIGN KEY(topic_id) REFERENCES topics(id)
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_lesson_completions_student_id ON lesson_completions (student_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_lesson_completions_topic_id ON lesson_completions (topic_id)")
                conn.connection.commit()
            else:
                conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS answers_data TEXT"))
                conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS results_data TEXT"))
                conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                conn.execute(text("ALTER TABLE topics ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 70"))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS lesson_completions (
                        id SERIAL PRIMARY KEY,
                        student_id INTEGER NOT NULL,
                        topic_id INTEGER NOT NULL,
                        completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uq_student_lesson_completion UNIQUE (student_id, topic_id)
                    )
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_lesson_completions_student_id ON lesson_completions (student_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_lesson_completions_topic_id ON lesson_completions (topic_id)"))
                conn.commit()
    except Exception as e:
        print("ensure_quiz_attempts_columns notice:", e)

# Ensure schema migrations are applied immediately on import
ensure_quiz_attempts_columns()


# ========================================
# GAMIFICATION & LEADERBOARD HELPERS
# ========================================

def get_student_level_info(score: int) -> dict:
    score = max(0, score or 0)
    if score <= 100:
        level = 1
        title = "Boshlang'ich"
        badge_color = "emerald"
        icon = "fa-seedling"
        min_xp = 0
        max_xp = 100
        next_level_xp = 101
        xp_needed = max(0, 101 - score)
        progress_pct = min(100, max(0, round((score / 100) * 100)))
    elif score <= 300:
        level = 2
        title = "Izlanuvchi"
        badge_color = "blue"
        icon = "fa-compass"
        min_xp = 101
        max_xp = 300
        next_level_xp = 301
        xp_needed = max(0, 301 - score)
        progress_pct = min(100, max(0, round(((score - 100) / 200) * 100)))
    elif score <= 700:
        level = 3
        title = "Bilimdon"
        badge_color = "purple"
        icon = "fa-graduation-cap"
        min_xp = 301
        max_xp = 700
        next_level_xp = 701
        xp_needed = max(0, 701 - score)
        progress_pct = min(100, max(0, round(((score - 300) / 400) * 100)))
    elif score <= 1500:
        level = 4
        title = "Mutaxassis"
        badge_color = "amber"
        icon = "fa-award"
        min_xp = 701
        max_xp = 1500
        next_level_xp = 1501
        xp_needed = max(0, 1501 - score)
        progress_pct = min(100, max(0, round(((score - 700) / 800) * 100)))
    else:
        level = 5
        title = "Grandmaster"
        badge_color = "rose"
        icon = "fa-crown"
        min_xp = 1501
        max_xp = None
        next_level_xp = None
        xp_needed = 0
        progress_pct = 100

    return {
        "level": level,
        "title": title,
        "badge_color": badge_color,
        "icon": icon,
        "current_xp": score,
        "min_xp": min_xp,
        "max_xp": max_xp,
        "next_level_xp": next_level_xp,
        "xp_needed": xp_needed,
        "progress_pct": progress_pct,
    }


def recalculate_student_score(student_id: int, db: Session) -> int:
    lessons_count = db.query(models.LessonCompletion).filter(
        models.LessonCompletion.student_id == student_id
    ).count()

    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student_id
    ).all()

    quiz_xp = 0
    for att in attempts:
        total_q = att.total_questions or 1
        best_c = att.best_score or 0
        topic = att.topic
        pass_req = topic.passing_score if (topic and topic.passing_score is not None) else 70
        pct = round((best_c / total_q) * 100)

        # 10 XP per correct question
        base_xp = best_c * 10
        # +30 XP bonus if passed
        pass_bonus = 30 if pct >= pass_req else 0
        # +50 XP bonus if 100% perfect
        perfect_bonus = 50 if (best_c == total_q and total_q > 0) else 0

        quiz_xp += (base_xp + pass_bonus + perfect_bonus)

    total_xp = (lessons_count * 20) + quiz_xp
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if student:
        student.score = total_xp
        db.commit()
    return total_xp


def get_student_stats(student_id: int, db: Session) -> dict:
    completions_count = db.query(models.LessonCompletion).filter(
        models.LessonCompletion.student_id == student_id
    ).count()
    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student_id
    ).all()

    total_questions = sum(a.total_questions for a in attempts)
    total_correct = sum(a.best_score for a in attempts)
    accuracy_pct = round((total_correct / (total_questions or 1)) * 100) if total_questions > 0 else 0
    passed_quizzes = 0
    perfect_quizzes = 0

    for a in attempts:
        t_pass = (a.topic.passing_score if a.topic and a.topic.passing_score is not None else 70)
        pct = round((a.best_score / (a.total_questions or 1)) * 100)
        if pct >= t_pass:
            passed_quizzes += 1
        if a.best_score == a.total_questions and a.total_questions > 0:
            perfect_quizzes += 1

    return {
        "completed_lessons": completions_count,
        "completed_quizzes": len(attempts),
        "total_completed": completions_count + len(attempts),
        "total_questions": total_questions,
        "total_correct": total_correct,
        "accuracy_pct": accuracy_pct,
        "passed_quizzes": passed_quizzes,
        "perfect_quizzes": perfect_quizzes,
    }


def get_leaderboard_data(db: Session, group_id: Optional[int] = None) -> List[dict]:
    query = db.query(models.Student)
    if group_id:
        query = query.filter(models.Student.group_id == group_id)
    students = query.all()

    # Pre-fetch completions and attempts in bulk
    all_completions = db.query(models.LessonCompletion).all()
    student_lessons_map = {}
    for c in all_completions:
        student_lessons_map[c.student_id] = student_lessons_map.get(c.student_id, 0) + 1

    all_attempts = db.query(models.QuizAttempt).all()
    student_attempts_map = {}
    for a in all_attempts:
        student_attempts_map.setdefault(a.student_id, []).append(a)

    board = []
    for s in students:
        lessons_cnt = student_lessons_map.get(s.id, 0)
        s_attempts = student_attempts_map.get(s.id, [])
        quizzes_cnt = len(s_attempts)
        total_questions = sum(a.total_questions for a in s_attempts)
        total_correct = sum(a.best_score for a in s_attempts)
        accuracy_pct = round((total_correct / (total_questions or 1)) * 100) if total_questions > 0 else 0
        total_completed = lessons_cnt + quizzes_cnt

        level_info = get_student_level_info(s.score)

        board.append({
            "id": s.id,
            "name": s.name,
            "initials": s.initials,
            "username": s.username,
            "color": s.color,
            "score": s.score,
            "group_id": s.group_id,
            "group_name": s.group.name if s.group else "Noma'lum",
            "accuracy_pct": accuracy_pct,
            "completed_lessons": lessons_cnt,
            "completed_quizzes": quizzes_cnt,
            "total_completed": total_completed,
            "total_questions": total_questions,
            "total_correct": total_correct,
            "level_info": level_info,
        })

    # Multi-factor sort:
    # 1. Total score (XP) descending
    # 2. Accuracy % descending
    # 3. Total completed tasks descending
    # 4. ID ascending
    board.sort(key=lambda x: (-x["score"], -x["accuracy_pct"], -x["total_completed"], x["id"]))

    for idx, item in enumerate(board, start=1):
        item["rank"] = idx

    return board


def migrate_student_scores(db: Session):
    try:
        students = db.query(models.Student).all()
        for s in students:
            recalculate_student_score(s.id, db)
    except Exception as e:
        print("migrate_student_scores notice:", e)


def normalize_stored_video_urls(db: Session):
    try:
        topics = db.query(models.Topic).all()
        updated_count = 0
        for t in topics:
            if t.video_url and ("localhost" in t.video_url or "127.0.0.1" in t.video_url):
                new_url = sanitize_stored_media_url(t.video_url)
                if new_url != t.video_url:
                    t.video_url = new_url
                    updated_count += 1
            if t.content and ("localhost" in t.content or "127.0.0.1" in t.content):
                new_content = re.sub(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/uploads/[^\s\"'>]+)", r"\1", t.content)
                if new_content != t.content:
                    t.content = new_content
                    updated_count += 1
        if updated_count > 0:
            db.commit()
            print(f"[MIGRATION] Successfully normalized {updated_count} topic video/content URLs.")
    except Exception as e:
        print("[MIGRATION] Error normalizing video URLs:", e)


def init_db(db: Session):
    models.Base.metadata.create_all(bind=engine)
    ensure_quiz_attempts_columns()
    settings = db.query(models.Settings).first()
    if not settings:
        default_settings = models.Settings(
            name="Jasur O'qituvchi",
            email="jasur@qecschool.uz",
            password="admin", # Default password for teacher
            avatar_url="https://placehold.co/100x100/6366f1/ffffff?text=Teacher",
            logo_url="/uploads/logo_qec_school.webp",
            theme="light"
        )
        db.add(default_settings)
        db.commit()
    elif settings and ("text=EM" in (settings.logo_url or "") or not settings.logo_url):
        settings.logo_url = "/uploads/logo_qec_school.webp"
        db.commit()


@app.on_event("startup")
def startup_event():
    import logging
    max_retries = 5
    for attempt in range(max_retries):
        try:
            db = SessionLocal()
            try:
                init_db(db)
                seed_from_template_if_empty(db)
                normalize_stored_video_urls(db)
                migrate_student_scores(db)
                settings = db.query(models.Settings).first()
                if settings and not settings.password.startswith(PASSWORD_PREFIX):
                    settings.password = hash_password(
                        INITIAL_ADMIN_PASSWORD or settings.password
                    )
                    db.commit()
                elif settings and INITIAL_ADMIN_PASSWORD and os.getenv("OVERWRITE_ADMIN_PASSWORD", "false").lower() in ("true", "1", "yes"):
                    settings.password = hash_password(INITIAL_ADMIN_PASSWORD)
                    db.commit()
                break
            finally:
                db.close()
        except Exception as exc:
            logging.warning(f"Database init attempt {attempt + 1}/{max_retries} failed: {exc}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                logging.error("Database initialization failed after retries.")


@app.get("/health")
def health_check():
    return {"status": "ok"}

# ========================================
# AUTH ENDPOINTS
# ========================================

@app.post("/api/auth/login")
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    settings = db.query(models.Settings).first()
    if settings and login_data.username in {"admin", settings.email}:
        valid, legacy_password = verify_password(login_data.password, settings.password)
        if not valid:
            defaults = {"admin", "Admin123456!"}
            if INITIAL_ADMIN_PASSWORD:
                defaults.add(INITIAL_ADMIN_PASSWORD)
            if login_data.password in defaults:
                for default_pwd in defaults:
                    if verify_password(default_pwd, settings.password)[0]:
                        valid = True
                        legacy_password = True
                        break
        if valid:
            if legacy_password:
                settings.password = hash_password(login_data.password)
                db.commit()
            return {
                "role": "teacher",
                "id": 1,
                "name": settings.name,
                "access_token": create_access_token("teacher", 1),
            }

    student = db.query(models.Student).filter(
        models.Student.username == login_data.username
    ).first()
    if student:
        valid, legacy_password = verify_password(login_data.password, student.password)
        if valid:
            if legacy_password:
                student.password = hash_password(login_data.password)
                db.commit()
            return {
                "role": "student",
                "id": student.id,
                "name": student.name,
                "access_token": create_access_token("student", student.id),
            }

    raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri")

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    _teacher: dict = Depends(require_teacher),
):
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/ogg": ".ogv",
    }
    extension = allowed_types.get(file.content_type)
    if not extension:
        raise HTTPException(status_code=415, detail="Bu fayl turi qo'llab-quvvatlanmaydi")

    filename = f"{uuid.uuid4().hex}{extension}"
    file_path = UPLOADS_DIR / filename
    total_bytes = 0
    max_bytes = 100 * 1024 * 1024
    succeeded = False
    try:
        with file_path.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise HTTPException(status_code=413, detail="Fayl hajmi 100 MB dan oshmasligi kerak")
                output.write(chunk)
        succeeded = True
    finally:
        if not succeeded:
            file_path.unlink(missing_ok=True)
        await file.close()

    return {"url": f"/uploads/{filename}"}

# ========================================
# TEACHER PANEL ENDPOINTS
# ========================================

@app.get("/api/teacher/settings", response_model=schemas.Settings, dependencies=[Depends(require_teacher)])
def get_settings(db: Session = Depends(get_db)):
    return db.query(models.Settings).first()

@app.put("/api/teacher/settings", response_model=schemas.Settings, dependencies=[Depends(require_teacher)])
def update_settings(settings: schemas.SettingsBase, db: Session = Depends(get_db)):
    db_settings = db.query(models.Settings).first()
    if not db_settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    db_settings.name = settings.name
    db_settings.email = settings.email
    db_settings.avatar_url = settings.avatar_url
    db_settings.logo_url = settings.logo_url
    db_settings.theme = settings.theme
    
    db.commit()
    db.refresh(db_settings)
    return db_settings


@app.put("/api/teacher/password", dependencies=[Depends(require_teacher)])
def update_teacher_password(
    password_change: schemas.TeacherPasswordChange,
    db: Session = Depends(get_db),
):
    settings = db.query(models.Settings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    valid, _legacy_password = verify_password(
        password_change.current_password, settings.password
    )
    if not valid:
        raise HTTPException(status_code=400, detail="Amaldagi parol noto'g'ri")

    settings.password = hash_password(password_change.new_password)
    db.commit()
    return {"message": "Parol muvaffaqiyatli yangilandi"}


@app.get("/api/teacher/dashboard", dependencies=[Depends(require_teacher)])
def get_dashboard(db: Session = Depends(get_db)):
    total_students = db.query(models.Student).count()
    active_groups = db.query(models.Group).count()
    total_blocks = db.query(models.Block).count()
    
    students = db.query(models.Student).all()
    avg_score = sum(s.score for s in students) / len(students) if students else 0

    return {
        "students": total_students,
        "groups": active_groups,
        "blocks": total_blocks,
        "avg_score": round(avg_score, 1)
    }

@app.get("/api/teacher/blocks", response_model=List[schemas.Block], dependencies=[Depends(require_teacher)])
def get_blocks(db: Session = Depends(get_db)):
    return db.query(models.Block).order_by(models.Block.id.desc()).all()

@app.post("/api/teacher/blocks", response_model=schemas.Block, dependencies=[Depends(require_teacher)])
def create_block(block: schemas.BlockCreate, db: Session = Depends(get_db)):
    db_block = models.Block(
        title=block.title,
        category=block.category,
        desc=block.desc,
        badge=block.badge,
        badge_class=block.badge_class
    )
    
    # Assign to groups
    if block.group_ids:
        groups = db.query(models.Group).filter(models.Group.id.in_(block.group_ids)).all()
        db_block.groups = groups

    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block

@app.get("/api/teacher/blocks/{block_id}", response_model=schemas.Block, dependencies=[Depends(require_teacher)])
def get_block_by_id(block_id: int, db: Session = Depends(get_db)):
    db_block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    return db_block

@app.put("/api/teacher/blocks/{block_id}", response_model=schemas.Block, dependencies=[Depends(require_teacher)])
def update_block(block_id: int, block_data: schemas.BlockUpdate, db: Session = Depends(get_db)):
    db_block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    if block_data.title is not None:
        db_block.title = block_data.title
    if block_data.category is not None:
        db_block.category = block_data.category
        if block_data.badge is None:
            db_block.badge = block_data.category
    if block_data.desc is not None:
        db_block.desc = block_data.desc
    if block_data.badge is not None:
        db_block.badge = block_data.badge
    if block_data.badge_class is not None:
        db_block.badge_class = block_data.badge_class
        
    if block_data.group_ids is not None:
        groups = db.query(models.Group).filter(models.Group.id.in_(block_data.group_ids)).all()
        db_block.groups = groups

    db.commit()
    db.refresh(db_block)
    return db_block

@app.put("/api/teacher/blocks/{block_id}/reorder", dependencies=[Depends(require_teacher)])
def reorder_block_topics(block_id: int, reorder_data: schemas.BlockTopicsReorder, db: Session = Depends(get_db)):
    for item in reorder_data.topics:
        db.query(models.Topic).filter(
            models.Topic.id == item.id,
            models.Topic.block_id == block_id
        ).update({"order_index": item.order_index})
    db.commit()
    return {"message": "Topics reordered successfully"}

@app.delete("/api/teacher/blocks/{block_id}", dependencies=[Depends(require_teacher)])
def delete_block(block_id: int, db: Session = Depends(get_db)):
    db_block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    topic_ids = [t.id for t in db_block.topics_list]
    if topic_ids:
        db.query(models.QuizAttempt).filter(models.QuizAttempt.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(models.LessonCompletion).filter(models.LessonCompletion.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(models.Topic).filter(models.Topic.id.in_(topic_ids)).delete(synchronize_session=False)
    db.delete(db_block)
    db.commit()
    return {"message": "Block deleted successfully"}

@app.get("/api/teacher/groups", response_model=List[schemas.Group], dependencies=[Depends(require_teacher)])
def get_groups(db: Session = Depends(get_db)):
    return db.query(models.Group).all()

@app.post("/api/teacher/groups", response_model=schemas.Group, dependencies=[Depends(require_teacher)])
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    db_group = models.Group(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@app.put("/api/teacher/groups/{group_id}", response_model=schemas.Group, dependencies=[Depends(require_teacher)])
def update_group(group_id: int, group_data: schemas.GroupUpdate, db: Session = Depends(get_db)):
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group_data.name is not None:
        db_group.name = group_data.name
    if group_data.desc is not None:
        db_group.desc = group_data.desc
    db.commit()
    db.refresh(db_group)
    return db_group

@app.delete("/api/teacher/groups/{group_id}", dependencies=[Depends(require_teacher)])
def delete_group(group_id: int, db: Session = Depends(get_db)):
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    student_ids = [s.id for s in db_group.students]
    if student_ids:
        db.query(models.QuizAttempt).filter(models.QuizAttempt.student_id.in_(student_ids)).delete(synchronize_session=False)
        db.query(models.LessonCompletion).filter(models.LessonCompletion.student_id.in_(student_ids)).delete(synchronize_session=False)
        db.query(models.Student).filter(models.Student.id.in_(student_ids)).delete(synchronize_session=False)
    db.delete(db_group)
    db.commit()
    return {"message": "Group deleted successfully"}

@app.get("/api/teacher/students", response_model=List[schemas.StudentDetail], dependencies=[Depends(require_teacher)])
def get_all_students(db: Session = Depends(get_db)):
    students = db.query(models.Student).order_by(models.Student.id.desc()).all()
    result = []
    for s in students:
        result.append({
            "id": s.id,
            "name": s.name,
            "initials": s.initials,
            "username": s.username,
            "color": s.color,
            "score": s.score,
            "group_id": s.group_id,
            "group_name": s.group.name if s.group else "Guruhsiz"
        })
    return result

@app.post("/api/teacher/students", response_model=schemas.StudentDetail, dependencies=[Depends(require_teacher)])
def create_student_global(student: schemas.StudentCreateWithGroup, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == student.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    
    existing = db.query(models.Student).filter(models.Student.username == student.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ushbu login allaqachon band")
        
    student_data = student.model_dump()
    student_data["password"] = hash_password(student_data["password"])
    db_student = models.Student(**student_data)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return {
        "id": db_student.id,
        "name": db_student.name,
        "initials": db_student.initials,
        "username": db_student.username,
        "color": db_student.color,
        "score": db_student.score,
        "group_id": db_student.group_id,
        "group_name": group.name
    }

@app.post("/api/teacher/groups/{group_id}/students", response_model=schemas.Student, dependencies=[Depends(require_teacher)])
def create_student_in_group(group_id: int, student: schemas.StudentCreate, db: Session = Depends(get_db)):
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # check if username exists
    existing = db.query(models.Student).filter(models.Student.username == student.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ushbu login allaqachon band")

    student_data = student.model_dump()
    student_data["password"] = hash_password(student_data["password"])
    db_student = models.Student(**student_data, group_id=group_id)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@app.put("/api/teacher/students/{student_id}", response_model=schemas.StudentDetail, dependencies=[Depends(require_teacher)])
def update_student_credentials(student_id: int, update_data: schemas.StudentUpdate, db: Session = Depends(get_db)):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if update_data.username and update_data.username != db_student.username:
        existing = db.query(models.Student).filter(models.Student.username == update_data.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ushbu login band")
        db_student.username = update_data.username

    if update_data.name:
        db_student.name = update_data.name
        db_student.initials = "".join([part[0] for part in update_data.name.split() if part])[:2].upper() or "ST"

    if update_data.password and update_data.password.strip():
        if len(update_data.password) < 8:
            raise HTTPException(status_code=400, detail="Parol kamida 8 ta belgidan iborat bo'lishi kerak")
        db_student.password = hash_password(update_data.password)

    if update_data.group_id is not None and update_data.group_id != db_student.group_id:
        group = db.query(models.Group).filter(models.Group.id == update_data.group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Tanlangan guruh topilmadi")
        db_student.group_id = update_data.group_id

    db.commit()
    db.refresh(db_student)
    return {
        "id": db_student.id,
        "name": db_student.name,
        "initials": db_student.initials,
        "username": db_student.username,
        "color": db_student.color,
        "score": db_student.score,
        "group_id": db_student.group_id,
        "group_name": db_student.group.name if db_student.group else "Guruhsiz"
    }

@app.delete("/api/teacher/students/{student_id}", dependencies=[Depends(require_teacher)])
def delete_student(student_id: int, db: Session = Depends(get_db)):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    # Clean up student quiz attempts, answers, lesson completions
    db.query(models.QuizAttempt).filter(models.QuizAttempt.student_id == student_id).delete()
    db.query(models.LessonCompletion).filter(models.LessonCompletion.student_id == student_id).delete()
    db.delete(db_student)
    db.commit()
    return {"message": "Student deleted successfully"}

@app.get("/api/teacher/results", dependencies=[Depends(require_teacher)])
def get_results(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return get_leaderboard_data(db, group_id)


# ========================================
# STUDENT PANEL ENDPOINTS
# ========================================

@app.get("/api/results/leaderboard")
def get_leaderboard(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    return get_leaderboard_data(db, group_id)

@app.get("/api/student/{student_id}/dashboard")
def get_student_dashboard(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    authorize_student(student_id, current_user)
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    group = student.group
    blocks_count = len(group.blocks) if group else 0

    global_board = get_leaderboard_data(db)
    student_entry = next((s for s in global_board if s["id"] == student.id), None)
    global_rank = student_entry["rank"] if student_entry else 1

    group_rank = 1
    if student.group_id:
        group_board = [s for s in global_board if s["group_id"] == student.group_id]
        for g_idx, g_item in enumerate(group_board, start=1):
            if g_item["id"] == student.id:
                group_rank = g_idx
                break

    stats = get_student_stats(student.id, db)
    level_info = get_student_level_info(student.score)

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "initials": student.initials,
            "color": student.color,
            "score": student.score,
            "group_id": student.group_id,
            "group_name": group.name if group else "Noma'lum"
        },
        "stats": {
            "active_blocks": blocks_count,
            "completed_tasks": stats["total_completed"],
            "completed_lessons": stats["completed_lessons"],
            "completed_quizzes": stats["completed_quizzes"],
            "accuracy_pct": stats["accuracy_pct"],
            "total_score": student.score,
            "rank": global_rank,
            "group_rank": group_rank,
            "total_students": len(global_board),
        },
        "level_info": level_info
    }

@app.get("/api/student/{student_id}/blocks", response_model=List[schemas.Block])
def get_student_blocks(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    authorize_student(student_id, current_user)
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if not student.group:
        return []
        
    return [
        {
            "id": block.id,
            "title": block.title,
            "category": block.category,
            "desc": block.desc,
            "topics": block.topics,
            "badge": block.badge,
            "badge_class": block.badge_class,
            "groups": [],
            "topics_list": [],
        }
        for block in student.group.blocks
    ]

# ========================================
# TOPIC ENDPOINTS (SHARED & TEACHER)
# ========================================

@app.get("/api/blocks/{block_id}/topics", response_model=List[schemas.Topic])
def get_topics_for_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    authorize_block(block, current_user, db)
    topics = db.query(models.Topic).filter(
        models.Topic.block_id == block_id
    ).order_by(models.Topic.order_index).all()
    if current_user["role"] == "teacher":
        for t in topics:
            if t.video_url:
                t.video_url = sanitize_stored_media_url(t.video_url)
            if t.content:
                t.content = re.sub(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/uploads/[^\s\"'>]+)", r"\1", t.content)
        return topics

    student_id = current_user["sub"]
    topic_ids = [t.id for t in topics]
    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student_id,
        models.QuizAttempt.topic_id.in_(topic_ids)
    ).all()
    attempts_by_topic = {a.topic_id: a for a in attempts}

    completions = db.query(models.LessonCompletion).filter(
        models.LessonCompletion.student_id == student_id,
        models.LessonCompletion.topic_id.in_(topic_ids)
    ).all()
    completed_lesson_topic_ids = {c.topic_id for c in completions}

    result = []
    blocking_topic = None
    blocking_reason = None

    for t in topics:
        is_lesson_done = t.id in completed_lesson_topic_ids
        payload = student_topic_payload(t, student_id, db, attempts_by_topic.get(t.id), is_lesson_completed=is_lesson_done)
        if blocking_topic is not None:
            payload["is_locked"] = True
            payload["locked_reason"] = blocking_reason
        else:
            payload["is_locked"] = False
            payload["locked_reason"] = None

        result.append(payload)

        # Check if topic t is completed to decide whether future topics are blocked
        if t.item_type == "quiz":
            req_pct = t.passing_score if t.passing_score is not None else 70
            att = attempts_by_topic.get(t.id)
            is_passed = False
            user_pct = 0
            if att and att.total_questions > 0:
                user_pct = round((att.best_score / att.total_questions) * 100)
                if user_pct >= req_pct:
                    is_passed = True
            if not is_passed and blocking_topic is None:
                blocking_topic = t
                if att and att.total_questions > 0:
                    blocking_reason = (
                        f"Ushbu darsga o'tish uchun avval «{t.title}» testidan "
                        f"kamida {req_pct}% to'plashingiz kerak (Sizning natijangiz: {user_pct}%)."
                    )
                else:
                    blocking_reason = (
                        f"Ushbu darsga o'tish uchun avval «{t.title}» testini "
                        f"kamida {req_pct}% natija bilan topshirishingiz shart."
                    )
        else:
            if not is_lesson_done and blocking_topic is None:
                blocking_topic = t
                blocking_reason = (
                    f"Ushbu darsga o'tish uchun avval «{t.title.strip()}» mavzusini o'qib, "
                    f"'Mavzuni o'qidim' tugmasini bosishingiz kerak."
                )

    return result

@app.get("/api/topics/{topic_id}", response_model=schemas.Topic)
def get_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    db_topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not db_topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    authorize_block(db_topic.block, current_user, db)
    if current_user["role"] == "teacher":
        return db_topic

    topics_in_block = db.query(models.Topic).filter(
        models.Topic.block_id == db_topic.block_id
    ).order_by(models.Topic.order_index).all()
    student_id = current_user["sub"]
    topic_ids = [t.id for t in topics_in_block]

    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student_id,
        models.QuizAttempt.topic_id.in_(topic_ids)
    ).all()
    attempts_by_topic = {a.topic_id: a for a in attempts}

    completions = db.query(models.LessonCompletion).filter(
        models.LessonCompletion.student_id == student_id,
        models.LessonCompletion.topic_id.in_(topic_ids)
    ).all()
    completed_lesson_topic_ids = {c.topic_id for c in completions}

    blocking_topic = None
    blocking_reason = None

    for t in topics_in_block:
        is_lesson_done = t.id in completed_lesson_topic_ids
        if t.id == db_topic.id:
            payload = student_topic_payload(
                db_topic, student_id, db, attempts_by_topic.get(db_topic.id),
                is_lesson_completed=is_lesson_done
            )
            if blocking_topic is not None:
                payload["is_locked"] = True
                payload["locked_reason"] = blocking_reason
                raise HTTPException(status_code=403, detail=blocking_reason)
            else:
                payload["is_locked"] = False
                payload["locked_reason"] = None
                return payload

        if t.item_type == "quiz":
            req_pct = t.passing_score if t.passing_score is not None else 70
            att = attempts_by_topic.get(t.id)
            is_passed = False
            user_pct = 0
            if att and att.total_questions > 0:
                user_pct = round((att.best_score / att.total_questions) * 100)
                if user_pct >= req_pct:
                    is_passed = True
            if not is_passed and blocking_topic is None:
                blocking_topic = t
                if att and att.total_questions > 0:
                    blocking_reason = (
                        f"Ushbu darsga o'tish uchun avval «{t.title}» testidan "
                        f"kamida {req_pct}% to'plashingiz kerak (Sizning natijangiz: {user_pct}%)."
                    )
                else:
                    blocking_reason = (
                        f"Ushbu darsga o'tish uchun avval «{t.title}» testini "
                        f"kamida {req_pct}% natija bilan topshirishingiz shart."
                    )
        else:
            if not is_lesson_done and blocking_topic is None:
                blocking_topic = t
                blocking_reason = (
                    f"Ushbu darsga o'tish uchun avval «{t.title.strip()}» mavzusini o'qib, "
                    f"'Mavzuni o'qidim' tugmasini bosishingiz kerak."
                )

    return student_topic_payload(
        db_topic, student_id, db, attempts_by_topic.get(db_topic.id),
        is_lesson_completed=(db_topic.id in completed_lesson_topic_ids)
    )


@app.post("/api/student/topics/{topic_id}/complete")
def complete_lesson(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar darsni yakunlashi mumkin")
    
    student_id = current_user["sub"]
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    authorize_block(topic.block, current_user, db)

    if topic.item_type == "quiz":
        raise HTTPException(
            status_code=400,
            detail="Faqat dars mavzularini yakunlash mumkin. Testlarni topshirish orqali yakunlang."
        )

    # Check if this topic itself is currently locked for student
    topics_in_block = db.query(models.Topic).filter(
        models.Topic.block_id == topic.block_id
    ).order_by(models.Topic.order_index).all()
    topic_ids = [t.id for t in topics_in_block]

    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student_id,
        models.QuizAttempt.topic_id.in_(topic_ids)
    ).all()
    attempts_by_topic = {a.topic_id: a for a in attempts}

    completions = db.query(models.LessonCompletion).filter(
        models.LessonCompletion.student_id == student_id,
        models.LessonCompletion.topic_id.in_(topic_ids)
    ).all()
    completed_lesson_topic_ids = {c.topic_id for c in completions}

    for t in topics_in_block:
        if t.id == topic.id:
            break
        if t.item_type == "quiz":
            req_pct = t.passing_score if t.passing_score is not None else 70
            att = attempts_by_topic.get(t.id)
            if not att or att.total_questions == 0 or round((att.best_score / att.total_questions) * 100) < req_pct:
                raise HTTPException(status_code=403, detail=f"Avval «{t.title.strip()}» testidan o'tishingiz kerak.")
        else:
            if t.id not in completed_lesson_topic_ids:
                raise HTTPException(status_code=403, detail=f"Avval «{t.title.strip()}» mavzusini o'qib tasdiqlashingiz kerak.")

    # Record completion if not exists
    existing = db.query(models.LessonCompletion).filter(
        models.LessonCompletion.student_id == student_id,
        models.LessonCompletion.topic_id == topic_id
    ).first()

    if not existing:
        comp = models.LessonCompletion(
            student_id=student_id,
            topic_id=topic_id,
            completed_at=datetime.utcnow(),
        )
        db.add(comp)
        db.commit()
        recalculate_student_score(student_id, db)

    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    new_total = student.score if student else 0
    level_info = get_student_level_info(new_total)

    return {
        "message": "Mavzu muvaffaqiyatli yakunlandi! +20 XP berildi.",
        "completed": True,
        "earned_xp": 20,
        "total_score": new_total,
        "level_info": level_info
    }


@app.post("/api/student/topics/{topic_id}/attempts")
def submit_quiz_attempt(
    topic_id: int,
    submission: schemas.QuizSubmission,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Testni faqat o'quvchi topshirishi mumkin")
    if len(submission.answers) > 100:
        raise HTTPException(status_code=413, detail="Javoblar hajmi juda katta")
    if len(json.dumps(submission.answers, ensure_ascii=False)) > 100_000:
        raise HTTPException(status_code=413, detail="Javoblar hajmi juda katta")

    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if topic.item_type != "quiz" or not topic.quiz_data:
        raise HTTPException(status_code=400, detail="Bu mavzuda topshiriladigan test yo'q")
    authorize_block(topic.block, current_user, db)

    student = db.query(models.Student).filter(
        models.Student.id == current_user["sub"]
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify that this quiz is not locked for the student
    topics_in_block = db.query(models.Topic).filter(
        models.Topic.block_id == topic.block_id
    ).order_by(models.Topic.order_index).all()
    topic_ids = [t.id for t in topics_in_block]

    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student.id,
        models.QuizAttempt.topic_id.in_(topic_ids)
    ).all()
    attempts_by_topic = {a.topic_id: a for a in attempts}

    completions = db.query(models.LessonCompletion).filter(
        models.LessonCompletion.student_id == student.id,
        models.LessonCompletion.topic_id.in_(topic_ids)
    ).all()
    completed_lesson_topic_ids = {c.topic_id for c in completions}

    for t in topics_in_block:
        if t.id == topic.id:
            break
        if t.item_type == "quiz":
            req_pct = t.passing_score if t.passing_score is not None else 70
            att = attempts_by_topic.get(t.id)
            if not att or att.total_questions == 0 or round((att.best_score / att.total_questions) * 100) < req_pct:
                raise HTTPException(status_code=403, detail=f"Avval «{t.title}» testidan o'tishingiz kerak.")
        else:
            if t.id not in completed_lesson_topic_ids:
                raise HTTPException(status_code=403, detail=f"Avval «{t.title}» mavzusini yakunlashingiz kerak.")

    existing_attempt = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student.id,
        models.QuizAttempt.topic_id == topic.id,
    ).first()
    if existing_attempt is not None:
        raise HTTPException(
            status_code=400,
            detail="Ushbu test allaqachon topshirilgan. Testni qayta ishlash imkoni mavjud emas.",
        )

    try:
        questions = parse_quiz_data(topic.quiz_data)
        question_ids = {str(question["id"]) for question in questions}
        if not set(submission.answers).issubset(question_ids):
            raise ValueError("Javoblar ushbu test savollariga mos kelmaydi")
        correct_count, result_questions = grade_quiz(
            questions,
            submission.answers,
            SECRET_KEY,
            current_user["sub"],
            topic.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    incorrect_count = max(0, len(questions) - correct_count)
    now = datetime.utcnow()
    attempt = models.QuizAttempt(
        student_id=student.id,
        topic_id=topic.id,
        best_score=correct_count,
        last_score=correct_count,
        total_questions=len(questions),
        attempt_count=1,
        answers_data=json.dumps(submission.answers, ensure_ascii=False),
        results_data=json.dumps(result_questions, ensure_ascii=False),
        created_at=now,
    )
    db.add(attempt)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ushbu test allaqachon topshirilgan.") from exc

    db.refresh(attempt)
    passing_score = topic.passing_score if topic.passing_score is not None else 70
    percentage = round((correct_count / (len(questions) or 1)) * 100)
    is_passed = percentage >= passing_score
    is_perfect = (correct_count == len(questions) and len(questions) > 0)

    # Deterministic recalculation
    total_score = recalculate_student_score(student.id, db)
    level_info = get_student_level_info(total_score)

    base_xp = correct_count * 10
    pass_bonus = 30 if is_passed else 0
    perfect_bonus = 50 if is_perfect else 0
    earned_xp = base_xp + pass_bonus + perfect_bonus

    return {
        "id": attempt.id,
        "correct": correct_count,
        "incorrect": incorrect_count,
        "total": len(questions),
        "score": correct_count,
        "best_score": correct_count,
        "percentage": percentage,
        "passing_score": passing_score,
        "is_passed": is_passed,
        "is_perfect": is_perfect,
        "earned_xp": earned_xp,
        "xp_breakdown": {
            "base_xp": base_xp,
            "pass_bonus": pass_bonus,
            "perfect_bonus": perfect_bonus,
            "total_earned": earned_xp
        },
        "total_score": total_score,
        "level_info": level_info,
        "attempt_count": 1,
        "questions": result_questions,
        "answers": submission.answers,
        "created_at": (attempt.created_at or now).isoformat(),
    }


@app.get("/api/student/my-attempts")
def get_student_attempts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")
    student_id = current_user["sub"]
    attempts = (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.student_id == student_id)
        .order_by(models.QuizAttempt.updated_at.desc())
        .all()
    )
    result = []
    for att in attempts:
        topic = att.topic
        block = topic.block if topic else None
        result.append({
            "id": att.id,
            "topic_id": att.topic_id,
            "topic_title": topic.title if topic else "Test",
            "block_id": block.id if block else None,
            "block_title": block.title if block else "—",
            "correct": att.best_score,
            "incorrect": max(0, att.total_questions - att.best_score),
            "total": att.total_questions,
            "score": att.best_score,
            "percentage": round((att.best_score / (att.total_questions or 1)) * 100),
            "created_at": (att.created_at or att.updated_at).isoformat() if (att.created_at or att.updated_at) else None,
        })
    return result


@app.get("/api/student/my-attempts/{attempt_id}")
def get_student_attempt_detail(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")
    att = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.id == attempt_id,
        models.QuizAttempt.student_id == current_user["sub"],
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="Test natijasi topilmadi")
    topic = att.topic
    block = topic.block if topic else None
    questions = json.loads(att.results_data) if att.results_data else []
    answers = json.loads(att.answers_data) if att.answers_data else {}
    return {
        "id": att.id,
        "topic_id": att.topic_id,
        "topic_title": topic.title if topic else "Test",
        "block_id": block.id if block else None,
        "block_title": block.title if block else "—",
        "correct": att.best_score,
        "incorrect": max(0, att.total_questions - att.best_score),
        "total": att.total_questions,
        "score": att.best_score,
        "percentage": round((att.best_score / (att.total_questions or 1)) * 100),
        "created_at": (att.created_at or att.updated_at).isoformat() if (att.created_at or att.updated_at) else None,
        "questions": questions,
        "answers": answers,
    }


@app.get("/api/teacher/attempts", dependencies=[Depends(require_teacher)])
def get_teacher_attempts(
    student_id: Optional[int] = None,
    group_id: Optional[int] = None,
    topic_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.QuizAttempt).join(models.Student, models.QuizAttempt.student_id == models.Student.id)
    if student_id:
        query = query.filter(models.QuizAttempt.student_id == student_id)
    if group_id:
        query = query.filter(models.Student.group_id == group_id)
    if topic_id:
        query = query.filter(models.QuizAttempt.topic_id == topic_id)

    attempts = query.order_by(models.QuizAttempt.updated_at.desc()).all()
    results = []
    for att in attempts:
        student = att.student
        group = student.group if student else None
        topic = att.topic
        block = topic.block if topic else None
        results.append({
            "id": att.id,
            "student_id": student.id if student else None,
            "student_name": student.name if student else "Noma'lum",
            "student_initials": student.initials if student else "",
            "student_color": student.color if student else "bg-indigo-100 text-indigo-600",
            "group_id": group.id if group else None,
            "group_name": group.name if group else "Noma'lum",
            "topic_id": att.topic_id,
            "topic_title": topic.title if topic else "Test",
            "block_id": block.id if block else None,
            "block_title": block.title if block else "—",
            "correct": att.best_score,
            "incorrect": max(0, att.total_questions - att.best_score),
            "total": att.total_questions,
            "score": att.best_score,
            "percentage": round((att.best_score / (att.total_questions or 1)) * 100),
            "created_at": (att.created_at or att.updated_at).isoformat() if (att.created_at or att.updated_at) else None,
        })
    return results


@app.get("/api/teacher/attempts/{attempt_id}", dependencies=[Depends(require_teacher)])
def get_teacher_attempt_detail(
    attempt_id: int,
    db: Session = Depends(get_db),
):
    att = db.query(models.QuizAttempt).filter(models.QuizAttempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Test natijasi topilmadi")
    student = att.student
    group = student.group if student else None
    topic = att.topic
    block = topic.block if topic else None
    questions = json.loads(att.results_data) if att.results_data else []
    answers = json.loads(att.answers_data) if att.answers_data else {}
    return {
        "id": att.id,
        "student_id": student.id if student else None,
        "student_name": student.name if student else "Noma'lum",
        "student_initials": student.initials if student else "",
        "student_color": student.color if student else "bg-indigo-100 text-indigo-600",
        "group_name": group.name if group else "Noma'lum",
        "topic_id": att.topic_id,
        "topic_title": topic.title if topic else "Test",
        "block_title": block.title if block else "—",
        "correct": att.best_score,
        "incorrect": max(0, att.total_questions - att.best_score),
        "total": att.total_questions,
        "score": att.best_score,
        "percentage": round((att.best_score / (att.total_questions or 1)) * 100),
        "created_at": (att.created_at or att.updated_at).isoformat() if (att.created_at or att.updated_at) else None,
        "questions": questions,
        "answers": answers,
    }


@app.delete("/api/teacher/attempts/{attempt_id}", dependencies=[Depends(require_teacher)])
def delete_teacher_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
):
    att = db.query(models.QuizAttempt).filter(models.QuizAttempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Test natijasi topilmadi")
    student_id = att.student_id
    db.delete(att)
    db.commit()
    if student_id:
        recalculate_student_score(student_id, db)
    return {"message": "Test natijasi bekor qilindi. O'quvchi testni qayta topshirishi mumkin."}


@app.post("/api/teacher/blocks/{block_id}/topics", response_model=schemas.Topic, dependencies=[Depends(require_teacher)])
def create_topic(block_id: int, topic: schemas.TopicCreate, db: Session = Depends(get_db)):
    block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    topic_data = topic.dict()
    if topic_data.get("video_url"):
        topic_data["video_url"] = sanitize_stored_media_url(topic_data["video_url"])
    if topic_data.get("content"):
        topic_data["content"] = re.sub(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/uploads/[^\s\"'>]+)", r"\1", topic_data["content"])

    db_topic = models.Topic(
        **topic_data,
        block_id=block_id
    )
    db.add(db_topic)
    
    # Update block's topic count
    block.topics = db.query(models.Topic).filter(models.Topic.block_id == block_id).count() + 1
    
    db.commit()
    db.refresh(db_topic)
    return db_topic

@app.put("/api/teacher/topics/{topic_id}", response_model=schemas.Topic, dependencies=[Depends(require_teacher)])
def update_topic(topic_id: int, topic: schemas.TopicCreate, db: Session = Depends(get_db)):
    db_topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not db_topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    topic_data = topic.dict()
    if topic_data.get("video_url"):
        topic_data["video_url"] = sanitize_stored_media_url(topic_data["video_url"])
    if topic_data.get("content"):
        topic_data["content"] = re.sub(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/uploads/[^\s\"'>]+)", r"\1", topic_data["content"])

    for key, value in topic_data.items():
        setattr(db_topic, key, value)
        
    db.commit()
    db.refresh(db_topic)
    return db_topic

@app.delete("/api/teacher/topics/{topic_id}", dependencies=[Depends(require_teacher)])
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    db_topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not db_topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    block = db_topic.block
    db.query(models.QuizAttempt).filter(models.QuizAttempt.topic_id == topic_id).delete(synchronize_session=False)
    db.query(models.LessonCompletion).filter(models.LessonCompletion.topic_id == topic_id).delete(synchronize_session=False)
    db.delete(db_topic)
    
    if block:
        block.topics = max(0, db.query(models.Topic).filter(models.Topic.block_id == block.id).count())
        
    db.commit()
    return {"message": "Topic deleted"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
