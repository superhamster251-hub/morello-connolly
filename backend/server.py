from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest,
)
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from fastapi.responses import StreamingResponse
import json

# ────────────────────────────────────────────
# Config
# ────────────────────────────────────────────
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
STRIPE_API_KEY = os.environ['STRIPE_API_KEY']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Morello Connolly API")
api = APIRouter(prefix="/api")

# ────────────────────────────────────────────
# Fixed server-side package definitions
# ────────────────────────────────────────────
PACKAGES = {
    "starter": {
        "id": "starter",
        "name": "The Essential Package",
        "amount": 300.00,
        "description": "Website with high-quality stock photos.",
    },
    "professional": {
        "id": "professional",
        "name": "The Creator Package",
        "amount": 500.00,
        "description": "Website with custom professional photos of you & your business, edited by us.",
    },
    "premium": {
        "id": "premium",
        "name": "The Executive Package",
        "amount": 750.00,
        "description": "Website with credit card terminals, email list setup, and integrated meeting scheduler.",
    },
}

MONTHLY_MAINTENANCE_PRICES = {
    "starter": 10.00,
    "professional": 20.00,
    "premium": 20.00,
}
PHOTO_REFRESH_TIERS = {"professional", "premium"}

# ────────────────────────────────────────────
# Chatbot config
# ────────────────────────────────────────────
CHAT_SYSTEM_PROMPT = """You are the friendly, helpful concierge for Morello Connolly — a two-person web-design studio based in San Francisco, CA, founded by Ryan Morello and Ben Connolly. Your job is to answer questions about our services and gently guide visitors toward booking a discovery call or purchasing a package.

## Company facts (never contradict these)
- Studio: Morello Connolly, San Francisco, CA. Serves the Bay Area but also builds remotely.
- Founders (personal, hands-on — every project is handled by them directly):
    • Ryan Morello — design & photography — 510-631-5990
    • Ben Connolly — build & systems — 510-827-3471
- Turnaround: most sites go live in 7–14 days.
- Payments handled via Stripe checkout.

## Packages (one-time price)
1. **The Essential Package — $300** — Custom-designed 1–4 page site, curated stock photography, mobile-responsive, basic SEO, contact form. Optional add-on: $10/mo monthly stock photo refresh (rotates in fresh stock imagery).

2. **The Creator Package — $500** — Everything in Essential PLUS custom photos (we come out and shoot), meeting scheduler on the site, up to 8 pages, analytics dashboard. Optional add-on: $20/mo monthly upkeep (custom domain, hosting, backups, minor updates) — includes a quarterly custom photo re-shoot at no extra cost.

3. **The Executive Package — $750** — Everything in Creator PLUS credit card / Stripe terminals, email list & newsletter setup, priority build queue. Same $20/mo optional monthly upkeep with quarterly photo re-shoot bonus.

## How to help visitors
- If they don't know which package fits, ask what they're building (café, boutique, service business, portfolio, etc.) and recommend a tier with a one-sentence rationale.
- If they want to buy, tell them to scroll to the "Packages" section and click Purchase on the tier they want.
- If they want to talk first, tell them to scroll to the "Schedule" section on the page and pick a date + time.
- If they ask something you don't know (custom quotes, timelines longer than 2 weeks, exotic tech), offer to have Ryan or Ben call/text them and ask for their name + phone.
- Keep replies short (2–4 sentences typically). Warm, direct, plain-language — no corporate fluff, no emojis.

## Constraints
- Never invent prices, features, or promises not listed above.
- Never claim to be human — if asked, say you're the studio's AI concierge and can connect them with Ryan or Ben directly.
- Do not collect passwords, credit-card numbers, or payment details in chat — direct them to secure Stripe checkout.
"""

# In-memory chat sessions (per-instance). Full transcript persisted to Mongo.
CHAT_SESSIONS: dict = {}

def get_chat(session_id: str) -> "LlmChat":
    if session_id not in CHAT_SESSIONS:
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="Chat service unavailable")
        CHAT_SESSIONS[session_id] = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=CHAT_SYSTEM_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-6")
    return CHAT_SESSIONS[session_id]

# ────────────────────────────────────────────
# Models
# ────────────────────────────────────────────
class LoginPayload(BaseModel):
    email: EmailStr
    password: str

class BookingCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    date: str          # YYYY-MM-DD
    time_slot: str     # e.g. "10:00 AM"
    message: Optional[str] = ""

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    message: str

class CheckoutCreate(BaseModel):
    package_id: str
    origin_url: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = ""
    include_monthly: Optional[bool] = False   # $20/mo custom domain + upkeep (first month charged today)

