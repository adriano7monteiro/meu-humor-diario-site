from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ChatMessage(BaseModel):
    id: str = Field(..., description="Unique message ID")
    conversation_id: str = Field(..., description="ID of the conversation")
    user_id: str = Field(..., description="ID of the user")
    role: MessageRole = Field(..., description="Message role (user/assistant/system)")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Metadata for context
    user_mood_context: Optional[dict] = Field(None, description="User's recent mood data")
    user_missions_context: Optional[dict] = Field(None, description="User's mission completion data")

class ChatConversation(BaseModel):
    id: str = Field(..., description="Unique conversation ID")
    user_id: str = Field(..., description="ID of the user")
    title: str = Field("Nova Conversa", description="Conversation title")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    message_count: int = Field(0, description="Total number of messages")
    
class SendMessageRequest(BaseModel):
    message: str = Field(..., description="User message to send")
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID (optional for new conversation)")
    
class ChatResponse(BaseModel):
    message: str = Field(..., description="AI response")
    conversation_id: str = Field(..., description="Conversation ID")
    message_id: str = Field(..., description="Message ID")
    timestamp: datetime = Field(..., description="Response timestamp")