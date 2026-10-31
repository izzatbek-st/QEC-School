# Test va mashq turlari — Frontend, Backend va JSON

Bu hujjatda test platformasidagi 14 ta test/mashq turi uchun:
- Frontend ko‘rinishi
- Backendda saqlash prinsipi
- JSON strukturasi
- Database arxitekturasi
- API endpointlari

berilgan.

---

## 1. Bitta javob — `single_choice`

### Frontend

```text
┌─────────────────────────────────────────────┐
│ 1. Kompyuterning asosiy hisoblash qurilmasi │
│                                             │
│ ○ Monitor                                   │
│ ● Protsessor                                │
│ ○ Klaviatura                                │
│ ○ Printer                                   │
└─────────────────────────────────────────────┘
```

### JSON

```json
{
  "type": "single_choice",
  "question": "Kompyuterning asosiy hisoblash qurilmasi qaysi?",
  "options": [
    {"id": "a", "text": "Monitor"},
    {"id": "b", "text": "Protsessor"},
    {"id": "c", "text": "Klaviatura"},
    {"id": "d", "text": "Printer"}
  ],
  "correct_answer": "b",
  "points": 1
}
```

---

## 2. Bir nechta javob — `multiple_choice`

### Frontend

```text
☑ Klaviatura
☐ Monitor
☑ Sichqoncha
☐ Printer
☑ Mikrofon
```

### JSON

```json
{
  "type": "multiple_choice",
  "question": "Qaysilari kiritish qurilmalari?",
  "options": [
    {"id": "a", "text": "Klaviatura"},
    {"id": "b", "text": "Monitor"},
    {"id": "c", "text": "Sichqoncha"},
    {"id": "d", "text": "Printer"},
    {"id": "e", "text": "Mikrofon"}
  ],
  "correct_answers": ["a", "c", "e"],
  "points": 2
}
```

---

## 3. To‘g‘ri / Noto‘g‘ri — `true_false`

### Frontend

```text
RAM ma'lumotlarni doimiy saqlaydi.

○ To‘g‘ri
● Noto‘g‘ri
```

### JSON

```json
{
  "type": "true_false",
  "question": "RAM ma'lumotlarni doimiy saqlaydi.",
  "correct_answer": false,
  "points": 1
}
```

---

## 4. Qisqa javob — `short_answer`

### Frontend

```text
Kompyuterning asosiy hisoblash qurilmasi nima?

[ Protsessor                         ]
```

### JSON

```json
{
  "type": "short_answer",
  "question": "Kompyuterning asosiy hisoblash qurilmasi nima?",
  "correct_answers": [
    "protsessor",
    "processor",
    "cpu"
  ],
  "case_sensitive": false,
  "points": 1
}
```

---

## 5. Sonli javob — `numeric`

### Frontend

```text
1 KB necha bayt?

[ 1024 ]
```

### JSON

```json
{
  "type": "numeric",
  "question": "1 KB necha bayt?",
  "correct_answer": 1024,
  "tolerance": 0,
  "points": 1
}
```

`Tolerance` yordamida matematik javoblarda xatolik chegarasini berish mumkin.

---

## 6. Ketma-ketlik — `ordering`

### Frontend

Elementlar `drag & drop` orqali to‘g‘ri tartibga keltiriladi.

### JSON

```json
{
  "type": "ordering",
  "question": "Kompyuterni ishga tushirish bosqichlarini tartiblang.",
  "items": [
    {"id": "1", "text": "Power tugmasini bosish", "order": 1},
    {"id": "2", "text": "Qurilmalar ishga tushishi", "order": 2},
    {"id": "3", "text": "Windows yuklanishi", "order": 3},
    {"id": "4", "text": "Ishlashni boshlash", "order": 4}
  ],
  "points": 2
}
```

---

## 7. Moslashtirish — `matching`

### Frontend

```text
Klaviatura  →  Ma'lumot kiritish
Monitor     →  Ma'lumot chiqarish
Printer     →  Chop etish
```

### JSON

```json
{
  "type": "matching",
  "question": "Qurilmalarni vazifasi bilan moslashtiring.",
  "left": [
    {"id": "l1", "text": "Klaviatura"},
    {"id": "l2", "text": "Monitor"},
    {"id": "l3", "text": "Printer"}
  ],
  "right": [
    {"id": "r1", "text": "Ma'lumot kiritish"},
    {"id": "r2", "text": "Ma'lumot chiqarish"},
    {"id": "r3", "text": "Chop etish"}
  ],
  "correct_pairs": [
    ["l1", "r1"],
    ["l2", "r2"],
    ["l3", "r3"]
  ],
  "points": 3
}
```

