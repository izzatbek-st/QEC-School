from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, Table, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

block_group_association = Table(
    'block_group',
    Base.metadata,
    Column('block_id', Integer, ForeignKey('blocks.id')),
    Column('group_id', Integer, ForeignKey('groups.id'))
)

class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Jasur O'qituvchi")
    email = Column(String, default="jasur@qecschool.uz")
    password = Column(String, nullable=False, default="")
    avatar_url = Column(String, default="https://placehold.co/100x100/6366f1/ffffff?text=Teacher")
    logo_url = Column(String, default="/uploads/logo_qec_school.webp")
    theme = Column(String, default="light")

class Block(Base):
    __tablename__ = "blocks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    category = Column(String)
    desc = Column(String)
    topics = Column(Integer, default=0)
    badge = Column(String)
    badge_class = Column(String)
    
    topics_list = relationship("Topic", back_populates="block", cascade="all, delete-orphan")
    groups = relationship("Group", secondary=block_group_association, back_populates="blocks")

class Topic(Base):
    __tablename__ = "topics"
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"))
    title = Column(String, index=True)
    video_url = Column(String, nullable=True)
    content = Column(String)
    order_index = Column(Integer, default=0)
    
    item_type = Column(String, default="lesson")
    quiz_data = Column(String, nullable=True)
    passing_score = Column(Integer, default=70)

    block = relationship("Block", back_populates="topics_list")

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    desc = Column(String)
    
    students = relationship("Student", back_populates="group")
    blocks = relationship("Block", secondary=block_group_association, back_populates="groups")

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    initials = Column(String)
    username = Column(String, unique=True, index=True)
    password = Column(String, nullable=False)
    color = Column(String, default="bg-indigo-100 text-indigo-600")
    group_id = Column(Integer, ForeignKey("groups.id"))
    score = Column(Integer, default=0)

    group = relationship("Group", back_populates="students")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        UniqueConstraint("student_id", "topic_id", name="uq_student_quiz_attempt"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False, index=True)
    best_score = Column(Integer, nullable=False, default=0)
    last_score = Column(Integer, nullable=False, default=0)
    total_questions = Column(Integer, nullable=False, default=0)
    attempt_count = Column(Integer, nullable=False, default=0)
    answers_data = Column(String, nullable=True)
    results_data = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", backref="quiz_attempts")
    topic = relationship("Topic", backref="quiz_attempts")


class LessonCompletion(Base):
    __tablename__ = "lesson_completions"
    __table_args__ = (
        UniqueConstraint("student_id", "topic_id", name="uq_student_lesson_completion"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False, index=True)
    completed_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship("Student", backref="lesson_completions")
    topic = relationship("Topic", backref="lesson_completions")
