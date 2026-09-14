"""SQLAlchemy models. See README "Database schema" for the plain-text version."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    muscle_group: Mapped[str] = mapped_column(String(50), nullable=False)

    logs: Mapped[list["WorkoutLog"]] = relationship(back_populates="exercise", cascade="all, delete-orphan")
    state: Mapped["ExerciseState | None"] = relationship(
        back_populates="exercise", uselist=False, cascade="all, delete-orphan"
    )
    adaptations: Mapped[list["Adaptation"]] = relationship(back_populates="exercise", cascade="all, delete-orphan")


class WorkoutLog(Base):
    __tablename__ = "workout_logs"
    __table_args__ = (Index("ix_workout_logs_exercise_logged", "exercise_id", "logged_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), nullable=False)
    logged_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    planned_weight: Mapped[float] = mapped_column(Float, nullable=False)
    planned_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_weight: Mapped[float] = mapped_column(Float, nullable=False)
    actual_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    rpe: Mapped[int] = mapped_column(Integer, nullable=False)
    session_score: Mapped[float] = mapped_column(Float, nullable=False)

    exercise: Mapped[Exercise] = relationship(back_populates="logs")
    adaptation: Mapped["Adaptation | None"] = relationship(back_populates="workout_log", uselist=False)


class ExerciseState(Base):
    """The single current recommendation per exercise."""

    __tablename__ = "exercise_state"

    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), primary_key=True)
    current_weight: Mapped[float] = mapped_column(Float, nullable=False)
    current_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    current_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    decision: Mapped[str] = mapped_column(String(10), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    trend_direction: Mapped[str] = mapped_column(String(10), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    exercise: Mapped[Exercise] = relationship(back_populates="state")


class Adaptation(Base):
    """Audit trail: one row per decision the engine has made."""

    __tablename__ = "adaptations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workout_log_id: Mapped[int] = mapped_column(ForeignKey("workout_logs.id"), nullable=False, unique=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), nullable=False)
    logged_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    old_weight: Mapped[float] = mapped_column(Float, nullable=False)
    new_weight: Mapped[float] = mapped_column(Float, nullable=False)
    old_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    new_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    old_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    new_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    decision: Mapped[str] = mapped_column(String(10), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    workout_log: Mapped[WorkoutLog] = relationship(back_populates="adaptation")
    exercise: Mapped[Exercise] = relationship(back_populates="adaptations")
