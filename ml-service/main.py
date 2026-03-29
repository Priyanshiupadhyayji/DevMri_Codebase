"""
DevMRI ML Service
FastAPI microservice for flaky build classification and CI/CD forecasting
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import joblib
import os
import re
import warnings
warnings.filterwarnings('ignore')

from .classifier import FlakyClassifier
from .forecaster import DurationForecaster

app = FastAPI(
    title="DevMRI ML Service",
    description="ML microservice for CI/CD flaky build detection and duration forecasting",
    version="1.0.0"
)

classifier = FlakyClassifier()
forecaster = DurationForecaster()

# Initialize models on startup
@app.on_event("startup")
async def startup_event():
    classifier.load_or_train()
    forecaster.load_or_train()


# ===================== CLASSIFY ENDPOINT =====================

class ClassifyRequest(BaseModel):
    log_text: str


class ClassifyResponse(BaseModel):
    is_flaky: bool
    confidence: float
    reason: str


@app.post("/classify", response_model=ClassifyResponse)
async def classify_build(request: ClassifyRequest):
    """
    Classify a build log as flaky or not.
    
    - log_text: The build log text to analyze
    - Returns: is_flaky (bool), confidence (float), reason (str)
    """
    try:
        result = classifier.predict(request.log_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================== FORECAST ENDPOINT =====================

class RunData(BaseModel):
    timestamp: str
    duration_seconds: float
    status: str


class ForecastRequest(BaseModel):
    runs: List[RunData]


class ForecastPoint(BaseModel):
    date: str
    predicted_score: float
    lower: float
    upper: float


class ForecastResponse(BaseModel):
    forecast: List[ForecastPoint]
    mae: float
    days_until_grade_d: int


@app.post("/forecast", response_model=ForecastResponse)
async def forecast_duration(request: ForecastRequest):
    """
    Forecast CI/CD pipeline durations and map to DX Score.
    
    - runs: List of {timestamp, duration_seconds, status}
    - Returns: forecast with predicted DX scores, MAE, and days until Grade D
    """
    try:
        result = forecaster.forecast(request.runs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================== HEALTH CHECK =====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models": {
            "classifier": "loaded" if classifier.is_loaded else "training",
            "forecaster": "loaded" if forecaster.is_loaded else "training"
        }
    }


@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "DevMRI ML Service",
        "version": "1.0.0",
        "endpoints": {
            "/classify": "POST - Classify build log as flaky",
            "/forecast": "POST - Forecast pipeline durations",
            "/health": "GET - Health check"
        }
    }
