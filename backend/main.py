from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, init_db
from models import Customer, Order, Segment, Campaign, Communication
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import httpx, os, json, uuid, asyncio
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = FastAPI(title="Xeno Mini CRM")

# CORS - React frontend ko backend se baat karne deta hai
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client    = Groq(api_key=os.getenv("GROQ_API_KEY"))
CHANNEL_URL    = os.getenv("CHANNEL_SERVICE_URL", "http://localhost:8001")
 
# STARTUP - tables banao
 
@app.on_event("startup")
def startup():
    init_db()


# PYDANTIC SCHEMAS
# Request body ka format define karta hai

class CustomerCreate(BaseModel):
    name:  str
    email: str
    phone: Optional[str] = None
    city:  Optional[str] = None

class OrderCreate(BaseModel):
    customer_id:  str
    amount:       float
    product_name: str
    ordered_at:   Optional[datetime] = None

class SegmentCreate(BaseModel):
    name:              str
    natural_language:  str  # "customers who spent more than 1000 in last 30 days"

class CampaignCreate(BaseModel):
    name:       str
    segment_id: str
    message:    Optional[str] = None  # empty rakhne par AI generate karega
    channel:    str                   # whatsapp / sms / email

class ReceiptUpdate(BaseModel):
    communication_id: str
    status:           str  # delivered / failed / opened / clicked

# CUSTOMERS API

@app.post("/customers", tags=["Customers"])
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    """Naya customer add karo"""
    # Check: same email se already customer hai?
    existing = db.query(Customer).filter(Customer.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    customer    = Customer(**data.dict())
    customer.id = str(uuid.uuid4())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@app.get("/customers", tags=["Customers"])
def get_customers(db: Session = Depends(get_db)):
    """Saare customers ki list"""
    customers = db.query(Customer).all()
    result = []
    for c in customers:
        orders      = db.query(Order).filter(Order.customer_id == c.id).all()
        total_spend = sum(o.amount for o in orders)
        result.append({
            "id":          c.id,
            "name":        c.name,
            "email":       c.email,
            "phone":       c.phone,
            "city":        c.city,
            "created_at":  c.created_at,
            "total_spend": total_spend,
            "order_count": len(orders)
        })
    return result


# ORDERS API
 

@app.post("/orders", tags=["Orders"])
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    """Naya order add karo"""
    # Customer exist karta hai?
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    order            = Order(**data.dict())
    order.id         = str(uuid.uuid4())
    order.ordered_at = data.ordered_at or datetime.utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@app.get("/orders", tags=["Orders"])
def get_orders(db: Session = Depends(get_db)):
    """Saare orders"""
    return db.query(Order).all()


# SEGMENTS API (AI Powered)
 

@app.post("/segments", tags=["Segments"])
def create_segment(data: SegmentCreate, db: Session = Depends(get_db)):
    """
    Natural language se segment banao using Groq AI.
    Example: "customers who spent more than 1000 and ordered at least 2 times"
    """
    # Groq ko prompt bhejo
    prompt = f"""
You are a CRM data analyst. Convert this natural language filter into a JSON rule object.

Input: "{data.natural_language}"

Return ONLY a valid JSON object with these exact keys (use null if not applicable):
{{
    "min_total_spend": <number or null>,
    "min_orders": <number or null>,
    "max_orders": <number or null>,
    "city": <string or null>,
    "inactive_days": <number or null>,
    "max_total_spend": <number or null>
}}

Key meanings:
- min_total_spend: customer ka total spend kam se kam itna hona chahiye
- max_total_spend: customer ka total spend zyada se zyada itna hona chahiye  
- min_orders: customer ne kam se kam itne orders kiye hon
- max_orders: customer ne zyada se zyada itne orders kiye hon
- city: sirf is sheher ke customers
- inactive_days: jo customers itne dinon se kuch nahi aaye

Return ONLY the JSON object. No explanation, no markdown, no extra text.
"""

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=200
    )

    raw = response.choices[0].message.content.strip()

    # JSON parse karo
    try:
        # Agar AI ne ```json wrapper diya toh hata do
        raw = raw.replace("```json", "").replace("```", "").strip()
        rules = json.loads(raw)
    except Exception:
        rules = {}

    segment = Segment(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.natural_language,
        rules=rules
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)

    # Preview: kitne customers match karte hain
    matched = apply_segment_rules(rules, db)

    return {
        "segment":        segment,
        "rules_generated": rules,
        "preview_count":  len(matched)
    }