class ChatMessageCreate(BaseModel):
    session_id: str
    message: str
    visitor_name: Optional[str] = ""
    visitor_email: Optional[str] = ""

# ────────────────────────────────────────────
# Auth helpers
# ────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.admins.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ────────────────────────────────────────────
# Startup: seed admins + indexes
# ────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    await db.admins.create_index("email", unique=True)
    await db.bookings.create_index("created_at")
    await db.purchases.create_index("session_id", unique=True)

    seeds = [
        (os.environ.get("ADMIN_EMAIL", "ryan@morelloconnolly.com"),
         os.environ.get("ADMIN_PASSWORD", "Morello2026!"),
         "Ryan Morello"),
        (os.environ.get("ADMIN_2_EMAIL", "ben@morelloconnolly.com"),
         os.environ.get("ADMIN_2_PASSWORD", "Connolly2026!"),
         "Ben Connolly"),
        (os.environ.get("ADMIN_3_EMAIL", "superhamster251@gmail.com"),
         os.environ.get("ADMIN_3_PASSWORD", "1234"),
         "Dev Access"),
    ]
    for email, pw, name in seeds:
        email = email.lower()
        existing = await db.admins.find_one({"email": email})
        if not existing:
            await db.admins.insert_one({
                "id": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "role": "admin",
                "password_hash": hash_password(pw),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Seeded admin: {email}")
        elif not verify_password(pw, existing["password_hash"]):
            await db.admins.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})
            logger.info(f"Updated admin password: {email}")

# ────────────────────────────────────────────
# Public routes
# ────────────────────────────────────────────
@api.get("/")
async def root():
    return {"service": "Morello Connolly API", "status": "ok"}

@api.get("/packages")
async def get_packages():
    return {"packages": list(PACKAGES.values())}

@api.post("/bookings")
async def create_booking(payload: BookingCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": payload.email.lower(),
        "phone": payload.phone or "",
        "date": payload.date,
        "time_slot": payload.time_slot,
        "message": payload.message or "",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "booking": doc}

@api.post("/contacts")
async def create_contact(payload: ContactCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": payload.email.lower(),
        "phone": payload.phone or "",
        "message": payload.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contacts.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True}

# ────────────────────────────────────────────
# Auth routes
# ────────────────────────────────────────────
@api.post("/auth/login")
async def login(payload: LoginPayload, response: Response):
    email = payload.email.lower()
    admin = await db.admins.find_one({"email": email})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(admin["id"], admin["email"])
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=8 * 60 * 60,
        path="/",
    )
    return {
        "success": True,
        "token": token,
        "user": {"id": admin["id"], "email": admin["email"], "name": admin["name"], "role": admin["role"]},
    }

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"success": True}

@api.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return admin

# ────────────────────────────────────────────
# Payments (Stripe)
# ────────────────────────────────────────────
@api.post("/checkout/session")
async def create_checkout(payload: CheckoutCreate, http_request: Request):
    if payload.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")

    pkg = PACKAGES[payload.package_id]
    monthly = MONTHLY_MAINTENANCE_PRICES[pkg["id"]] if payload.include_monthly else 0.0
    photo_refresh = bool(payload.include_monthly) and pkg["id"] in PHOTO_REFRESH_TIERS

    total = round(float(pkg["amount"]) + monthly, 2)

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/checkout/cancel"
    webhook_url = f"{str(http_request.base_url).rstrip('/')}/api/webhook/stripe"

    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    metadata = {
        "package_id": pkg["id"],
        "package_name": pkg["name"],
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email.lower(),
        "customer_phone": payload.customer_phone or "",
        "include_monthly": "true" if payload.include_monthly else "false",
        "monthly_maintenance": str(monthly),
        "photo_refresh_included": "true" if photo_refresh else "false",
        "source": "morello_connolly_web",
    }
    req = CheckoutSessionRequest(
        amount=total,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await stripe.create_checkout_session(req)

    await db.purchases.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "package_id": pkg["id"],
        "package_name": pkg["name"],
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email.lower(),
        "customer_phone": payload.customer_phone or "",
        "include_monthly": bool(payload.include_monthly),
        "monthly_maintenance": monthly,
        "photo_refresh_included": photo_refresh,
        "amount": total,
        "currency": "usd",
        "payment_status": "initiated",
        "status": "open",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}

