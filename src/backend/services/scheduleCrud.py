from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from pydantic import BaseModel

class ParsedClass(BaseModel):
    course_code: str
    time_window: str
    location: str

class ICSClassItem(BaseModel):
    course_code: str
    start_time: str
    end_time: str
    day: str
    location: str

def save_user_schedules(db: Session, user_id: str, parsed_classes: List[ParsedClass]):
    db.execute(
        text("DELETE FROM user_schedules WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    for c in parsed_classes:
        db.execute(
            text("""
                INSERT INTO user_schedules (user_id, course_code, time_window, location)
                VALUES (:user_id, :course_code, :time_window, :location)
            """),
            {
                "user_id": user_id,
                "course_code": c.course_code,
                "time_window": c.time_window,
                "location": c.location
            }
        )
    db.commit()

def save_ics_schedules(db: Session, user_id: str, classes: List[ICSClassItem]):
    db.execute(
        text("DELETE FROM user_schedules WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    for c in classes:
        time_window = f"{c.start_time} - {c.end_time} ({c.day})"
        db.execute(
            text("""
                INSERT INTO user_schedules (user_id, course_code, time_window, location)
                VALUES (:user_id, :course_code, :time_window, :location)
            """),
            {
                "user_id": user_id,
                "course_code": c.course_code,
                "time_window": time_window,
                "location": c.location
            }
        )
    db.commit()