@app.get("/segments", tags=["Segments"])
def get_segments(db: Session = Depends(get_db)):
    """Saare segments"""
    segments = db.query(Segment).all()
    result = []
    for s in segments:
        matched = apply_segment_rules(s.rules or {}, db)
        result.append({
            "id":          s.id,
            "name":        s.name,
            "description": s.description,
            "rules":       s.rules,
            "created_at":  s.created_at,
            "customer_count": len(matched)
        })
    return result

@app.get("/segments/{segment_id}/customers", tags=["Segments"])
def get_segment_customers(segment_id: str, db: Session = Depends(get_db)):
    """Is segment ke saare customers dekho"""
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    matched = apply_segment_rules(segment.rules or {}, db)
    return {
        "segment_name": segment.name,
        "count":        len(matched),
        "customers":    matched
    }

def apply_segment_rules(rules: dict, db: Session):
    """
    Rules ke basis par customers filter karo.
    Yeh function sabse important hai — interview mein zaroor poochhenge.
    """
    if not rules:
        return []

    customers = db.query(Customer).all()
    matched   = []

    for customer in customers:
        orders      = db.query(Order).filter(Order.customer_id == customer.id).all()
        total_spend = sum(o.amount for o in orders)
        order_count = len(orders)

        # min_total_spend filter
        if rules.get("min_total_spend") is not None:
            if total_spend < rules["min_total_spend"]:
                continue

        # max_total_spend filter
        if rules.get("max_total_spend") is not None:
            if total_spend > rules["max_total_spend"]:
                continue

        # min_orders filter
        if rules.get("min_orders") is not None:
            if order_count < rules["min_orders"]:
                continue

        # max_orders filter
        if rules.get("max_orders") is not None:
            if order_count > rules["max_orders"]:
                continue

        # city filter
        if rules.get("city") is not None:
            if customer.city != rules["city"]:
                continue

        # inactive_days filter - jo customers N din se nahi aaye
        if rules.get("inactive_days") is not None:
            if orders:
                last_order_date = max(o.ordered_at for o in orders)
                days_since      = (datetime.utcnow() - last_order_date).days
                if days_since < rules["inactive_days"]:
                    continue
            # Agar orders hi nahi hain toh bhi match karo (kabhi nahi aaya)

        matched.append({
            "id":          customer.id,
            "name":        customer.name,
            "email":       customer.email,
            "phone":       customer.phone,
            "city":        customer.city,
            "total_spend": total_spend,
            "order_count": order_count
        })

    return matched

# CAMPAIGNS API
 

@app.post("/campaigns", tags=["Campaigns"])
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    """
    Campaign banao.
    Message empty hai toh AI draft karega automatically.
    """
    segment = db.query(Segment).filter(Segment.id == data.segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    # Message nahi diya toh AI se banao
    message = data.message
    if not message or message.strip() == "":
        message = ai_generate_message(segment.description, data.channel)

    campaign = Campaign(
        id=str(uuid.uuid4()),
        name=data.name,
        segment_id=data.segment_id,
        message=message,
        channel=data.channel,
        status="draft"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@app.post("/campaigns/{campaign_id}/launch", tags=["Campaigns"])
async def launch_campaign(
    campaign_id:      str,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db)
):
    """
    Campaign launch karo.
    1. Segment ke saare customers dhundo
    2. Har customer ke liye Communication record banao
    3. Background mein Channel Service ko bhejo
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status == "running":
        raise HTTPException(status_code=400, detail="Campaign already running")

    segment   = db.query(Segment).filter(Segment.id == campaign.segment_id).first()
    customers = apply_segment_rules(segment.rules or {}, db)

    if not customers:
        raise HTTPException(status_code=400, detail="No customers match this segment")

    # Har customer ke liye communication create karo
    comm_data_list = []
    for customer in customers:
        comm = Communication(
            id=str(uuid.uuid4()),
            campaign_id=campaign_id,
            customer_id=customer["id"],
            message=campaign.message,
            channel=campaign.channel,
            status="sent"
        )
        db.add(comm)
        comm_data_list.append({
            "communication_id": comm.id,
            "customer_name":    customer["name"],
            "phone":            customer["phone"],
            "email":            customer["email"],
            "message":          campaign.message,
            "channel":          campaign.channel
        })

    campaign.status = "running"
    db.commit()

    # Background mein channel service ko bhejo (non-blocking)
    background_tasks.add_task(send_to_channel_service, comm_data_list)

    return {
        "success":      True,
        "message":      f"Campaign launched to {len(customers)} customers",
        "campaign_id":  campaign_id,
        "total_sent":   len(customers)
    }

@app.get("/campaigns", tags=["Campaigns"])
def get_campaigns(db: Session = Depends(get_db)):
    """Saare campaigns"""
    campaigns = db.query(Campaign).all()
    result    = []
    for c in campaigns:
        comms = db.query(Communication).filter(
            Communication.campaign_id == c.id
        ).all()
        stats = get_stats_from_comms(comms)
        result.append({
            "id":         c.id,
            "name":       c.name,
            "channel":    c.channel,
            "status":     c.status,
            "message":    c.message,
            "created_at": c.created_at,
            "stats":      stats
        })
    return result

@app.get("/campaigns/{campaign_id}/stats", tags=["Campaigns"])
def campaign_stats(campaign_id: str, db: Session = Depends(get_db)):
    """Campaign ki performance stats"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    comms = db.query(Communication).filter(
        Communication.campaign_id == campaign_id
    ).all()

    stats = get_stats_from_comms(comms)

    return {
        "campaign_id":   campaign_id,
        "campaign_name": campaign.name,
        "channel":       campaign.channel,
        "total":         len(comms),
        "stats":         stats,
        "delivery_rate": f"{(stats['delivered'] / len(comms) * 100):.1f}%" if comms else "0%",
        "open_rate":     f"{(stats['opened']    / len(comms) * 100):.1f}%" if comms else "0%",
        "click_rate":    f"{(stats['clicked']   / len(comms) * 100):.1f}%" if comms else "0%"
    }

