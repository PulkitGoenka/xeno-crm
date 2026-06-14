from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio, httpx, random, os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Xeno Channel Stub Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# CRM ka receipt endpoint
CRM_URL = os.getenv("CRM_URL", "http://localhost:8000")

 
# SCHEMA
 
class SendRequest(BaseModel):
    communication_id: str
    customer_name:    str
    phone:            Optional[str] = None
    email:            Optional[str] = None
    message:          str
    channel:          str   # whatsapp / sms / email

 
# SEND API
# CRM yahan message bhejta hai
 
@app.post("/send")
async def send_message(data: SendRequest):
    """
    CRM se message receive karo.
    Background mein delivery simulate karo.
    Turant response do taaki CRM block na ho.
    """
    print(f" Received: [{data.channel.upper()}] → {data.customer_name}")

    # Background mein chalao - non-blocking
    asyncio.create_task(simulate_full_delivery(data))

    return {
        "accepted":          True,
        "communication_id":  data.communication_id,
        "message":           f"Queued for {data.channel} delivery"
    }

 
# SIMULATE FULL DELIVERY LIFECYCLE
# Real world ki tarah step by step
 
async def simulate_full_delivery(data: SendRequest):
    """
    Real delivery lifecycle simulate karta hai:

    Step 1: 2-4 sec baad → delivered ya failed
    Step 2: 5-10 sec baad → opened (agar delivered hua)
    Step 3: 3-7 sec baad → clicked (agar open hua)

    Channel ke hisaab se alag probabilities:
    - WhatsApp: high open rate (85%), medium click (45%)
    - SMS: medium open rate (65%), low click (25%)
    - Email: low open rate (35%), low click (15%)
    """

    channel = data.channel.lower()
    cid     = data.communication_id

    # Channel probabilities
    probs = {
        "whatsapp": {"fail": 0.05, "open": 0.85, "click": 0.45},
        "sms":      {"fail": 0.10, "open": 0.65, "click": 0.25},
        "email":    {"fail": 0.12, "open": 0.35, "click": 0.15},
    }.get(channel, {"fail": 0.10, "open": 0.50, "click": 0.20})

    # ── Step 1: Delivery attempt ──
    await asyncio.sleep(random.uniform(2, 4))

    if random.random() < probs["fail"]:
        # Failed!
        await callback(cid, "failed")
        print(f"Failed: {cid[:8]}...")
        return

    # Delivered
    await callback(cid, "delivered")
    print(f" Delivered: {cid[:8]}...")

    # ── Step 2: Did user open it? ──
    await asyncio.sleep(random.uniform(5, 12))

    if random.random() > probs["open"]:
        print(f" Not opened: {cid[:8]}...")
        return

    await callback(cid, "opened")
    print(f"Opened: {cid[:8]}...")

    # ── Step 3: Did user click? ──
    await asyncio.sleep(random.uniform(3, 8))

    if random.random() < probs["click"]:
        await callback(cid, "clicked")
        print(f"Clicked: {cid[:8]}...")

 
# CALLBACK TO CRM
 
async def callback(communication_id: str, status: str, retry: int = 0):
    """
    CRM ke /receipt endpoint ko call karo.
    Fail hone par 3 baar retry karo (with exponential backoff).
    """
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{CRM_URL}/receipt",
                json={
                    "communication_id": communication_id,
                    "status":           status
                },
                timeout=5.0
            )
            if res.status_code == 200:
                print(f"📬 Callback OK: {communication_id[:8]}... → {status}")
            else:
                raise Exception(f"Bad status: {res.status_code}")

    except Exception as e:
        if retry < 3:
            # Exponential backoff: 2s, 4s, 8s
            wait = 2 ** (retry + 1)
            print(f" Callback failed, retry {retry+1} in {wait}s: {e}")
            await asyncio.sleep(wait)
            await callback(communication_id, status, retry + 1)
        else:
            print(f" Callback permanently failed: {communication_id[:8]}... → {status}")
