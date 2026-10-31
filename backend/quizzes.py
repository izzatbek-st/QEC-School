import copy
import hashlib
import hmac
import json
import random
import re
from typing import Any


SUPPORTED_TYPES = {
    "single_choice",
    "multiple_choice",
    "true_false",
    "short_answer",
    "numeric",
    "sequence",
    "ordering",
    "matching",
    "fill_blanks",
    "fill_blank",
    "drag_words",
    "dropdown",
    "hotspot",
    "drag_objects",
    "essay",
    "likert",
}


def _normalise_question(question: dict) -> dict:
    result = copy.deepcopy(question)
    question_type = result.get("type") or (
        "multiple_choice" if result.get("isMultiSelect") else "single_choice"
    )

    if question_type == "ordering":
        question_type = "sequence"
        result["items"] = sorted(
            result.get("items", []), key=lambda item: item.get("order", 0)
        )
    elif question_type == "matching" and "pairs" not in result:
        right_by_id = {str(item["id"]): item for item in result.get("right", [])}
        correct_pairs = {
            str(pair[0]): str(pair[1]) for pair in result.get("correct_pairs", [])
        }
        result["pairs"] = [
            {
                "id": item["id"],
                "left": item.get("text", ""),
                "right_id": correct_pairs.get(str(item["id"])),
                "right": right_by_id.get(correct_pairs.get(str(item["id"])), {}).get(
                    "text", ""
                ),
            }
            for item in result.get("left", [])
        ]
    elif question_type in {"fill_blank", "fill_blanks", "drag_words"}:
        if "text" not in result and isinstance(result.get("question"), str):
            text = result["question"]
            blanks = result.get("blanks", {})
            if isinstance(blanks, dict):
                for blank_id, details in blanks.items():
                    answers = details.get("correct_answers", [])
                    answer = answers[0] if answers else ""
                    text = text.replace("{{" + blank_id + "}}", f"[{answer}]")
            elif isinstance(blanks, list):
                words = {str(word["id"]): word.get("text", "") for word in result.get("words", [])}
                for blank in blanks:
                    answer = words.get(str(blank.get("correct_word")), "")
                    text = text.replace("{{" + str(blank.get("id")) + "}}", f"[{answer}]")
            result["text"] = text
        question_type = "drag_words" if question_type == "drag_words" else "fill_blanks"
    elif question_type == "dropdown":
        for field in result.get("fields", []):
            if "correct" not in field:
                field["correct"] = field.get("correct_answer", "")
            options = field.get("options", "")
            if isinstance(options, list):
                field["options"] = ", ".join(str(option) for option in options)
    elif question_type == "hotspot":
        result["imageUrl"] = result.get("imageUrl", result.get("image", ""))
    elif question_type == "drag_objects":
        for item in result.get("objects", []):
            if "zoneId" not in item:
                item["zoneId"] = item.get("correct_zone")
    elif question_type == "short_answer" and result.get("correct_answers"):
        result.setdefault("correct_answer", result["correct_answers"][0])

    result["type"] = question_type
    return result


def parse_quiz_data(quiz_data: str) -> list[dict]:
    try:
        data = json.loads(quiz_data)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("Test ma'lumotlari yaroqsiz JSON formatida") from exc

    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list) or not data or len(data) > 100:
        raise ValueError("Testda 1 dan 100 tagacha savol bo'lishi kerak")
    if any(not isinstance(question, dict) for question in data):
        raise ValueError("Har bir test savoli obyekt bo'lishi kerak")

    questions = []
    try:
        for index, question in enumerate(data):
            question = _normalise_question(question)
            if question.get("id") is None:
                question["id"] = str(index)
            if not isinstance(question["id"], (str, int)):
                raise ValueError("Savol ID formati noto'g'ri")
            if not isinstance(question["type"], str) or question["type"] not in SUPPORTED_TYPES:
                raise ValueError("Test savollaridan biri qo'llab-quvvatlanmaydi")
            questions.append(question)
    except (AttributeError, KeyError, TypeError) as exc:
        raise ValueError("Test savollarining tuzilishi yaroqsiz") from exc
    question_ids = [str(question["id"]) for question in questions]
    if len(set(question_ids)) != len(question_ids):
        raise ValueError("Test savollarining ID qiymatlari takrorlanmasligi kerak")
    return questions


