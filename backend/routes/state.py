from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend import services
from backend.database import get_db
from backend.schemas import StateOut

router = APIRouter(prefix="/state", tags=["state"])


# NOTE: /summary must be declared before /{exercise_id} or it would be captured as an id.
@router.get("/summary", response_model=list[StateOut], summary="Current state of every exercise (dashboard)")
def get_summary(db: Session = Depends(get_db)) -> list[StateOut]:
    return services.state_summary(db)


@router.get("/{exercise_id}", response_model=StateOut, summary="Current recommendation for one exercise")
def get_state(exercise_id: int, db: Session = Depends(get_db)) -> StateOut:
    try:
        return services.exercise_state(db, exercise_id)
    except services.ExerciseNotFound:
        raise HTTPException(status_code=404, detail=f"Exercise {exercise_id} not found")
    except services.StateNotFound:
        raise HTTPException(
            status_code=404,
            detail=f"No state for exercise {exercise_id} yet - log a workout first (POST /logs)",
        )
