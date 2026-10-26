from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import pytesseract
from PIL import Image
import io
import re
from typing import List

router = APIRouter()

class ParsedClass(BaseModel):
    course_code: str
    time_window: str
    location: str

@router.post("/api/v1/schedule/upload-image", response_model=List[ParsedClass])
async def parse_arbitrary_schedule_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        raise HTTPException(status_code=400, detail="Please upload a valid image file (PNG, JPG, JPEG).")
    
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not process the uploaded image.")
    
    raw_text = pytesseract.image_to_string(image)
    
    course_pattern = re.compile(
        r'(?P<course>[A-Z]{2,4}\s+\d+[A-Z]?\s*-?\s*\d*).*?'
        r'(?P<time>\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)?',
        re.IGNORECASE
    )
    
    parsed_classes = []
    seen_courses = set()
    
    for line in raw_text.split('\n'):
        match = course_pattern.search(line)
        if match and match.group('course'):
            course_code = match.group('course').strip()
            if course_code not in seen_courses:
                seen_courses.add(course_code)
                parsed_classes.append(ParsedClass(
                    course_code=course_code,
                    time_window=match.group('time').strip() if match.group('time') else "Arranged / TBA",
                    location="Extracted from image"
                ))
                
    if not parsed_classes:
        raise HTTPException(status_code=422, detail="No valid course schedules could be detected in this image.")
        
    return parsed_classes