@api.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, http_request: Request):
    record = await db.purchases.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(status_code=404, detail="Session not found")

    # Idempotent: if already marked paid, return stored status
    if record.get("payment_status") == "paid":
        return {
            "status": record.get("status"),
            "payment_status": record.get("payment_status"),
            "amount_total": int(round(record.get("amount", 0) * 100)),
            "currency": record.get("currency", "usd"),
            "metadata": record.get("metadata", {}),
        }

    webhook_url = f"{str(http_request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)

    await db.purchases.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "metadata": status.metadata,
    }

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        event = await stripe.handle_webhook(body, signature)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event and event.session_id:
        await db.purchases.update_one(
            {"session_id": event.session_id},
            {"$set": {
                "payment_status": event.payment_status,
                "webhook_event": event.event_type,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
    return {"received": True}

# ────────────────────────────────────────────
# Admin (protected)
# ────────────────────────────────────────────
@api.get("/admin/bookings")
async def admin_bookings(admin: dict = Depends(get_current_admin)):
    items = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"items": items}

@api.patch("/admin/bookings/{booking_id}")
async def admin_update_booking(booking_id: str, body: dict, admin: dict = Depends(get_current_admin)):
    allowed = {k: v for k, v in body.items() if k in {"status"}}
    if not allowed:
        raise HTTPException(status_code=400, detail="No allowed fields")
    result = await db.bookings.update_one({"id": booking_id}, {"$set": allowed})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"success": True}

@api.get("/admin/purchases")
async def admin_purchases(admin: dict = Depends(get_current_admin)):
    items = await db.purchases.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"items": items}

@api.get("/admin/contacts")
async def admin_contacts(admin: dict = Depends(get_current_admin)):
    items = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"items": items}

@api.get("/admin/summary")
async def admin_summary(admin: dict = Depends(get_current_admin)):
    total_bookings = await db.bookings.count_documents({})
    total_contacts = await db.contacts.count_documents({})
    total_paid = await db.purchases.count_documents({"payment_status": "paid"})
    total_chats = await db.chat_sessions.count_documents({})
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    agg = await db.purchases.aggregate(pipeline).to_list(1)
    revenue = agg[0]["total"] if agg else 0.0
    return {
        "bookings": total_bookings,
        "contacts": total_contacts,
        "paid_purchases": total_paid,
        "chats": total_chats,
        "revenue": revenue,
    }

@api.get("/admin/chats")
async def admin_chats(admin: dict = Depends(get_current_admin)):
    items = await db.chat_sessions.find({}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return {"items": items}

# ────────────────────────────────────────────
# Chatbot (public, streaming SSE)
# ────────────────────────────────────────────
async def _persist_chat_turn(session_id: str, user_msg: str, assistant_msg: str,
                              visitor_name: str, visitor_email: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    turn_user = {"role": "user", "content": user_msg, "at": now}
    turn_asst = {"role": "assistant", "content": assistant_msg, "at": now}
    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {
            "$setOnInsert": {"session_id": session_id, "created_at": now},
            "$set": {
                "updated_at": now,
                "visitor_name": visitor_name or "",
                "visitor_email": (visitor_email or "").lower(),
            },
            "$push": {"messages": {"$each": [turn_user, turn_asst]}},
        },
        upsert=True,
    )

@api.post("/chat/message")
async def chat_message(payload: ChatMessageCreate):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Empty message")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="Chat service is not configured")

    chat = get_chat(payload.session_id)

    async def event_generator():
        full = ""
        try:
            async for event in chat.stream_message(UserMessage(text=payload.message)):
                if isinstance(event, TextDelta):
                    full += event.content
                    yield f"data: {json.dumps({'delta': event.content})}\n\n"
                elif isinstance(event, StreamDone):
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    break
        except Exception as e:
            logger.error(f"chat stream error: {e}")
            yield f"data: {json.dumps({'error': 'chat error'})}\n\n"
        finally:
            if full:
                try:
                    await _persist_chat_turn(
                        payload.session_id, payload.message, full,
                        payload.visitor_name or "", payload.visitor_email or "",
                    )
                except Exception as e:
                    logger.error(f"chat persist error: {e}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

# ────────────────────────────────────────────
# Wire up
# ────────────────────────────────────────────
app.include_router(api)

# CORS: allow any origin the user configures via CORS_ORIGINS env (comma-separated).
# Use "*" for wildcard — we reflect the actual origin via regex so credentialed
# requests (Bearer + cookies) still work (browsers reject literal "*" with credentials).
cors_env = os.environ.get("CORS_ORIGINS", "*").strip()
if cors_env == "*" or not cors_env:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    # Always include local dev + the configured FRONTEND_URL for convenience
    frontend_origin = os.environ.get("FRONTEND_URL")
    if frontend_origin and frontend_origin not in origins:
        origins.append(frontend_origin)
    if "http://localhost:3000" not in origins:
        origins.append("http://localhost:3000")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.on_event("shutdown")
async def shutdown():
    client.close()