---

## 8. Bo‘sh joyni to‘ldirish — `fill_blank`

### Frontend

```text
Kompyuterning [ __________ ] xotirasi
vaqtinchalik ma'lumot saqlaydi.
```

### JSON

```json
{
  "type": "fill_blank",
  "question": "Kompyuterning {{blank1}} xotirasi vaqtinchalik ma'lumot saqlaydi.",
  "blanks": {
    "blank1": {
      "correct_answers": [
        "RAM",
        "operativ xotira"
      ]
    }
  },
  "points": 1
}
```

---

## 9. Ro‘yxatdan tanlash — `dropdown`

### Frontend

```text
Microsoft operatsion tizimi:

[ Windows ▼ ]

Kiritish qurilmasi:

[ Klaviatura ▼ ]
```

### JSON

```json
{
  "type": "dropdown",
  "question": "Mos variantlarni tanlang.",
  "fields": [
    {
      "id": "f1",
      "label": "Microsoft operatsion tizimi",
      "options": ["Windows", "Linux", "Android"],
      "correct_answer": "Windows"
    },
    {
      "id": "f2",
      "label": "Kiritish qurilmasi",
      "options": ["Monitor", "Klaviatura", "Printer"],
      "correct_answer": "Klaviatura"
    }
  ],
  "points": 2
}
```

---

## 10. So‘zlarni sudrash — `drag_words`

### Frontend

```text
RAM   CPU   SSD   Monitor

Kompyuterning ______ ma'lumotlarni
vaqtincha saqlaydi.
```

Foydalanuvchi tayyor so‘zni bo‘sh joyga sudraydi.

### JSON

```json
{
  "type": "drag_words",
  "question": "Gapdagi bo‘sh joyni mos so‘z bilan to‘ldiring.",
  "words": [
    {"id": "w1", "text": "RAM"},
    {"id": "w2", "text": "CPU"},
    {"id": "w3", "text": "SSD"},
    {"id": "w4", "text": "Monitor"}
  ],
  "blanks": [
    {
      "id": "b1",
      "correct_word": "w1"
    }
  ],
  "points": 1
}
```

---

## 11. Soha tanlash — `hotspot`

Bu tur rasm yoki diagramma ustida ishlaydi.

### Frontend

```text
┌───────────────────────────────────┐
│                                   │
│          [ MOTHERBOARD ]          │
│                                   │
│                 ●                 │
│              hotspot              │
│                                   │
└───────────────────────────────────┘
```

### JSON

```json
{
  "type": "hotspot",
  "question": "Protsessor joylashgan qismni belgilang.",
  "image": "/uploads/motherboard.jpg",
  "hotspots": [
    {
      "id": "h1",
      "x": 42,
      "y": 36,
      "width": 15,
      "height": 12,
      "correct": true
    }
  ],
  "points": 2
}
```

`x`, `y`, `width`, `height` qiymatlarini foizlarda saqlash responsive rasm uchun qulay.

---

## 12. Obyektlarni sudrash — `drag_objects`

### Frontend

```text
[Klaviatura] [Monitor] [Sichqoncha] [Printer]

                 ↓

[Kiritish qurilmalari]    [Chiqarish qurilmalari]
```

### JSON

```json
{
  "type": "drag_objects",
  "question": "Qurilmalarni tegishli guruhga joylashtiring.",
  "objects": [
    {
      "id": "o1",
      "text": "Klaviatura",
      "correct_zone": "input"
    },
    {
      "id": "o2",
      "text": "Monitor",
      "correct_zone": "output"
    },
    {
      "id": "o3",
      "text": "Sichqoncha",
      "correct_zone": "input"
    },
    {
      "id": "o4",
      "text": "Printer",
      "correct_zone": "output"
    }
  ],
  "zones": [
    {
      "id": "input",
      "title": "Kiritish qurilmalari"
    },
    {
      "id": "output",
      "title": "Chiqarish qurilmalari"
    }
  ],
  "points": 4
}
```

---

## 13. Likert shkalasi — `likert`

### Frontend

```text
Men kompyuterda mustaqil ishlay olaman.

○ Umuman qo‘shilmayman
○ Qo‘shilmayman
○ Neytral
● Qo‘shilaman
○ To‘liq qo‘shilaman
```

