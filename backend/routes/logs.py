from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend import services
from backend.database import get_db
from backend.schemas import LogCreate, LogHistoryOut, RecommendationOut

router = APIRouter(prefix="/logs", tags=["logs"])


@router.post(
    "",
    response_model=RecommendationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Log a workout and get the next-session recommendation",
)
def create_log(payload: LogCreate, db: Session = Depends(get_db)) -> RecommendationOut:
    try:
        return services.process_workout_log(db, payload)
    except services.ExerciseNotFound:
        raise HTTPException(status_code=404, detail=f"Exercise {payload.exercise_id} not found")


@router.get("/{exercise_id}", response_model=LogHistoryOut, summary="Recent workout history for charts")
def get_logs(
    exercise_id: int,
    limit: int = Query(default=20, ge=1, le=200, description="Number of most recent sessions"),
    db: Session = Depends(get_db),
) -> LogHistoryOut:
    try:
        return services.log_history(db, exercise_id, limit)
    except services.ExerciseNotFound:
        raise HTTPException(status_code=404, detail=f"Exercise {exercise_id} not found")