def _matching_token(secret: bytes, student_id: int, topic_id: int, question_id: Any, right_id: Any) -> str:
    value = f"{student_id}:{topic_id}:{question_id}:{right_id}".encode()
    return hmac.new(secret, value, hashlib.sha256).hexdigest()


def public_quiz_data(
    questions: list[dict], secret: bytes, student_id: int, topic_id: int
) -> str:
    public_questions = copy.deepcopy(questions)
    rng = random.SystemRandom()

    for index, question in enumerate(public_questions):
        question_type = question["type"]
        if question_type in {"single_choice", "multiple_choice"}:
            for option in question.get("options", []):
                option.pop("isCorrect", None)
            question.pop("correct_answers", None)
            question.pop("correct_answer", None)
        elif question_type in {"short_answer", "numeric", "true_false"}:
            question.pop("correct_answer", None)
            question.pop("correct_answers", None)
            question.pop("tolerance", None)
        elif question_type == "sequence":
            rng.shuffle(question.get("items", []))
            for item in question.get("items", []):
                item.pop("order", None)
        elif question_type == "matching":
            pairs = question.get("pairs", [])
            right_options = [
                {
                    "id": _matching_token(
                        secret,
                        student_id,
                        topic_id,
                        question.get("id", index),
                        pair.get("right_id", pair["id"]),
                    ),
                    "text": pair.get("right", ""),
                }
                for pair in pairs
            ]
            rng.shuffle(right_options)
            question["pairs"] = [
                {"id": pair["id"], "left": pair.get("left", "")}
                for pair in pairs
            ]
            question["rightOptions"] = right_options
            question.pop("correct_pairs", None)
            question.pop("left", None)
            question.pop("right", None)
        elif question_type in {"fill_blanks", "drag_words"}:
            text = question.get("text") or ""
            answers = re.findall(r"\[(.*?)\]", text)
            question["text"] = re.sub(r"\[(.*?)\]", "[ ]", text)
            question.pop("blanks", None)
            if question_type == "drag_words":
                words = question.get("words") or [
                    {"id": str(index), "text": answer}
                    for index, answer in enumerate(answers)
                ]
                rng.shuffle(words)
                question["words"] = words
        elif question_type == "dropdown":
            for field in question.get("fields", []):
                field.pop("correct", None)
                field.pop("correct_answer", None)
        elif question_type == "hotspot":
            question.pop("hotspots", None)
        elif question_type == "drag_objects":
            for item in question.get("objects", []):
                item.pop("zoneId", None)
                item.pop("correct_zone", None)

    return json.dumps(public_questions, ensure_ascii=False)


def _normalise_text(value: Any) -> str:
    return str(value if value is not None else "").strip().casefold()


