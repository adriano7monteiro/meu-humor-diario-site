from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
from jose import JWTError, jwt
import re
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from emergentintegrations.llm.chat import LlmChat, UserMessage
from models.chat import ChatMessage, ChatConversation, SendMessageRequest, ChatResponse, MessageRole
from models.missions import Mission, MissionCategory, MissionDifficulty, DailyMissionSet, UserMissionProgress
from models.payments import PaymentTransaction, EbookPackage, EBOOK_PACKAGES
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client.get_database('mental_health_app')

# Stripe configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
if not STRIPE_API_KEY:
    raise ValueError("STRIPE_API_KEY must be set in environment variables")

# Subscription-related classes
class PlanType(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"  # 6 months
    YEARLY = "yearly"

class SubscriptionStatus(str, Enum):
    FREE_TRIAL = "free_trial"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAYMENT_FAILED = "payment_failed"

# Subscription models
class SubscriptionPlan(BaseModel):
    id: str
    name: str
    description: str
    price: float
    duration_months: int
    plan_type: PlanType
    features: list = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserSubscription(BaseModel):
    user_id: str
    plan_id: str
    status: SubscriptionStatus
    start_date: datetime
    end_date: datetime
    free_trial_start: Optional[datetime] = None
    free_trial_end: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CreateCheckoutRequest(BaseModel):
    plan_id: str
    success_url: str
    cancel_url: str

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-here-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# User Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Nome não pode estar vazio')
        if len(v.strip()) < 2:
            raise ValueError('Nome deve ter pelo menos 2 caracteres')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Senha deve ter pelo menos 6 caracteres')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Senhas não coincidem')
        return v

# Mood Models
class MoodCreate(BaseModel):
    mood_level: int = Field(..., ge=1, le=5, description="Nível do humor de 1 (muito triste) a 5 (muito feliz)")
    mood_emoji: str
    description: Optional[str] = Field(None, max_length=500)
    
    @validator('mood_emoji')
    def validate_emoji(cls, v):
        valid_emojis = ['😢', '😞', '😐', '😊', '😄']
        if v not in valid_emojis:
            raise ValueError('Emoji de humor inválido')
        return v

class MoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    mood_level: int
    mood_emoji: str
    description: Optional[str]
    date: datetime = Field(default_factory=datetime.utcnow)

class MoodResponse(BaseModel):
    id: str
    mood_level: int
    mood_emoji: str
    description: Optional[str]
    date: datetime

# Mission Models
class MissionCompleteRequest(BaseModel):
    mission_id: str

class DailyMissions(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: datetime = Field(default_factory=datetime.utcnow)
    meditate_completed: bool = False
    gratitude_completed: bool = False
    breathing_completed: bool = False
    total_xp_earned: int = 0

class MissionStatus(BaseModel):
    id: str
    name: str
    description: str
    xp_reward: int  # Stars reward (displayed as ⭐ Estrelas in frontend)
    completed: bool
    icon: str

class DailyMissionsResponse(BaseModel):
    date: datetime
    missions: List[MissionStatus]
    total_xp_today: int  # Total stars earned today
    possible_xp: int  # Possible stars for today

class UserStats(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    total_xp: int = 0
    current_level: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserStatsResponse(BaseModel):
    total_xp: int
    current_level: int
    xp_for_next_level: int
    xp_progress: int
    level_name: str
    level_emoji: str
    level_description: str
    level_tier: str

class ProfilePhotoUpdate(BaseModel):
    profile_photo: str
    
    @validator('profile_photo')
    def validate_base64_image(cls, v):
        if not v:
            raise ValueError('Foto não pode estar vazia')
        
        # Check if it's a valid base64 string with image format
        if not v.startswith('data:image/'):
            raise ValueError('Formato de imagem inválido')
            
        # Basic size check (rough estimate: base64 is ~4/3 the size of original)
        if len(v) > 10 * 1024 * 1024:  # ~7.5MB original image
            raise ValueError('Imagem muito grande (máximo 7MB)')
            
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    profile_photo: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Helper functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    
    return User(
        id=str(user['_id']),  # Use _id from MongoDB
        name=user['name'],
        email=user['email'],
        profile_photo=user.get('profile_photo'),
        created_at=user['created_at']
    )

# Auth Routes
@api_router.post("/register", response_model=Token)
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já está registrado"
        )
    
    # Create new user
    user_dict = {
        "id": str(uuid.uuid4()),
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create free trial for new user
    await create_free_trial(user_data.email)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.email}, expires_delta=access_token_expires
    )
    
    user = User(
        id=user_dict['id'],
        name=user_dict['name'],
        email=user_dict['email'],
        profile_photo=user_dict.get('profile_photo'),
        created_at=user_dict['created_at']
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@api_router.post("/login", response_model=Token)
async def login_user(user_data: UserLogin):
    # Find user by email
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    # Verify password
    if not verify_password(user_data.password, user['password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email']}, expires_delta=access_token_expires
    )
    
    user_obj = User(
        id=str(user['_id']),  # Use _id from MongoDB
        name=user['name'],
        email=user['email'],
        profile_photo=user.get('profile_photo'),
        created_at=user['created_at']
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )

@api_router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/profile/photo", response_model=User)
async def update_profile_photo(photo_data: ProfilePhotoUpdate, current_user: User = Depends(get_current_user)):
    # Update user profile photo in database
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"profile_photo": photo_data.profile_photo}}
    )
    
    # Get updated user data
    updated_user = await db.users.find_one({"id": current_user.id})
    
    return User(
        id=updated_user['id'],
        name=updated_user['name'],
        email=updated_user['email'],
        profile_photo=updated_user.get('profile_photo'),
        created_at=updated_user['created_at']
    )

# Mood Routes
@api_router.post("/mood", response_model=MoodResponse)
async def create_mood_entry(mood_data: MoodCreate, current_user: User = Depends(get_current_user)):
    # Check if user already has a mood entry for today
    today = datetime.utcnow().date()
    existing_mood = await db.humor_diario.find_one({
        "user_id": current_user.id,
        "date": {
            "$gte": datetime.combine(today, datetime.min.time()),
            "$lt": datetime.combine(today + timedelta(days=1), datetime.min.time())
        }
    })
    
    if existing_mood:
        # Update existing mood entry for today
        mood_dict = {
            "mood_level": mood_data.mood_level,
            "mood_emoji": mood_data.mood_emoji,
            "description": mood_data.description,
            "date": datetime.utcnow()
        }
        
        await db.humor_diario.update_one(
            {"_id": existing_mood["_id"]},
            {"$set": mood_dict}
        )
        
        return MoodResponse(
            id=existing_mood["id"],
            mood_level=mood_data.mood_level,
            mood_emoji=mood_data.mood_emoji,
            description=mood_data.description,
            date=mood_dict["date"]
        )
    else:
        # Create new mood entry
        mood_dict = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "mood_level": mood_data.mood_level,
            "mood_emoji": mood_data.mood_emoji,
            "description": mood_data.description,
            "date": datetime.utcnow()
        }
        
        mood_entry = MoodEntry(**mood_dict)
        await db.humor_diario.insert_one(mood_entry.dict())
        
        return MoodResponse(
            id=mood_entry.id,
            mood_level=mood_entry.mood_level,
            mood_emoji=mood_entry.mood_emoji,
            description=mood_entry.description,
            date=mood_entry.date
        )

@api_router.get("/mood", response_model=List[MoodResponse])
async def get_mood_history(current_user: User = Depends(get_current_user)):
    mood_entries = await db.humor_diario.find(
        {"user_id": current_user.id}
    ).sort("date", -1).to_list(100)  # Last 100 entries, newest first
    
    return [
        MoodResponse(
            id=mood["id"],
            mood_level=mood["mood_level"],
            mood_emoji=mood["mood_emoji"],
            description=mood.get("description"),
            date=mood["date"]
        )
        for mood in mood_entries
    ]