def get_stats_from_comms(comms):
    stats = {"sent": 0, "delivered": 0, "failed": 0, "opened": 0, "clicked": 0}
    for c in comms:
        if c.status in stats:
            stats[c.status] += 1
    return stats

 
# RECEIPT API - Channel Service ka callback
 

@app.post("/receipt", tags=["Receipt"])
def receive_receipt(data: ReceiptUpdate, db: Session = Depends(get_db)):
    """
    Channel service yahan callback bhejta hai.
    Jaise: "communication abc123 delivered hua"
    """
    comm = db.query(Communication).filter(
        Communication.id == data.communication_id
    ).first()

    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")

    comm.status     = data.status
    comm.updated_at = datetime.utcnow()
    db.commit()

    print(f"📬 Receipt: {data.communication_id[:8]}... → {data.status}")
    return {"updated": True, "status": data.status}


# DASHBOARD STATS
@app.get("/dashboard", tags=["Dashboard"])
def dashboard_stats(db: Session = Depends(get_db)):
    """Frontend dashboard ke liye summary stats"""
    total_customers  = db.query(Customer).count()
    total_orders     = db.query(Order).count()
    total_segments   = db.query(Segment).count()
    total_campaigns  = db.query(Campaign).count()
    total_comms      = db.query(Communication).count()

    # Revenue
    orders      = db.query(Order).all()
    total_rev   = sum(o.amount for o in orders)

    # Recent campaigns
    campaigns   = db.query(Campaign).order_by(Campaign.created_at.desc()).limit(5).all()

    return {
        "total_customers": total_customers,
        "total_orders":    total_orders,
        "total_segments":  total_segments,
        "total_campaigns": total_campaigns,
        "total_messages":  total_comms,
        "total_revenue":   total_rev,
    }

def ai_generate_message(segment_description: str, channel: str) -> str:
    """Groq se campaign message generate karo"""
    emoji_note = "Use relevant emojis." if channel == "whatsapp" else "No emojis (SMS)."

    prompt = f"""
You are a marketing copywriter for a retail brand (fashion/lifestyle).
Write a short {channel.upper()} message for this customer audience: "{segment_description}"

Rules:
- Maximum 2 sentences
- Friendly, personalized tone  
- Must include a clear call to action
- {emoji_note}

Return ONLY the message text. No quotes, no explanation.
"""

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=150
    )
    return response.choices[0].message.content.strip()

async def send_to_channel_service(comm_list: list):
    """
    Background task - channel service ko saari communications bhejo.
    Ek ek karke bhejte hain taaki channel pe load na pade.
    """
    async with httpx.AsyncClient() as client:
        for comm_data in comm_list:
            try:
                await client.post(
                    f"{CHANNEL_URL}/send",
                    json=comm_data,
                    timeout=5.0
                )
                await asyncio.sleep(0.1)  # thoda gap
            except Exception as e:
                print(f"Channel service error: {e}")