def grade_question(
    question: dict, answer: Any, secret: bytes, student_id: int, topic_id: int
) -> bool:
    question_type = question["type"]

    if question_type in {"single_choice", "multiple_choice"}:
        correct = {
            str(option["id"])
            for option in question.get("options", [])
            if option.get("isCorrect")
        }
        if not correct and question.get("correct_answers"):
            correct = {str(value) for value in question["correct_answers"]}
        if not correct and question.get("correct_answer") is not None:
            correct = {str(question["correct_answer"])}
        selected = {
            str(option_id)
            for option_id, checked in (answer or {}).items()
            if checked
        } if isinstance(answer, dict) else set()
        multi = question_type == "multiple_choice" or question.get("isMultiSelect")
        return bool(correct) and (selected == correct if multi else len(selected) == 1 and selected == correct)

    if question_type == "true_false":
        return answer is not None and _normalise_text(answer) == _normalise_text(question.get("correct_answer"))

    if question_type == "numeric":
        try:
            submitted = float(answer)
            expected = float(question.get("correct_answer"))
            tolerance = float(question.get("tolerance", 0))
            return abs(submitted - expected) <= tolerance
        except (TypeError, ValueError):
            return False

    if question_type == "short_answer":
        accepted = question.get("correct_answers") or [question.get("correct_answer", "")]
        case_sensitive = bool(question.get("case_sensitive", False))
        normalise = (lambda value: str(value or "").strip()) if case_sensitive else _normalise_text
        return any(normalise(answer) == normalise(expected) for expected in accepted)

    if question_type == "sequence":
        expected = [item.get("id") for item in question.get("items", [])]
        return isinstance(answer, list) and [str(value) for value in answer] == [str(value) for value in expected]

    if question_type == "matching":
        if not isinstance(answer, dict):
            return False
        pairs = question.get("pairs", [])
        if not pairs or len(answer) != len(pairs):
            return False
        for pair in pairs:
            right_id = pair.get("right_id", pair["id"])
            expected = _matching_token(
                secret,
                student_id,
                topic_id,
                question.get("id"),
                right_id,
            )
            if str(answer.get(str(pair["id"]), answer.get(pair["id"], ""))) != expected:
                return False
        return True

    if question_type in {"fill_blanks", "drag_words"}:
        if not isinstance(answer, dict):
            return False
        text = question.get("text") or ""
        answers = re.findall(r"\[(.*?)\]", text)
        parts = re.split(r"\[(.*?)\]", text)
        blank_indexes = [str(index) for index in range(1, len(parts), 2)]
        return bool(answers) and all(
            _normalise_text(answer.get(index)) == _normalise_text(expected)
            for index, expected in zip(blank_indexes, answers)
        )

    if question_type == "dropdown":
        fields = question.get("fields", [])
        return bool(fields) and isinstance(answer, dict) and all(
            _normalise_text(answer.get(str(field["id"]), answer.get(field["id"])))
            == _normalise_text(field.get("correct", field.get("correct_answer")))
            for field in fields
        )

    if question_type == "hotspot":
        if not isinstance(answer, dict) or answer.get("x") is None or answer.get("y") is None:
            return False
        for hotspot in question.get("hotspots", []):
            radius = float(hotspot.get("radius", 10))
            distance = ((float(hotspot["x"]) - float(answer["x"])) ** 2 + (
                float(hotspot["y"]) - float(answer["y"])
            ) ** 2) ** 0.5
            if distance < radius:
                return True
        return False

    if question_type == "drag_objects":
        objects = question.get("objects", [])
        return bool(objects) and isinstance(answer, dict) and all(
            str(answer.get(str(item["id"]), answer.get(item["id"], "")))
            == str(item.get("zoneId", item.get("correct_zone", "")))
            for item in objects
        )

    if question_type in {"essay", "likert"}:
        return bool(answer)

    return False


def grade_quiz(
    questions: list[dict],
    answers: dict[str, Any],
    secret: bytes,
    student_id: int,
    topic_id: int,
) -> tuple[int, list[dict]]:
    correct_count = 0
    results = []
    for index, question in enumerate(questions):
        answer = answers.get(str(question.get("id", index)))
        is_correct = grade_question(question, answer, secret, student_id, topic_id)
        correct_count += int(is_correct)
        result_question = copy.deepcopy(question)
        result_question["is_correct"] = is_correct
        if question["type"] == "matching":
            for pair in result_question.get("pairs", []):
                pair["correctRightId"] = str(pair.get("right_id", pair["id"]))
            result_question["rightOptions"] = [
                {"id": str(pair.get("right_id", pair["id"])), "text": pair.get("right", "")}
                for pair in question.get("pairs", [])
            ]
        results.append(result_question)
    return correct_count, results
