from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend import services
from backend.database import get_db
from backend.schemas import AdaptationOut

router = APIRouter(prefix="/adaptations", tags=["adaptations"])


@router.get("/{exercise_id}", response_model=list[AdaptationOut], summary="Adaptation audit trail (newest first)")
def get_adaptations(exercise_id: int, db: Session = Depends(get_db)) -> list[AdaptationOut]:
    try:
        return services.adaptation_history(db, exercise_id)
    except services.ExerciseNotFound:
        raise HTTPException(status_code=404, detail=f"Exercise {exercise_id} not found")
