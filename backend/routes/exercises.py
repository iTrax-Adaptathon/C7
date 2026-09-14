from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend import crud
from backend.database import get_db
from backend.schemas import ExerciseOut

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseOut], summary="List available exercises")
def list_exercises(db: Session = Depends(get_db)) -> list[ExerciseOut]:
    return [ExerciseOut.model_validate(e) for e in crud.list_exercises(db)]
