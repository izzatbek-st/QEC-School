import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import uuid
from pathlib import Path
from typing import List

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import models, schemas
from database import SessionLocal, engine, get_db
from quizzes import grade_quiz, parse_quiz_data, public_quiz_data

models.Base.metadata.create_all(bind=engine)

production = os.getenv("APP_ENV", "development").lower() == "production"
secret_key = os.getenv("APP_SECRET_KEY")
if production and not secret_key:
    import logging
    logging.warning(
        "WARNING: APP_SECRET_KEY is not set in production. Generated a temporary key. "
        "Set APP_SECRET_KEY in Render environment variables to preserve login sessions across restarts."
    )
    secret_key = secrets.token_urlsafe(48)
elif secret_key and len(secret_key) < 32:
    raise RuntimeError("APP_SECRET_KEY must contain at least 32 characters")

SECRET_KEY = (secret_key or secrets.token_urlsafe(48)).encode("utf-8")
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
    title="EduMaster API",
    docs_url=None if production else "/docs",
    redoc_url=None if production else "/redoc",
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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


def student_topic_payload(topic: models.Topic, student_id: int) -> dict:
    payload = {
        "id": topic.id,
        "block_id": topic.block_id,
        "title": topic.title,
        "video_url": topic.video_url,
        "content": topic.content,
        "order_index": topic.order_index,
        "item_type": topic.item_type,
        "quiz_data": topic.quiz_data,
    }
    if topic.item_type == "quiz":
        try:
            questions = parse_quiz_data(topic.quiz_data)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        payload["quiz_data"] = public_quiz_data(
            questions, SECRET_KEY, student_id, topic.id
        )
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
            db.add(models.Topic(
                id=row[0], block_id=row[1], title=row[2], video_url=row[3],
                content=row[4], order_index=row[5], item_type=row[6], quiz_data=row[7]
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


def init_db(db: Session):
    settings = db.query(models.Settings).first()
    if not settings:
        default_settings = models.Settings(
            name="Jasur O'qituvchi",
            email="jasur@edumaster.uz",
            password="admin", # Default password for teacher
            avatar_url="https://placehold.co/100x100/6366f1/ffffff?text=Teacher",
            logo_url="https://placehold.co/100x100/6366f1/ffffff?text=EM",
            theme="light"
        )
        db.add(default_settings)
        db.commit()


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        init_db(db)
        seed_from_template_if_empty(db)
        settings = db.query(models.Settings).first()
        if not settings.password.startswith(PASSWORD_PREFIX):
            if production and not INITIAL_ADMIN_PASSWORD:
                raise RuntimeError(
                    "Set INITIAL_ADMIN_PASSWORD to migrate the existing administrator account"
                )
            settings.password = hash_password(
                INITIAL_ADMIN_PASSWORD or settings.password
            )
            db.commit()
        elif INITIAL_ADMIN_PASSWORD and os.getenv("OVERWRITE_ADMIN_PASSWORD", "false").lower() in ("true", "1", "yes"):
            settings.password = hash_password(INITIAL_ADMIN_PASSWORD)
            db.commit()
    finally:
        db.close()


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

@app.delete("/api/teacher/blocks/{block_id}", dependencies=[Depends(require_teacher)])
def delete_block(block_id: int, db: Session = Depends(get_db)):
    db_block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
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

@app.put("/api/teacher/students/{student_id}", response_model=schemas.Student, dependencies=[Depends(require_teacher)])
def update_student_credentials(student_id: int, update_data: schemas.StudentUpdate, db: Session = Depends(get_db)):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if update_data.username != db_student.username:
        existing = db.query(models.Student).filter(models.Student.username == update_data.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ushbu login band")

    db_student.username = update_data.username
    db_student.password = hash_password(update_data.password)
    db.commit()
    db.refresh(db_student)
    return db_student

@app.get("/api/teacher/results", response_model=List[schemas.Student], dependencies=[Depends(require_teacher)])
def get_results(db: Session = Depends(get_db)):
    return db.query(models.Student).order_by(models.Student.score.desc()).all()


# ========================================
# STUDENT PANEL ENDPOINTS
# ========================================

@app.get("/api/results/leaderboard")
def get_leaderboard(
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    students = db.query(models.Student).order_by(models.Student.score.desc()).all()
    result = []
    for s in students:
        group_name = s.group.name if s.group else "Noma'lum"
        result.append({
            "id": s.id,
            "name": s.name,
            "initials": s.initials,
            "color": s.color,
            "score": s.score,
            "group_name": group_name
        })
    return result

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
    completed_tasks = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student_id
    ).count()
    rank = db.query(models.Student).filter(
        models.Student.score > student.score
    ).count() + 1
    
    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "score": student.score,
            "group_name": group.name if group else "Noma'lum"
        },
        "stats": {
            "active_blocks": blocks_count,
            "completed_tasks": completed_tasks,
            "total_score": student.score,
            "rank": rank
        }
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
    if current_user["role"] == "student":
        return [student_topic_payload(topic, current_user["sub"]) for topic in topics]
    return topics

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
    if current_user["role"] == "student":
        return student_topic_payload(db_topic, current_user["sub"])
    return db_topic


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

    student = db.query(models.Student).filter(
        models.Student.id == current_user["sub"]
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    attempt = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == student.id,
        models.QuizAttempt.topic_id == topic.id,
    ).first()
    if attempt is None:
        attempt = models.QuizAttempt(
            student_id=student.id,
            topic_id=topic.id,
            best_score=correct_count,
            last_score=correct_count,
            total_questions=len(questions),
            attempt_count=1,
        )
        student.score += correct_count
        db.add(attempt)
    else:
        previous_best = attempt.best_score
        if attempt.total_questions != len(questions):
            attempt.best_score = correct_count
            student.score += correct_count - previous_best
        elif correct_count > previous_best:
            attempt.best_score = correct_count
            student.score += correct_count - previous_best
        attempt.last_score = correct_count
        attempt.total_questions = len(questions)
        attempt.attempt_count += 1

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Natija parallel ravishda saqlandi; sahifani yangilang") from exc

    db.refresh(attempt)
    return {
        "correct": correct_count,
        "total": len(questions),
        "best_score": attempt.best_score,
        "attempt_count": attempt.attempt_count,
        "questions": result_questions,
    }

@app.post("/api/teacher/blocks/{block_id}/topics", response_model=schemas.Topic, dependencies=[Depends(require_teacher)])
def create_topic(block_id: int, topic: schemas.TopicCreate, db: Session = Depends(get_db)):
    block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    db_topic = models.Topic(
        **topic.dict(),
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
    
    for key, value in topic.dict().items():
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
    db.delete(db_topic)
    
    if block:
        block.topics = max(0, db.query(models.Topic).filter(models.Topic.block_id == block.id).count() - 1)
        
    db.commit()
    return {"message": "Topic deleted"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