### JSON

```json
{
  "type": "likert",
  "question": "Men kompyuterda mustaqil ishlay olaman.",
  "scale": [
    {
      "value": 1,
      "label": "Umuman qo‘shilmayman"
    },
    {
      "value": 2,
      "label": "Qo‘shilmayman"
    },
    {
      "value": 3,
      "label": "Neytral"
    },
    {
      "value": 4,
      "label": "Qo‘shilaman"
    },
    {
      "value": 5,
      "label": "To‘liq qo‘shilaman"
    }
  ],
  "points": 0
}
```

Likert odatda bilimni avtomatik baholashdan ko‘ra so‘rovnoma, fikr va o‘z-o‘zini baholash uchun ishlatiladi.

---

## 14. Esse — `essay`

### Frontend

```text
Sun'iy intellektning ta'limdagi o‘rni haqida fikringizni yozing.

┌─────────────────────────────────────────┐
│                                         │
│  Javob shu yerga yoziladi...            │
│                                         │
└─────────────────────────────────────────┘

0 / 1000 belgi

[ Yuborish ]
```

### JSON

```json
{
  "type": "essay",
  "question": "Sun'iy intellektning ta'limdagi o‘rni haqida fikringizni yozing.",
  "min_length": 100,
  "max_length": 1000,
  "manual_grading": true,
  "points": 10
}
```

Student javobi:

```json
{
  "question_id": 42,
  "student_id": 17,
  "answer": "Sun'iy intellekt ta'lim jarayonida...",
  "score": null,
  "teacher_comment": null
}
```

---

# Backend database arxitekturasi

Tavsiya:

```text
users
├── students
└── teachers

quizzes
└── questions
    ├── single_choice
    ├── multiple_choice
    ├── true_false
    ├── short_answer
    ├── numeric
    ├── ordering
    ├── matching
    ├── fill_blank
    ├── dropdown
    ├── drag_words
    ├── hotspot
    ├── drag_objects
    ├── likert
    └── essay

quiz_attempts
└── answers
```

## `questions` jadvali

```sql
CREATE TABLE questions (
    id INTEGER PRIMARY KEY,
    quiz_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    content_json TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    order_index INTEGER,
    created_at DATETIME,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);
```

## `answers` jadvali

```sql
CREATE TABLE answers (
    id INTEGER PRIMARY KEY,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_json TEXT,
    is_correct BOOLEAN,
    score REAL DEFAULT 0,
    teacher_comment TEXT,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

## `quiz_attempts` jadvali

```sql
CREATE TABLE quiz_attempts (
    id INTEGER PRIMARY KEY,
    quiz_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    started_at DATETIME,
    submitted_at DATETIME,
    score REAL DEFAULT 0,
    max_score REAL DEFAULT 0,
    status VARCHAR(30)
);
```

---

# API endpointlar

```text
POST /quizzes
POST /questions
GET  /quizzes/{id}
POST /quizzes/{id}/start
POST /attempts/{id}/answer
POST /attempts/{id}/submit
GET  /attempts/{id}/result
```

## Javob yuborish oqimi

```text
Student
   ↓
Question
   ↓
type
   ↓
answer_json
   ↓
Grading Engine
   ↓
score
```

Masalan:

```json
{
  "question_id": 15,
  "type": "multiple_choice",
  "answer": ["a", "c", "e"]
}
```

Backend buni savoldagi `correct_answers` bilan solishtiradi:

```json
{
  "question_id": 15,
  "is_correct": true,
  "score": 2,
  "max_score": 2
}
```

---

# Tavsiya etiladigan arxitektura

14 ta test turi uchun 14 ta alohida database jadvali yaratish shart emas.

Eng qulay variant:

```text
questions
├── id
├── quiz_id
├── type
├── question
├── content_json
├── points
└── order_index
```

Har bir test turining o‘z `type` qiymati bo‘ladi:

```text
single_choice
multiple_choice
true_false
short_answer
numeric
ordering
matching
fill_blank
dropdown
drag_words
hotspot
drag_objects
likert
essay
```

Shunda keyinchalik yangi test turi qo‘shilsa, mavjud database strukturasini o‘zgartirmasdan yangi `type`, frontend komponenti va grading logikasini qo‘shish mumkin.

FastAPI bilan Pydantic discriminated schemas ishlatish har bir test turining JSON validatsiyasini aniq boshqarishga yordam beradi.
