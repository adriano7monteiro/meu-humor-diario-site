from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime
from bson import ObjectId

class PaymentTransaction(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: Optional[str] = None
    session_id: str
    payment_id: Optional[str] = None
    amount: float
    currency: str = "brl"
    payment_status: str = "pending"  # pending, paid, failed, expired
    status: str = "initiated"  # initiated, completed, cancelled
    ebook_id: Optional[str] = None
    ebook_title: Optional[str] = None
    metadata: Optional[Dict[str, str]] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }

class EbookPackage(BaseModel):
    id: str
    title: str
    price: float
    category: str
    currency: str = "brl"

# Definindo pacotes fixos de ebooks (segurança - preços definidos no backend)
EBOOK_PACKAGES = {
    "mindfulness": EbookPackage(
        id="mindfulness",
        title="Mindfulness e Bem-Estar Mental",
        price=29.90,
        category="Saúde Mental"
    ),
    "breathing": EbookPackage(
        id="breathing", 
        title="Técnicas de Respiração para Ansiedade",
        price=19.90,
        category="Ansiedade"
    ),
    "gratitude": EbookPackage(
        id="gratitude",
        title="Diário da Gratidão: 30 Dias de Transformação", 
        price=24.90,
        category="Desenvolvimento Pessoal"
    ),
    "stress": EbookPackage(
        id="stress",
        title="Gestão do Estresse no Trabalho",
        price=34.90,
        category="Vida Profissional"
    )
}