@api_router.get("/mood/today", response_model=Optional[MoodResponse])
async def get_today_mood(current_user: User = Depends(get_current_user)):
    today = datetime.utcnow().date()
    mood_entry = await db.humor_diario.find_one({
        "user_id": current_user.id,
        "date": {
            "$gte": datetime.combine(today, datetime.min.time()),
            "$lt": datetime.combine(today + timedelta(days=1), datetime.min.time())
        }
    })
    
    if mood_entry:
        return MoodResponse(
            id=mood_entry["id"],
            mood_level=mood_entry["mood_level"],
            mood_emoji=mood_entry["mood_emoji"],
            description=mood_entry.get("description"),
            date=mood_entry["date"]
        )
    
    return None

@api_router.get("/mood/week", response_model=List[MoodResponse])
async def get_week_mood(current_user: User = Depends(get_current_user)):
    # Get mood entries from the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    mood_entries = await db.humor_diario.find({
        "user_id": current_user.id,
        "date": {"$gte": seven_days_ago}
    }).sort("date", 1).to_list(7)  # Sort ascending (oldest first)
    
    return [
        MoodResponse(
            id=mood["id"],
            mood_level=mood["mood_level"],
            mood_emoji=mood["mood_emoji"],
            description=mood.get("description"),
            date=mood["date"]
        )
        for mood in mood_entries
    ]

