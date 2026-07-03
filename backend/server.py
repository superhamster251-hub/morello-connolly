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

# ────────────────────────────────────────────
# Config
# ────────────────────────────────────────────
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
STRIPE_API_KEY = os.environ['STRIPE_API_KEY']

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Morello Connally API")
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
        (os.environ.get("ADMIN_EMAIL", "ryan@morelloconnally.com"),
         os.environ.get("ADMIN_PASSWORD", "Morello2026!"),
         "Ryan Morello"),
        (os.environ.get("ADMIN_2_EMAIL", "ben@morelloconnally.com"),
         os.environ.get("ADMIN_2_PASSWORD", "Connally2026!"),
         "Ben Connally"),
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
    return {"service": "Morello Connally API", "status": "ok"}

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
        "source": "morello_connally_web",
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
        "revenue": revenue,
    }

# ────────────────────────────────────────────
# Wire up
# ────────────────────────────────────────────
app.include_router(api)

frontend_origin = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
