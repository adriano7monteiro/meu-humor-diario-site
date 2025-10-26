from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class MissionCategory(str, Enum):
    MINDFULNESS = "mindfulness"
    GRATITUDE = "gratitude"
    MOVEMENT = "movement"
    SOCIAL = "social"
    SELFCARE = "selfcare"
    CREATIVITY = "creativity"
    NATURE = "nature"
    LEARNING = "learning"

class MissionDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class Mission(BaseModel):
    id: str = Field(..., description="Unique mission ID")
    title: str = Field(..., description="Mission title")
    description: str = Field(..., description="Mission description")
    category: MissionCategory = Field(..., description="Mission category")
    difficulty: MissionDifficulty = Field(..., description="Mission difficulty")
    xp_reward: int = Field(..., description="XP reward for completion")
    min_level: int = Field(1, description="Minimum user level required")
    icon: str = Field(..., description="Icon name for the mission")
    tips: Optional[List[str]] = Field(None, description="Tips for completing the mission")
    estimated_minutes: int = Field(..., description="Estimated time to complete in minutes")

class DailyMissionSet(BaseModel):
    id: str = Field(..., description="Unique daily set ID")
    date: datetime = Field(..., description="Date for these missions")
    missions: List[str] = Field(..., description="List of mission IDs for this day")
    user_id: str = Field(..., description="User ID (for personalization)")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserMissionProgress(BaseModel):
    id: str = Field(..., description="Unique progress ID")
    user_id: str = Field(..., description="User ID")
    mission_id: str = Field(..., description="Mission ID")
    date: datetime = Field(..., description="Date of completion")
    completed: bool = Field(False, description="Whether mission was completed")
    completed_at: Optional[datetime] = Field(None, description="When mission was completed")
    xp_earned: int = Field(0, description="XP earned from this mission")