"""FastAPI application. Run from the repo root:

    uvicorn backend.main:app --reload

Interactive docs: http://127.0.0.1:8000/docs
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import models  # noqa: F401  (registers tables on Base.metadata)
from backend.database import Base, engine
from backend.routes import adaptations, exercises, logs, state
from backend.schemas import HealthOut
from backend.settings import cors_origins


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Creates any missing tables; existing data (e.g. the committed fitness.db) is untouched.
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Adaptive Fitness Coach API",
        version="1.0.0",
        description=(
            "Log workouts (weight, reps, sets, RPE) and receive deterministic "
            "PROGRESS / HOLD / BACK OFF recommendations based on recent session history."
        ),
        lifespan=lifespan,
    )
    origins = cors_origins()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials="*" not in origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(exercises.router)
    app.include_router(logs.router)
    app.include_router(state.router)
    app.include_router(adaptations.router)

    @app.get("/health", response_model=HealthOut, tags=["meta"])
    def health() -> HealthOut:
        return HealthOut(status="ok")

    return app


app = create_app()