# Helper functions for gamification (Estrelas ⭐)
def calculate_level_from_xp(xp: int) -> int:
    """Calculate user level based on total Stars - 100 Stars per level"""
    return (xp // 100) + 1

def get_xp_for_level(level: int) -> int:
    """Get minimum Stars required for a level"""
    return (level - 1) * 100

def get_xp_for_next_level(current_level: int) -> int:
    """Get Stars required for next level"""
    return current_level * 100

def get_level_info(level: int) -> dict:
    """Get level name, emoji and description based on current level"""
    if level <= 2:
        return {
            "name": "Semeador",
            "emoji": "🌱",
            "description": "Plantando as primeiras sementes do autocuidado",
            "tier": "iniciante"
        }
    elif level <= 5:
        return {
            "name": "Cultivador",
            "emoji": "🌿",
            "description": "Nutrindo seus hábitos de bem-estar",
            "tier": "crescimento"
        }
    elif level <= 8:
        return {
            "name": "Florescente",
            "emoji": "🌸",
            "description": "Vendo os frutos do seu esforço",
            "tier": "florescimento"
        }
    elif level <= 12:
        return {
            "name": "Enraizado",
            "emoji": "🌳",
            "description": "Forte e equilibrado emocionalmente",
            "tier": "estabilidade"
        }
    elif level <= 16:
        return {
            "name": "Transformado",
            "emoji": "🦋",
            "description": "Evoluído e resiliente",
            "tier": "transformação"
        }
    elif level <= 20:
        return {
            "name": "Iluminado",
            "emoji": "✨",
            "description": "Mestre do autocuidado",
            "tier": "maestria"
        }
    else:
        return {
            "name": "Guardião",
            "emoji": "🌟",
            "description": "Inspirando outros na jornada",
            "tier": "lendário"
        }

# Mission Routes
@api_router.get("/missions/today")
async def get_daily_missions(current_user: User = Depends(get_current_user)):
    """Get today's dynamic missions for the user"""
    
    # Check subscription status first
    
    # Initialize mission database if needed
    await initialize_mission_database()
    
    # Get user level for mission selection
    user_stats = await db.user_stats.find_one({"user_id": current_user.id})
    user_level = user_stats.get("current_level", 1) if user_stats else 1
    
    # Get today's missions (dynamic selection)
    missions = await get_daily_missions_for_user(current_user.id, user_level)
    
    # Calculate total XP earned today
    total_xp_today = sum(mission.get("xp_reward", 0) for mission in missions if mission.get("completed", False))
    possible_xp = sum(mission.get("xp_reward", 0) for mission in missions)
    
    return {
        "date": datetime.utcnow().date().isoformat(),
        "missions": missions,
        "total_xp_today": total_xp_today,
        "possible_xp": possible_xp,
        "user_level": user_level
    }

@api_router.post("/missions/complete")
async def complete_mission(request: MissionCompleteRequest, current_user: User = Depends(get_current_user)):
    """Complete a daily mission and earn XP"""
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    # Check if mission exists and is valid for today
    mission = await db.missions.find_one({"id": request.mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Check if user already completed this mission today
    existing_progress = await db.user_mission_progress.find_one({
        "user_id": current_user.id,
        "mission_id": request.mission_id,
        "date": {"$gte": today_start},
        "completed": True
    })
    
    if existing_progress:
        raise HTTPException(status_code=400, detail="Mission already completed today")
    
    # Create or update mission progress
    progress_id = str(uuid.uuid4())
    progress_data = UserMissionProgress(
        id=progress_id,
        user_id=current_user.id,
        mission_id=request.mission_id,
        date=datetime.utcnow(),
        completed=True,
        completed_at=datetime.utcnow(),
        xp_earned=mission["xp_reward"]
    )
    
    # Remove any existing incomplete progress for this mission today
    await db.user_mission_progress.delete_many({
        "user_id": current_user.id,
        "mission_id": request.mission_id,
        "date": {"$gte": today_start}
    })
    
    # Insert new completed progress
    await db.user_mission_progress.insert_one(progress_data.dict())
    
    # Update user XP
    await update_user_stats(current_user.id, mission["xp_reward"])
    
    # Calculate total XP earned today
    today_progress = await db.user_mission_progress.find({
        "user_id": current_user.id,
        "date": {"$gte": today_start},
        "completed": True
    }).to_list(100)
    
    total_xp_today = sum(p["xp_earned"] for p in today_progress)
    
    return {
        "success": True,
        "message": f"Mission '{mission['title']}' completed successfully!",
        "xp_earned": mission["xp_reward"],
        "total_xp_today": total_xp_today,
        "mission_title": mission["title"]
    }

@api_router.get("/user/stats", response_model=UserStatsResponse)
async def get_user_stats(current_user: User = Depends(get_current_user)):
    # Find or create user stats
    user_stats = await db.user_stats.find_one({"user_id": current_user.id})
    
    if not user_stats:
        # Create initial stats
        stats_dict = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "total_xp": 0,
            "current_level": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        user_stats_obj = UserStats(**stats_dict)
        await db.user_stats.insert_one(user_stats_obj.dict())
        user_stats = user_stats_obj.dict()
    
    current_level = calculate_level_from_xp(user_stats["total_xp"])
    xp_for_next = get_xp_for_next_level(current_level)
    xp_current_level = get_xp_for_level(current_level)
    xp_progress = user_stats["total_xp"] - xp_current_level
    
    # Get level info
    level_info = get_level_info(current_level)
    
    return UserStatsResponse(
        total_xp=user_stats["total_xp"],
        current_level=current_level,
        xp_for_next_level=xp_for_next - user_stats["total_xp"],
        xp_progress=xp_progress,
        level_name=level_info["name"],
        level_emoji=level_info["emoji"],
        level_description=level_info["description"],
        level_tier=level_info["tier"]
    )

async def update_user_stats(user_id: str, xp_to_add: int):
    """Update user stats with new XP"""
    user_stats = await db.user_stats.find_one({"user_id": user_id})
    
    if not user_stats:
        # Create initial stats
        stats_dict = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "total_xp": xp_to_add,
            "current_level": calculate_level_from_xp(xp_to_add),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        user_stats_obj = UserStats(**stats_dict)
        await db.user_stats.insert_one(user_stats_obj.dict())
    else:
        # Update existing stats
        new_xp = user_stats["total_xp"] + xp_to_add
        new_level = calculate_level_from_xp(new_xp)
        
        await db.user_stats.update_one(
            {"_id": user_stats["_id"]},
            {"$set": {
                "total_xp": new_xp,
                "current_level": new_level,
                "updated_at": datetime.utcnow()
            }}
        )

# Original routes
@api_router.get("/")
async def root():
    return {"message": "Mental Health App API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, current_user: User = Depends(get_current_user)):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(current_user: User = Depends(get_current_user)):
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Subscription Management APIs
@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    try:
        # Initialize default plans if none exist
        await initialize_default_plans()
        
        cursor = db.subscription_plans.find({"is_active": True}, {"_id": 0})  # Exclude _id field
        plans = await cursor.to_list(length=None)
        return {"plans": plans}
    except Exception as e:
        logger.error(f"Error getting plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription plans")

@api_router.get("/subscription/status")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    """Get user's current subscription status"""
    try:
        subscription_data = await db.user_subscriptions.find_one({"user_id": current_user.id})
        
        if not subscription_data:
            return {
                "has_subscription": False,
                "status": "none",
                "days_remaining": 0,
                "is_trial": False,
                "plan_name": None
            }
        
        subscription = UserSubscription(**subscription_data)
        now = datetime.utcnow()
        
        if subscription.status == SubscriptionStatus.FREE_TRIAL:
            days_remaining = (subscription.free_trial_end - now).days
            return {
                "has_subscription": days_remaining > 0,
                "status": "free_trial",
                "days_remaining": max(0, days_remaining),
                "is_trial": True,
                "plan_name": "Período Gratuito",
                "end_date": subscription.free_trial_end.isoformat()
            }
        
        if subscription.status == SubscriptionStatus.ACTIVE:
            days_remaining = (subscription.end_date - now).days
            plan = await db.subscription_plans.find_one({"id": subscription.plan_id})
            return {
                "has_subscription": days_remaining > 0,
                "status": "active",
                "days_remaining": max(0, days_remaining),
                "is_trial": False,
                "plan_name": plan['name'] if plan else "Plano Ativo",
                "end_date": subscription.end_date.isoformat()
            }
        
        return {
            "has_subscription": False,
            "status": subscription.status,
            "days_remaining": 0,
            "is_trial": False,
            "plan_name": None
        }
        
    except Exception as e:
        logger.error(f"Error getting subscription status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription status")

@api_router.post("/subscription/checkout")
async def create_checkout_session(request: CreateCheckoutRequest, current_user: User = Depends(get_current_user)):
    """Create Stripe checkout session for subscription"""
    try:
        # Get the plan details
        plan = await db.subscription_plans.find_one({"id": request.plan_id, "is_active": True})
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Initialize Stripe checkout
        host_url = request.success_url.split('/')[0] + '//' + request.success_url.split('/')[2]
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=plan['price'],
            currency="brl",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                "user_id": current_user.id,
                "plan_id": request.plan_id,
                "plan_name": plan['name']
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            user_id=current_user.id,
            plan_id=request.plan_id,
            stripe_session_id=session.session_id,
            amount=plan['price'],
            currency="brl",
            payment_status="pending",
            metadata=checkout_request.metadata
        )
        
        await db.payment_transactions.insert_one(transaction.dict())
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@api_router.get("/subscription/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: User = Depends(get_current_user)):
    """Get status of a checkout session"""
    try:
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Get checkout status from Stripe
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        # Get current transaction
        transaction = await db.payment_transactions.find_one({"stripe_session_id": session_id})
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # If payment is completed but transaction is still pending, process it
        if status_response.payment_status == "paid" and transaction.get("payment_status") == "pending":
            logger.info(f"Processing completed payment for session {session_id}")
            
            # Update transaction status
            await db.payment_transactions.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Activate subscription
            success = await activate_subscription(transaction['user_id'], transaction['plan_id'])
            if success:
                logger.info(f"Subscription activated for user {transaction['user_id']}")
            else:
                logger.error(f"Failed to activate subscription for user {transaction['user_id']}")
        
        # Update transaction with current status if needed
        elif transaction.get("payment_status") != status_response.payment_status:
            await db.payment_transactions.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "payment_status": status_response.payment_status,
                    "updated_at": datetime.utcnow()
                }}
            )
        
        return {
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency
        }
        
    except Exception as e:
        logger.error(f"Error getting checkout status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get checkout status")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        stripe_signature = request.headers.get("Stripe-Signature")
        
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        # Update payment status based on webhook
        if webhook_response.payment_status == "paid":
            # Find the transaction
            transaction = await db.payment_transactions.find_one({
                "stripe_session_id": webhook_response.session_id
            })
            
            if transaction:
                # Update transaction status
                await db.payment_transactions.update_one(
                    {"stripe_session_id": webhook_response.session_id},
                    {"$set": {
                        "payment_status": webhook_response.payment_status,
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                # Activate subscription
                await activate_subscription(transaction['user_id'], transaction['plan_id'])
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error handling Stripe webhook: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# Subscription helper functions
async def initialize_default_plans():
    """Initialize default subscription plans"""
    plans = [
        {
            "id": "monthly",
            "name": "Plano Mensal",
            "description": "Acesso completo por 1 mês",
            "price": 10.00,
            "duration_months": 1,
            "plan_type": "monthly",
            "features": [
                "Registro de humor diário",
                "Missões de autocuidado",
                "Progresso emocional",
                "Sistema de níveis e XP",
                "Notificações personalizadas"
            ],
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": "quarterly",
            "name": "Plano Semestral",
            "description": "Acesso completo por 6 meses",
            "price": 50.00,
            "duration_months": 6,
            "plan_type": "quarterly",
            "features": [
                "Todos os recursos do plano mensal",
                "Relatórios detalhados",
                "Análise de tendências",
                "Suporte prioritário"
            ],
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": "yearly",
            "name": "Plano Anual",
            "description": "Acesso completo por 1 ano",
            "price": 100.00,
            "duration_months": 12,
            "plan_type": "yearly",
            "features": [
                "Todos os recursos dos planos anteriores",
                "Backup de dados",
                "Insights avançados",
                "Sessões de coaching (mensais)"
            ],
            "is_active": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    for plan in plans:
        existing = await db.subscription_plans.find_one({"id": plan["id"]})
        if not existing:
            await db.subscription_plans.insert_one(plan)
            logger.info(f"Created plan: {plan['name']}")

async def create_free_trial(user_id: str):
    """Create a 7-day free trial for new user"""
    try:
        existing = await db.user_subscriptions.find_one({"user_id": user_id})
        if existing:
            return  # User already has a subscription
        
        now = datetime.utcnow()
        trial_end = now + timedelta(days=7)
        
        subscription = {
            "user_id": user_id,
            "plan_id": "free_trial",
            "status": "free_trial",
            "start_date": now,
            "end_date": trial_end,
            "free_trial_start": now,
            "free_trial_end": trial_end,
            "created_at": now,
            "updated_at": now
        }
        
        await db.user_subscriptions.insert_one(subscription)
        logger.info(f"Created free trial for user: {user_id}")
        
    except Exception as e:
        logger.error(f"Error creating free trial: {e}")

async def activate_subscription(user_id: str, plan_id: str):
    """Activate user subscription after successful payment"""
    try:
        plan = await db.subscription_plans.find_one({"id": plan_id, "is_active": True})
        if not plan:
            return False
        
        now = datetime.utcnow()
        end_date = now + timedelta(days=30 * plan['duration_months'])
        
        subscription_data = {
            "user_id": user_id,
            "plan_id": plan_id,
            "status": "active",
            "start_date": now,
            "end_date": end_date,
            "updated_at": now
        }
        
        result = await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": subscription_data},
            upsert=True
        )
        
        logger.info(f"Activated subscription for user {user_id} with plan {plan_id}")
        return result.modified_count > 0 or result.upserted_id is not None
        
    except Exception as e:
        logger.error(f"Error activating subscription: {e}")
        return False

# Subscription middleware to check access - DISABLED (all features available)
async def check_subscription_access(current_user: User = Depends(get_current_user)):
    """Middleware to check if user has active subscription - DISABLED"""
    # All features are now available without subscription checks
    return None

# Chat endpoints
@api_router.post("/chat/send", response_model=ChatResponse)
async def send_chat_message(request: SendMessageRequest, current_user: User = Depends(get_current_user)):
    """Send a message to the therapist chat"""
    try:
        # Get or create conversation
        conversation_id = request.conversation_id
        if not conversation_id:
            # Create new conversation
            conversation_id = str(uuid.uuid4())
            conversation = ChatConversation(
                id=conversation_id,
                user_id=current_user.id,
                title=request.message[:50] + "..." if len(request.message) > 50 else request.message
            )
            await db.chat_conversations.insert_one(conversation.dict())
        else:
            # Update existing conversation
            await db.chat_conversations.update_one(
                {"id": conversation_id, "user_id": current_user.id},
                {"$set": {"updated_at": datetime.utcnow()}}
            )

        # Get user context for personalized responses
        user_context = await get_user_context_for_chat(current_user.id)
        
        # Create system message with therapist persona and user context
        system_message = create_therapist_system_message(user_context)
        
        # Initialize Gemini chat
        EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="LLM key not configured")
            
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation_id,
            system_message=system_message
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Load conversation history
        messages = await db.chat_messages.find({
            "conversation_id": conversation_id,
            "user_id": current_user.id
        }).sort("timestamp", 1).limit(20).to_list(20)
        
        # Send message to AI (include recent history in context)
        user_message = UserMessage(text=request.message)
        ai_response = await chat.send_message(user_message)
        
        # Save user message
        user_msg_id = str(uuid.uuid4())
        user_message_obj = ChatMessage(
            id=user_msg_id,
            conversation_id=conversation_id,
            user_id=current_user.id,
            role=MessageRole.USER,
            content=request.message,
            user_mood_context=user_context.get("mood"),
            user_missions_context=user_context.get("missions")
        )
        await db.chat_messages.insert_one(user_message_obj.dict())
        
        # Save AI response
        ai_msg_id = str(uuid.uuid4())
        ai_message_obj = ChatMessage(
            id=ai_msg_id,
            conversation_id=conversation_id,
            user_id=current_user.id,
            role=MessageRole.ASSISTANT,
            content=ai_response
        )
        await db.chat_messages.insert_one(ai_message_obj.dict())
        
        # Update conversation message count
        await db.chat_conversations.update_one(
            {"id": conversation_id},
            {"$inc": {"message_count": 2}}
        )
        
        return ChatResponse(
            message=ai_response,
            conversation_id=conversation_id,
            message_id=ai_msg_id,
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar mensagem")

@api_router.get("/chat/conversations")
async def get_user_conversations(current_user: User = Depends(get_current_user)):
    """Get user's chat conversations"""
    conversations = await db.chat_conversations.find({
        "user_id": current_user.id
    }).sort("updated_at", -1).to_list(50)
    
    # Convert ObjectId to string for JSON serialization
    for conv in conversations:
        if "_id" in conv:
            conv["_id"] = str(conv["_id"])
    
    return {"conversations": conversations}

@api_router.get("/chat/conversation/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, current_user: User = Depends(get_current_user)):
    """Get messages from a specific conversation"""
    # Verify conversation belongs to user
    conversation = await db.chat_conversations.find_one({
        "id": conversation_id,
        "user_id": current_user.id
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = await db.chat_messages.find({
        "conversation_id": conversation_id,
        "user_id": current_user.id
    }).sort("timestamp", 1).to_list(100)
    
    # Convert ObjectId to string for JSON serialization
    for msg in messages:
        if "_id" in msg:
            msg["_id"] = str(msg["_id"])
    
    if conversation and "_id" in conversation:
        conversation["_id"] = str(conversation["_id"])
    
    return {"messages": messages, "conversation": conversation}

async def get_user_context_for_chat(user_id: str) -> dict:
    """Get user's recent data for chat context"""
    context = {}
    
    # Get recent mood data (last 7 days)
    recent_moods = await db.moods.find({
        "user_id": user_id
    }).sort("date", -1).limit(7).to_list(7)
    
    if recent_moods:
        context["mood"] = {
            "recent_entries": len(recent_moods),
            "latest_mood": recent_moods[0]["mood_level"] if recent_moods else None,
            "latest_emoji": recent_moods[0]["mood_emoji"] if recent_moods else None,
            "trend": "improving" if len(recent_moods) > 1 and recent_moods[0]["mood_level"] > recent_moods[-1]["mood_level"] else "stable"
        }
    
    # Get mission completion data (today)
    today = datetime.utcnow().date()
    completed_missions = await db.user_missions.find({
        "user_id": user_id,
        "date": {"$gte": datetime.combine(today, datetime.min.time())},
        "completed": True
    }).to_list(10)
    
    if completed_missions:
        context["missions"] = {
            "completed_today": len(completed_missions),
            "mission_types": [mission.get("mission_type") for mission in completed_missions]
        }
    
    # Get user stats
    user_stats = await db.user_stats.find_one({"user_id": user_id})
    if user_stats:
        context["progress"] = {
            "level": user_stats.get("current_level", 1),
            "xp": user_stats.get("total_xp", 0)
        }
    
    return context

def create_therapist_system_message(user_context: dict) -> str:
    """Create personalized therapist system message"""
    base_message = """Você é Dr. Ana, uma terapeuta experiente e empática especializada em saúde mental e bem-estar. 
    
Sua personalidade:
- Calorosa, compreensiva e não julgadora
- Usa uma linguagem acolhedora e profissional
- Faz perguntas reflexivas para ajudar o usuário a se conhecer melhor
- Oferece estratégias práticas de autocuidado
- Celebra pequenas vitórias e progressos
- Sempre mantém o foco no bem-estar emocional do usuário

Diretrizes importantes:
- Seja sempre empática e validativa
- Faça perguntas abertas para incentivar reflexão
- Ofereça dicas práticas de mindfulness, respiração ou autocuidado quando apropriado
- Se o usuário mencionar pensamentos de autolesão, oriente-o a procurar ajuda profissional imediata
- Mantenha as respostas focadas, úteis e esperançosas
- Use linguagem simples e acessível
- Termine suas respostas com pergunta reflexiva ou sugestão prática quando apropriado"""

    # Add user context if available
    context_additions = []
    
    if user_context.get("mood"):
        mood_info = user_context["mood"]
        if mood_info.get("latest_mood"):
            emoji = mood_info.get("latest_emoji", "")
            level = mood_info.get("latest_mood")
            context_additions.append(f"O usuário registrou seu humor recente como nível {level} {emoji}.")
    
    if user_context.get("missions"):
        missions_info = user_context["missions"]
        completed = missions_info.get("completed_today", 0)
        if completed > 0:
            context_additions.append(f"Hoje o usuário completou {completed} missões de autocuidado.")
    
    if user_context.get("progress"):
        progress_info = user_context["progress"]
        level = progress_info.get("level", 1)
        context_additions.append(f"O usuário está no nível {level} de progresso no aplicativo.")
    
    if context_additions:
        context_text = " ".join(context_additions)
        base_message += f"\n\nContexto atual do usuário: {context_text} Use essas informações para personalizar sua resposta e mostrar que você está acompanhando o progresso dele."
    
    return base_message

# Dynamic Mission System
async def initialize_mission_database():
    """Initialize the mission database with all available missions"""
    
    missions = [
        # MINDFULNESS & MEDITAÇÃO
        Mission(
            id="mindfulness_meditation_5min",
            title="Medite por 5 minutos",
            description="Encontre um local tranquilo e pratique meditação por 5 minutos",
            category=MissionCategory.MINDFULNESS,
            difficulty=MissionDifficulty.EASY,
            xp_reward=15,
            min_level=1,
            icon="flower",
            tips=["Use um app de meditação", "Foque na respiração", "Não se preocupe se a mente divagar"],
            estimated_minutes=5
        ),
        Mission(
            id="breathing_478",
            title="Respiração 4-7-8",
            description="Pratique a técnica de respiração 4-7-8 por 3 ciclos completos",
            category=MissionCategory.MINDFULNESS,
            difficulty=MissionDifficulty.EASY,
            xp_reward=10,
            min_level=1,
            icon="leaf",
            tips=["Inspire por 4 segundos", "Segure por 7 segundos", "Expire por 8 segundos"],
            estimated_minutes=3
        ),
        Mission(
            id="body_scan",
            title="Body Scan de 3 minutos",
            description="Faça um escaneamento corporal focando em cada parte do seu corpo",
            category=MissionCategory.MINDFULNESS,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=12,
            min_level=2,
            icon="body",
            tips=["Comece pela cabeça", "Desça lentamente pelo corpo", "Note tensões sem julgamento"],
            estimated_minutes=3
        ),
        Mission(
            id="mindful_eating",
            title="Refeição consciente",
            description="Pratique atenção plena durante uma refeição ou lanche",
            category=MissionCategory.MINDFULNESS,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=15,
            min_level=3,
            icon="restaurant",
            tips=["Coma devagar", "Saboreie cada mordida", "Note texturas e sabores"],
            estimated_minutes=15
        ),

        # GRATIDÃO & POSITIVIDADE
        Mission(
            id="gratitude_list",
            title="Liste 3 gratidões",
            description="Escreva ou pense em 3 coisas pelas quais você é grato hoje",
            category=MissionCategory.GRATITUDE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=10,
            min_level=1,
            icon="heart",
            tips=["Podem ser coisas simples", "Seja específico", "Sinta a emoção"],
            estimated_minutes=3
        ),
        Mission(
            id="positive_message",
            title="Mensagem positiva",
            description="Envie uma mensagem carinhosa ou positiva para alguém especial",
            category=MissionCategory.GRATITUDE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=12,
            min_level=1,
            icon="chatbox-ellipses",
            tips=["Seja genuíno", "Pode ser um elogio", "Ou só dizer que está pensando na pessoa"],
            estimated_minutes=2
        ),
        Mission(
            id="self_compliment",
            title="Elogio para si mesmo",
            description="Escreva um elogio sincero sobre você mesmo",
            category=MissionCategory.GRATITUDE,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=15,
            min_level=2,
            icon="ribbon",
            tips=["Foque em qualidades pessoais", "Seja gentil consigo", "Aceite suas virtudes"],
            estimated_minutes=5
        ),
        Mission(
            id="happy_moment",
            title="Momento feliz do dia",
            description="Anote um momento que te trouxe alegria ou satisfação hoje",
            category=MissionCategory.GRATITUDE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=8,
            min_level=1,
            icon="sunny",
            tips=["Pode ser algo pequeno", "Reviva a sensação", "Guarde na memória"],
            estimated_minutes=3
        ),

        # MOVIMENTO & ENERGIA
        Mission(
            id="walk_10min",
            title="Caminhada de 10 minutos",
            description="Faça uma caminhada ao ar livre ou em casa por 10 minutos",
            category=MissionCategory.MOVEMENT,
            difficulty=MissionDifficulty.EASY,
            xp_reward=15,
            min_level=1,
            icon="walk",
            tips=["Pode ser dentro de casa", "Mantenha ritmo confortável", "Respire profundamente"],
            estimated_minutes=10
        ),
        Mission(
            id="stretching_5min",
            title="Alongamento de 5 minutos",
            description="Faça alongamentos suaves para relaxar o corpo",
            category=MissionCategory.MOVEMENT,
            difficulty=MissionDifficulty.EASY,
            xp_reward=12,
            min_level=1,
            icon="fitness",
            tips=["Alongue pescoço e ombros", "Respire durante os alongamentos", "Vá no seu ritmo"],
            estimated_minutes=5
        ),
        Mission(
            id="dance_song",
            title="Dance uma música",
            description="Coloque uma música que você gosta e dance livremente",
            category=MissionCategory.MOVEMENT,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=18,
            min_level=1,
            icon="musical-notes",
            tips=["Escolha uma música animada", "Dance como quiser", "Divirta-se sem julgamento"],
            estimated_minutes=4
        ),
        Mission(
            id="stairs_exercise",
            title="Suba e desça escadas",
            description="Use as escadas 3 vezes como exercício (ou simule o movimento)",
            category=MissionCategory.MOVEMENT,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=20,
            min_level=2,
            icon="trending-up",
            tips=["Se não tiver escadas, simule o movimento", "Mantenha-se seguro", "Hidrate-se após"],
            estimated_minutes=5
        ),

        # CONEXÃO SOCIAL
        Mission(
            id="call_friend",
            title="Ligue para alguém querido",
            description="Faça uma ligação para um amigo, familiar ou pessoa especial",
            category=MissionCategory.SOCIAL,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=20,
            min_level=1,
            icon="call",
            tips=["Pode ser uma ligação rápida", "Pergunte como a pessoa está", "Compartilhe algo sobre seu dia"],
            estimated_minutes=10
        ),
        Mission(
            id="genuine_compliment",
            title="Faça um elogio genuíno",
            description="Dê um elogio sincero para alguém (pessoalmente ou por mensagem)",
            category=MissionCategory.SOCIAL,
            difficulty=MissionDifficulty.EASY,
            xp_reward=15,
            min_level=1,
            icon="thumbs-up",
            tips=["Seja específico no elogio", "Note algo que a pessoa fez bem", "Seja autêntico"],
            estimated_minutes=2
        ),
        Mission(
            id="help_someone",
            title="Ajude alguém hoje",
            description="Ofereça ajuda para alguém, mesmo que seja algo pequeno",
            category=MissionCategory.SOCIAL,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=25,
            min_level=2,
            icon="people",
            tips=["Pode ser segurar uma porta", "Ajudar com uma tarefa", "Ou simplesmente ouvir alguém"],
            estimated_minutes=10
        ),
        Mission(
            id="new_conversation",
            title="Converse com alguém novo",
            description="Inicie uma conversa amigável com alguém novo ou que você pouco fala",
            category=MissionCategory.SOCIAL,
            difficulty=MissionDifficulty.HARD,
            xp_reward=30,
            min_level=3,
            icon="chatbubbles",
            tips=["Comece com um cumprimento", "Faça uma pergunta aberta", "Seja curioso e respeitoso"],
            estimated_minutes=15
        ),

        # AUTOCUIDADO
        Mission(
            id="relaxing_bath",
            title="Banho relaxante",
            description="Tome um banho quente relaxante, focando no momento presente",
            category=MissionCategory.SELFCARE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=15,
            min_level=1,
            icon="water",
            tips=["Use água numa temperatura agradável", "Foque nas sensações", "Desacelere o ritmo"],
            estimated_minutes=15
        ),
        Mission(
            id="hydrate_water",
            title="Hidrate-se bem",
            description="Beba pelo menos 2 copos de água pura",
            category=MissionCategory.SELFCARE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=8,
            min_level=1,
            icon="water-outline",
            tips=["Beba devagar", "Use um copo bonito", "Adicione limão se quiser"],
            estimated_minutes=5
        ),
        Mission(
            id="organize_space",
            title="Organize seu espaço",
            description="Organize e limpe seu ambiente por 10 minutos",
            category=MissionCategory.SELFCARE,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=18,
            min_level=2,
            icon="home",
            tips=["Comece por uma área pequena", "Coloque as coisas no lugar", "Crie um ambiente mais agradável"],
            estimated_minutes=10
        ),
        Mission(
            id="skincare_routine",
            title="Cuidados pessoais",
            description="Dedique tempo aos seus cuidados pessoais (skincare, cabelo, etc.)",
            category=MissionCategory.SELFCARE,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=20,
            min_level=1,
            icon="rose",
            tips=["Use produtos que tem em casa", "Faça com carinho", "Aproveite o momento"],
            estimated_minutes=15
        ),

        # CRIATIVIDADE & EXPRESSÃO
        Mission(
            id="draw_doodle",
            title="Desenhe livremente",
            description="Desenhe ou rabisque por 5 minutos, sem se preocupar com o resultado",
            category=MissionCategory.CREATIVITY,
            difficulty=MissionDifficulty.EASY,
            xp_reward=12,
            min_level=1,
            icon="brush",
            tips=["Não precisa ser perfeito", "Use qualquer papel", "Deixe a mão fluir"],
            estimated_minutes=5
        ),
        Mission(
            id="write_feelings",
            title="Escreva sobre sentimentos",
            description="Escreva sobre como você se sente hoje, sem censura",
            category=MissionCategory.CREATIVITY,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=15,
            min_level=1,
            icon="journal",
            tips=["Seja honesto consigo", "Não se preocupe com gramática", "Escreva o que vier à mente"],
            estimated_minutes=10
        ),
        Mission(
            id="sing_song",
            title="Cante uma música",
            description="Cante uma música que você gosta, em voz alta ou baixa",
            category=MissionCategory.CREATIVITY,
            difficulty=MissionDifficulty.EASY,
            xp_reward=10,
            min_level=1,
            icon="mic",
            tips=["Escolha uma música que te faz bem", "Não se preocupe se desafinar", "Divirta-se!"],
            estimated_minutes=3
        ),
        Mission(
            id="photo_beauty",
            title="Foto de algo bonito",
            description="Tire uma foto de algo que considera bonito ao seu redor",
            category=MissionCategory.CREATIVITY,
            difficulty=MissionDifficulty.EASY,
            xp_reward=8,
            min_level=1,
            icon="camera",
            tips=["Pode ser algo simples", "Note a beleza no cotidiano", "Aprecie o momento"],
            estimated_minutes=5
        ),

        # NATUREZA & AMBIENTE
        Mission(
            id="outdoor_time",
            title="10 minutos ao ar livre",
            description="Passe pelo menos 10 minutos em contato com a natureza",
            category=MissionCategory.NATURE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=15,
            min_level=1,
            icon="leaf-outline",
            tips=["Pode ser no quintal, varanda ou parque", "Respire o ar fresco", "Observe a natureza"],
            estimated_minutes=10
        ),
        Mission(
            id="plant_care",
            title="Cuide de uma planta",
            description="Regue, limpe ou simplesmente observe uma planta com atenção",
            category=MissionCategory.NATURE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=10,
            min_level=1,
            icon="flower-outline",
            tips=["Se não tem plantas, observe uma na rua", "Note detalhes das folhas", "Aprecie a vida verde"],
            estimated_minutes=5
        ),
        Mission(
            id="sky_watching",
            title="Observe o céu",
            description="Pare por alguns minutos para observar o céu e as nuvens",
            category=MissionCategory.NATURE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=8,
            min_level=1,
            icon="cloud",
            tips=["Procure formas nas nuvens", "Respire profundamente", "Aprecie a imensidão"],
            estimated_minutes=5
        ),
        Mission(
            id="fresh_air",
            title="Respire ar fresco",
            description="Abra a janela ou saia por um momento para respirar ar fresco",
            category=MissionCategory.NATURE,
            difficulty=MissionDifficulty.EASY,
            xp_reward=5,
            min_level=1,
            icon="wind",
            tips=["Respire profundamente", "Sinta o ar entrando nos pulmões", "Aproveite a sensação"],
            estimated_minutes=3
        ),

        # APRENDIZADO & CRESCIMENTO
        Mission(
            id="read_pages",
            title="Leia 5 páginas",
            description="Leia 5 páginas de um livro, artigo ou conteúdo educativo",
            category=MissionCategory.LEARNING,
            difficulty=MissionDifficulty.EASY,
            xp_reward=12,
            min_level=1,
            icon="library",
            tips=["Pode ser qualquer tipo de leitura", "Foque no conteúdo", "Aprenda algo novo"],
            estimated_minutes=10
        ),
        Mission(
            id="new_word",
            title="Aprenda uma palavra nova",
            description="Pesquise e aprenda o significado de uma palavra que não conhece",
            category=MissionCategory.LEARNING,
            difficulty=MissionDifficulty.EASY,
            xp_reward=8,
            min_level=1,
            icon="school",
            tips=["Use um dicionário online", "Tente usar a palavra em uma frase", "Anote se quiser"],
            estimated_minutes=5
        ),
        Mission(
            id="educational_video",
            title="Vídeo educativo",
            description="Assista a um vídeo educativo curto sobre algo que te interessa",
            category=MissionCategory.LEARNING,
            difficulty=MissionDifficulty.EASY,
            xp_reward=10,
            min_level=2,
            icon="play-circle",
            tips=["Escolha um tópico interessante", "Pode ser no YouTube", "Tome notas mentais"],
            estimated_minutes=10
        ),
        Mission(
            id="daily_reflection",
            title="Reflexão diária",
            description="Reflita sobre uma lição ou aprendizado que teve hoje",
            category=MissionCategory.LEARNING,
            difficulty=MissionDifficulty.MEDIUM,
            xp_reward=15,
            min_level=2,
            icon="bulb",
            tips=["O que você aprendeu hoje?", "Como pode aplicar isso?", "Que insight teve?"],
            estimated_minutes=8
        )
    ]

    # Check if missions are already in database
    existing_count = await db.missions.count_documents({})
    
    if existing_count == 0:
        logger.info("Initializing mission database with all missions...")
        for mission in missions:
            await db.missions.insert_one(mission.dict())
        logger.info(f"Added {len(missions)} missions to database")
    else:
        logger.info(f"Mission database already initialized with {existing_count} missions")

async def get_daily_missions_for_user(user_id: str, user_level: int = 1) -> List[dict]:
    """Generate or retrieve daily missions for a user"""
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    # Check if user already has missions for today
    existing_set = await db.daily_mission_sets.find_one({
        "user_id": user_id,
        "date": {"$gte": today_start}
    })
    
    if existing_set:
        # Get missions for existing set
        mission_ids = existing_set["missions"]
        missions = []
        for mission_id in mission_ids:
            mission = await db.missions.find_one({"id": mission_id})
            if mission:
                missions.append(mission)
    else:
        # Generate new missions for today
        import random
        
        # Get all available missions for user level
        available_missions = await db.missions.find({
            "min_level": {"$lte": user_level}
        }).to_list(100)
        
        # Group by category to ensure variety
        by_category = {}
        for mission in available_missions:
            category = mission["category"]
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(mission)
        
        # Select 3 missions from different categories when possible
        selected_missions = []
        categories_used = []
        
        # Try to get one from each category first
        available_categories = list(by_category.keys())
        random.shuffle(available_categories)
        
        for category in available_categories:
            if len(selected_missions) < 3:
                mission = random.choice(by_category[category])
                selected_missions.append(mission)
                categories_used.append(category)
        
        # If we need more missions, fill from unused categories or randomly
        while len(selected_missions) < 3:
            remaining_missions = [m for m in available_missions if m not in selected_missions]
            if remaining_missions:
                selected_missions.append(random.choice(remaining_missions))
        
        # Save daily mission set
        mission_set = DailyMissionSet(
            id=str(uuid.uuid4()),
            date=datetime.utcnow(),
            missions=[m["id"] for m in selected_missions],
            user_id=user_id
        )
        
        await db.daily_mission_sets.insert_one(mission_set.dict())
        missions = selected_missions
    
    # Get user progress for today's missions and clean ObjectIds
    for mission in missions:
        # Convert ObjectId to string
        if "_id" in mission:
            mission["_id"] = str(mission["_id"])
            
        progress = await db.user_mission_progress.find_one({
            "user_id": user_id,
            "mission_id": mission["id"],
            "date": {"$gte": today_start}
        })
        
        mission["completed"] = progress["completed"] if progress else False
        mission["progress_id"] = str(progress["_id"]) if progress else None
    
    return missions

@app.on_event("startup")
async def startup_event():
    """Initialize app on startup"""
    await initialize_default_plans()
    await initialize_mission_database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*", "Authorization", "Content-Type"],
)

# ============================================
# NEW FEATURES: High Priority Functionalities
# ============================================

# 1. Gratitude Journal Models
class GratitudeEntry(BaseModel):
    id: str
    user_id: str
    gratitudes: List[str]  # List of 3 things user is grateful for
    reflection: Optional[str] = None  # Optional free text
    date: datetime
    created_at: datetime

class GratitudeEntryCreate(BaseModel):
    gratitudes: List[str]
    reflection: Optional[str] = None

class GratitudeEntryResponse(BaseModel):
    id: str
    gratitudes: List[str]
    reflection: Optional[str]
    date: str
    created_at: str

# 2. Breathing Exercise Models
class BreathingTechnique(str, Enum):
    FOUR_SEVEN_EIGHT = "4-7-8"  # Anxiety relief
    BOX_BREATHING = "box"  # Focus
    DEEP_BREATHING = "deep"  # Relaxation

class BreathingSession(BaseModel):
    id: str
    user_id: str
    technique: BreathingTechnique
    duration_seconds: int
    completed: bool
    date: datetime
    created_at: datetime

class BreathingSessionCreate(BaseModel):
    technique: BreathingTechnique
    duration_seconds: int
    completed: bool = True

class BreathingSessionResponse(BaseModel):
    id: str
    technique: str
    duration_seconds: int
    completed: bool
    date: str
    stars_earned: int  # Gamification

# 3. Reminders/Habits Models
class ReminderType(str, Enum):
    MOOD = "mood"  # Register mood
    WATER = "water"  # Drink water
    BREAK = "break"  # Take a break
    SLEEP = "sleep"  # Time to sleep
    MEDITATION = "meditation"  # Meditate
    GRATITUDE = "gratitude"  # Write gratitude

class UserReminder(BaseModel):
    id: str
    user_id: str
    type: ReminderType
    title: str
    time: str  # Format: "HH:MM"
    enabled: bool
    days: List[int]  # 0-6 (Monday to Sunday)
    created_at: datetime
    updated_at: datetime

class ReminderCreate(BaseModel):
    type: ReminderType
    title: str
    time: str
    enabled: bool = True
    days: List[int] = [0, 1, 2, 3, 4, 5, 6]  # All days by default

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    time: Optional[str] = None
    enabled: Optional[bool] = None
    days: Optional[List[int]] = None

# ============================================
# GRATITUDE JOURNAL ENDPOINTS
# ============================================

@api_router.post("/gratitude", response_model=GratitudeEntryResponse)
async def create_gratitude_entry(
    entry: GratitudeEntryCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new gratitude journal entry"""
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Check if entry already exists for today
        existing = await db.gratitude_entries.find_one({
            "user_id": current_user.id,
            "date": {"$gte": today, "$lt": today + timedelta(days=1)}
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Você já registrou gratidão hoje. Edite a entrada existente.")
        
        entry_dict = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "gratitudes": entry.gratitudes[:3],  # Max 3
            "reflection": entry.reflection,
            "date": today,
            "created_at": datetime.utcnow()
        }
        
        await db.gratitude_entries.insert_one(entry_dict)
        
        # Award 10 stars for gratitude practice
        await db.user_stats.update_one(
            {"user_id": current_user.id},
            {"$inc": {"total_xp": 10}}
        )
        
        return GratitudeEntryResponse(
            id=entry_dict["id"],
            gratitudes=entry_dict["gratitudes"],
            reflection=entry_dict["reflection"],
            date=entry_dict["date"].isoformat(),
            created_at=entry_dict["created_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating gratitude entry: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar entrada de gratidão")

@api_router.get("/gratitude/today")
async def get_today_gratitude(current_user: User = Depends(get_current_user)):
    """Get today's gratitude entry"""
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        entry = await db.gratitude_entries.find_one({
            "user_id": current_user.id,
            "date": {"$gte": today, "$lt": today + timedelta(days=1)}
        })
        
        if not entry:
            return None
        
        return GratitudeEntryResponse(
            id=entry["id"],
            gratitudes=entry["gratitudes"],
            reflection=entry.get("reflection"),
            date=entry["date"].isoformat(),
            created_at=entry["created_at"].isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error fetching today's gratitude: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar gratidão de hoje")

@api_router.get("/gratitude/history")
async def get_gratitude_history(
    limit: int = 30,
    current_user: User = Depends(get_current_user)
):
    """Get gratitude history"""
    try:
        entries = await db.gratitude_entries.find(
            {"user_id": current_user.id}
        ).sort("date", -1).limit(limit).to_list(length=limit)
        
        return [
            GratitudeEntryResponse(
                id=entry["id"],
                gratitudes=entry["gratitudes"],
                reflection=entry.get("reflection"),
                date=entry["date"].isoformat(),
                created_at=entry["created_at"].isoformat()
            )
            for entry in entries
        ]
        
    except Exception as e:
        logger.error(f"Error fetching gratitude history: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar histórico")

# ============================================
# BREATHING EXERCISES ENDPOINTS
# ============================================

@api_router.post("/breathing/session", response_model=BreathingSessionResponse)
async def create_breathing_session(
    session: BreathingSessionCreate,
    current_user: User = Depends(get_current_user)
):
    """Record a breathing exercise session"""
    try:
        session_dict = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "technique": session.technique.value,
            "duration_seconds": session.duration_seconds,
            "completed": session.completed,
            "date": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        await db.breathing_sessions.insert_one(session_dict)
        
        # Award stars (5 stars per session)
        stars_earned = 5 if session.completed else 0
        if stars_earned > 0:
            await db.user_stats.update_one(
                {"user_id": current_user.id},
                {"$inc": {"total_xp": stars_earned}}
            )
        
        return BreathingSessionResponse(
            id=session_dict["id"],
            technique=session_dict["technique"],
            duration_seconds=session_dict["duration_seconds"],
            completed=session_dict["completed"],
            date=session_dict["date"].isoformat(),
            stars_earned=stars_earned
        )
        
    except Exception as e:
        logger.error(f"Error creating breathing session: {e}")
        raise HTTPException(status_code=500, detail="Erro ao registrar sessão")

@api_router.get("/breathing/stats")
async def get_breathing_stats(current_user: User = Depends(get_current_user)):
    """Get breathing exercise statistics"""
    try:
        # Count total sessions
        total_sessions = await db.breathing_sessions.count_documents({
            "user_id": current_user.id,
            "completed": True
        })
        
        # Get sessions this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        week_sessions = await db.breathing_sessions.count_documents({
            "user_id": current_user.id,
            "completed": True,
            "date": {"$gte": week_ago}
        })
        
        # Get favorite technique
        pipeline = [
            {"$match": {"user_id": current_user.id, "completed": True}},
            {"$group": {"_id": "$technique", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        
        favorite = await db.breathing_sessions.aggregate(pipeline).to_list(length=1)
        favorite_technique = favorite[0]["_id"] if favorite else None
        
        return {
            "total_sessions": total_sessions,
            "week_sessions": week_sessions,
            "favorite_technique": favorite_technique,
            "total_stars_earned": total_sessions * 5
        }
        
    except Exception as e:
        logger.error(f"Error fetching breathing stats: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar estatísticas")

# ============================================
# REMINDERS/HABITS ENDPOINTS
# ============================================

@api_router.get("/reminders")
async def get_reminders(current_user: User = Depends(get_current_user)):
    """Get all user reminders"""
    try:
        reminders = await db.user_reminders.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).to_list(length=100)
        
        # Remove MongoDB _id field
        for reminder in reminders:
            reminder.pop("_id", None)
        
        return reminders
        
    except Exception as e:
        logger.error(f"Error fetching reminders: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar lembretes")

@api_router.post("/reminders")
async def create_reminder(
    reminder: ReminderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new reminder"""
    try:
        now = datetime.utcnow()
        reminder_id = str(uuid.uuid4())
        
        # Create document to insert
        db_document = {
            "id": reminder_id,
            "user_id": current_user.id,
            "type": reminder.type.value,
            "title": reminder.title,
            "time": reminder.time,
            "enabled": reminder.enabled,
            "days": reminder.days,
            "created_at": now,
            "updated_at": now
        }
        
        await db.user_reminders.insert_one(db_document)
        
        # Return clean response without MongoDB _id
        return {
            "id": reminder_id,
            "user_id": current_user.id,
            "type": reminder.type.value,
            "title": reminder.title,
            "time": reminder.time,
            "enabled": reminder.enabled,
            "days": reminder.days,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error creating reminder: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar lembrete")

@api_router.patch("/reminders/{reminder_id}")
async def update_reminder(
    reminder_id: str,
    reminder: ReminderUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a reminder"""
    try:
        update_data = {k: v for k, v in reminder.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await db.user_reminders.update_one(
            {"id": reminder_id, "user_id": current_user.id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lembrete não encontrado")
        
        updated = await db.user_reminders.find_one({"id": reminder_id})
        return updated
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating reminder: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar lembrete")

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a reminder"""
    try:
        result = await db.user_reminders.delete_one({
            "id": reminder_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Lembrete não encontrado")
        
        return {"message": "Lembrete deletado com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting reminder: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar lembrete")

# ============================================
# STRIPE PAYMENT ENDPOINTS
# ============================================

class CheckoutRequest(BaseModel):
    ebook_id: str
    origin_url: str

@api_router.post("/payments/checkout/session")
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user)
):
    """Create Stripe checkout session for ebook purchase"""
    try:
        # Validate ebook package
        if request.ebook_id not in EBOOK_PACKAGES:
            raise HTTPException(status_code=400, detail="Ebook inválido")
        
        package = EBOOK_PACKAGES[request.ebook_id]
        
        # Initialize Stripe checkout
        webhook_url = f"{request.origin_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session URLs
        success_url = f"{request.origin_url}/store/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/store"
        
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=package.price,
            currency=package.currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "ebook_id": package.id,
                "ebook_title": package.title,
                "user_id": current_user.id,
                "user_email": current_user.email
            }
        )
        
        # Create session with Stripe
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            user_id=current_user.id,
            session_id=session.session_id,
            amount=package.price,
            currency=package.currency,
            payment_status="pending",
            status="initiated",
            ebook_id=package.id,
            ebook_title=package.title,
            metadata={
                "user_email": current_user.email,
                "ebook_category": package.category
            }
        )
        
        # Insert transaction into database
        await db.payment_transactions.insert_one(transaction.dict())
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar sessão de pagamento")

@api_router.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get payment status for checkout session"""
    try:
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Get status from Stripe
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        # Find transaction in database
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        
        # Update transaction status if payment is complete
        if status_response.payment_status == "paid" and transaction["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "status": "completed",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # TODO: Add ebook to user's library here
            # await add_ebook_to_user_library(current_user.id, transaction["ebook_id"])
        
        elif status_response.status == "expired" and transaction["status"] != "expired":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "expired",
                        "status": "expired",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        return {
            "session_id": session_id,
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting checkout status: {e}")
        raise HTTPException(status_code=500, detail="Erro ao verificar status do pagamento")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        # Get request body and headers
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction based on webhook event
        if webhook_response.event_type == "checkout.session.completed":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {
                    "$set": {
                        "payment_status": webhook_response.payment_status,
                        "status": "completed" if webhook_response.payment_status == "paid" else "failed",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error handling Stripe webhook: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar webhook")

@api_router.get("/payments/packages")
async def get_ebook_packages():
    """Get available ebook packages"""
    return {
        "packages": [
            {
                "id": package.id,
                "title": package.title,
                "price": package.price,
                "category": package.category,
                "currency": package.currency
            }
            for package in EBOOK_PACKAGES.values()
        ]
    }

# ============================================
# CORPORATE QUOTES ENDPOINTS
# ============================================

class CorporateQuoteRequest(BaseModel):
    company: str
    name: str
    email: str
    phone: Optional[str] = None
    employees: int
    message: Optional[str] = None
    selectedPlan: Optional[str] = None
    source: str = "corporate_website"

class CorporateCheckoutRequest(BaseModel):
    company: str
    name: str
    email: str
    phone: Optional[str] = None
    employees: int
    plan: str  # starter, business, enterprise
    origin_url: str

@api_router.post("/corporate/quote")
async def create_corporate_quote(request: CorporateQuoteRequest):
    """Create a corporate quote request"""
    try:
        # Create quote record
        quote = {
            "id": str(uuid.uuid4()),
            "company": request.company,
            "name": request.name,
            "email": request.email,
            "phone": request.phone,
            "employees": request.employees,
            "message": request.message,
            "selected_plan": request.selectedPlan,
            "source": request.source,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into database
        await db.corporate_quotes.insert_one(quote)
        
        # TODO: Send notification email to sales team
        # TODO: Send confirmation email to customer
        
        logger.info(f"Corporate quote created for {request.company} ({request.employees} employees)")
        
        return {
            "success": True,
            "message": "Orçamento solicitado com sucesso",
            "quote_id": quote["id"]
        }
        
    except Exception as e:
        logger.error(f"Error creating corporate quote: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar solicitação de orçamento")

@api_router.get("/corporate/quotes")
async def get_corporate_quotes(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get corporate quotes (admin endpoint)"""
    try:
        query = {}
        if status:
            query["status"] = status
            
        quotes = await db.corporate_quotes.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
        
        # Clean ObjectIds
        for quote in quotes:
            if "_id" in quote:
                quote["_id"] = str(quote["_id"])
        
        return {
            "quotes": quotes,
            "total": await db.corporate_quotes.count_documents(query)
        }
        
    except Exception as e:
        logger.error(f"Error fetching corporate quotes: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar orçamentos")

@api_router.post("/corporate/checkout")
async def create_corporate_checkout(request: CorporateCheckoutRequest):
    """Create Stripe checkout session for corporate license purchase"""
    try:
        # Define plan pricing
        plan_prices = {
            'starter': 15,
            'business': 12, 
            'enterprise': 8
        }
        
        if request.plan not in plan_prices:
            raise HTTPException(status_code=400, detail="Plano inválido")
        
        price_per_employee = plan_prices[request.plan]
        total_amount = price_per_employee * request.employees
        
        # Initialize Stripe checkout
        webhook_url = f"{request.origin_url}/api/webhook/stripe/corporate"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session URLs
        success_url = f"{request.origin_url}/corporate-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}"
        
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=total_amount,
            currency="brl",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "type": "corporate_license",
                "company": request.company,
                "contact_name": request.name,
                "contact_email": request.email,
                "contact_phone": request.phone or "",
                "employees": str(request.employees),
                "plan": request.plan,
                "price_per_employee": str(price_per_employee)
            }
        )
        
        # Create session with Stripe
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create corporate payment transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "type": "corporate_license",
            "company": request.company,
            "contact_name": request.name, 
            "contact_email": request.email,
            "contact_phone": request.phone,
            "employees": request.employees,
            "plan": request.plan,
            "price_per_employee": price_per_employee,
            "total_amount": total_amount,
            "currency": "brl",
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert transaction into database
        await db.corporate_transactions.insert_one(transaction)
        
        logger.info(f"Corporate checkout created for {request.company} - {request.employees} employees")
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating corporate checkout: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar checkout corporativo")

# Include the router in the main app (MUST be after all endpoint definitions)
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()