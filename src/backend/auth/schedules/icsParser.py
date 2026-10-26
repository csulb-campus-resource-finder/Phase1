from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import icalendar
from typing import List
from datetime import datetime

router = APIRouter()

class ICSClassItem(BaseModel):
    course_code: str
    start_time: str
    end_time: str
    day: str
    location: str

@router.post("/api/v1/schedule/upload-ics", response_model=List[ICSClassItem])
async def upload_ics_schedule(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.ics'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a valid .ics calendar file.")
    
    content = await file.read()
    try:
        cal = icalendar.Calendar.from_ical(content)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse the iCalendar file.")
    
    parsed_classes = []
    seen_events = set()

    for component in cal.walk():
        if component.name == "VEVENT":
            summary = str(component.get('summary', '')).strip()
            location = str(component.get('location', '')).strip()
            dtstart = component.get('dtstart')
            dtend = component.get('dtend')

            if summary and dtstart and dtend:
                start_dt = dtstart.dt
                end_dt = dtend.dt
                
                if isinstance(start_dt, datetime):
                    start_str = start_dt.strftime("%I:%M %p")
                    day_str = start_dt.strftime("%A")
                else:
                    start_str = "All Day"
                    day_str = start_dt.strftime("%A")

                if isinstance(end_dt, datetime):
                    end_str = end_dt.strftime("%I:%M %p")
                else:
                    end_str = "All Day"

                event_key = (summary, day_str, start_str)
                if event_key not in seen_events:
                    seen_events.add(event_key)
                    parsed_classes.append(ICSClassItem(
                        course_code=summary,
                        start_time=start_str,
                        end_time=end_str,
                        day=day_str,
                        location=location if location else "On Campus"
                    ))

    if not parsed_classes:
        raise HTTPException(status_code=422, detail="No valid calendar events found in the .ics file.")

    return parsed_classes
