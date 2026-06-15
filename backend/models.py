from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

# Normalize API
class NormalizeRequest(BaseModel):
    text: str = Field(..., description="The query in Telugu script or Roman Telugu")

class NormalizeResponse(BaseModel):
    original_input: str
    input_type: str  # "Telugu Script" or "Roman Telugu"
    telugu_script: str
    normalized_telugu: str
    dialect: str  # "Telangana", "Rayalaseema", "Uttarandhra", "Standard Telugu", "Unknown"

# Intent API
class IntentRequest(BaseModel):
    text: str = Field(..., description="The Telugu script (typically normalized)")

class IntentResponse(BaseModel):
    intent: str  # "Transportation", "Navigation / Direction", etc.
    confidence: float  # out of 100 or as percentage
    intent_distribution: Dict[str, float]  # mapping intent -> probability/fraction

# Translate API
class TranslateRequest(BaseModel):
    text: str = Field(..., description="The Telugu script (typically normalized)")

class TranslateResponse(BaseModel):
    en: str
    ta: str
    ta_romanized: str

# Feedback API
class FeedbackRequest(BaseModel):
    original_text: str
    normalized_text: str
    detected_intent: str
    corrected_intent: Optional[str] = None
    english_translation: str
    tamil_translation: str
    feedback_type: str  # "correct" or "incorrect"

class FeedbackResponse(BaseModel):
    status: str
    message: str

# Analytics API
# Analytics API

class QueryLog(BaseModel):
    text: str
    timestamp: str
    dialect: str
    intent: str
    feedback_type: str  # "correct", "incorrect", or "unrated"
    corrected_intent: Optional[str] = None


class AnalyticsResponse(BaseModel):
    total_queries: int

    intent_statistics: Dict[str, int]
    dialect_statistics: Dict[str, int]

    dataset_growths: Optional[Dict[str, int]] = None
    feedback_statistics: Optional[Dict[str, Any]] = None

    # Matches fetch_analytics_db()
    accuracy_trends: Optional[Dict[str, Any]] = None

    translation_metrics: Optional[Dict[str, Any]] = None

    most_common_queries: List[Dict[str, Any]]