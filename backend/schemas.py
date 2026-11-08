from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

class SettingsBase(BaseModel):
    name: str
    email: str
    avatar_url: str
    logo_url: str
    theme: str

class SettingsCreate(SettingsBase):
    pass

class Settings(SettingsBase):
    id: int
    class Config:
        from_attributes = True

# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TeacherPasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)

class QuizSubmission(BaseModel):
    answers: Dict[str, Any] = Field(default_factory=dict)

# --- Student ---
class StudentBase(BaseModel):
    name: str
    initials: str
    username: str
    color: Optional[str] = "bg-indigo-100 text-indigo-600"
    score: Optional[int] = 0

class StudentCreate(StudentBase):
    password: str = Field(min_length=8, max_length=128)

class StudentUpdate(BaseModel):
    username: str
    password: str = Field(min_length=8, max_length=128)

class Student(StudentBase):
    id: int
    group_id: int
    class Config:
        from_attributes = True

# --- Group ---
class GroupBase(BaseModel):
    name: str
    desc: str

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    desc: Optional[str] = None

class Group(GroupBase):
    id: int
    students: List[Student] = []
    class Config:
        from_attributes = True

# --- Block ---
class BlockBase(BaseModel):
    title: str
    category: str
    desc: str
    topics: int = 0
    badge: str
    badge_class: str

class TopicBase(BaseModel):
    title: str
    video_url: Optional[str] = None
    content: str
    order_index: int = 0
    item_type: Optional[str] = "lesson"
    quiz_data: Optional[str] = None
    passing_score: Optional[int] = 70

class TopicCreate(TopicBase):
    pass

class TopicReorderItem(BaseModel):
    id: int
    order_index: int

class BlockTopicsReorder(BaseModel):
    topics: List[TopicReorderItem]

class Topic(TopicBase):
    id: int
    block_id: int
    completed: Optional[bool] = False
    is_locked: Optional[bool] = False
    locked_reason: Optional[str] = None
    attempt: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True

class BlockCreate(BlockBase):
    group_ids: List[int] = []

class BlockUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    desc: Optional[str] = None
    badge: Optional[str] = None
    badge_class: Optional[str] = None
    group_ids: Optional[List[int]] = None

class Block(BlockBase):
    id: int
    groups: List[Group] = []
    topics_list: List[Topic] = []
    class Config:
        from_attributes = True
