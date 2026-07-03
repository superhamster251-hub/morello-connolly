"""Backend API tests for Morello Connally site."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://web-studio-sf.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "ryan@morelloconnally.com"
ADMIN_PASSWORD = "Morello2026!"
ADMIN2_EMAIL = "ben@morelloconnally.com"
ADMIN2_PASSWORD = "Connally2026!"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ─── Packages ────────────────────────────────────────
def test_get_packages(s):
    r = s.get(f"{API}/packages")
    assert r.status_code == 200
    pkgs = r.json()["packages"]
    ids = {p["id"]: p["amount"] for p in pkgs}
    assert ids == {"starter": 300.0, "professional": 500.0, "premium": 750.0}


# ─── Bookings ────────────────────────────────────────
def test_create_booking(s):
    payload = {
        "name": "TEST_Alice",
        "email": "test_alice@example.com",
        "phone": "555-1111",
        "date": "2026-02-10",
        "time_slot": "10:00 AM",
        "message": "TEST booking",
    }
    r = s.post(f"{API}/bookings", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["success"] is True
    assert "id" in data["booking"]
    assert data["booking"]["email"] == payload["email"]


# ─── Contacts ────────────────────────────────────────
def test_create_contact(s):
    r = s.post(f"{API}/contacts", json={
        "name": "TEST_Bob",
        "email": "test_bob@example.com",
        "phone": "555-2222",
        "message": "TEST contact message",
    })
    assert r.status_code == 200
    assert r.json()["success"] is True


# ─── Auth ────────────────────────────────────────────
def test_login_ryan(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    j = r.json()
    assert "token" in j and j["user"]["email"] == ADMIN_EMAIL


def test_login_ben(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN2_EMAIL, "password": ADMIN2_PASSWORD})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == ADMIN2_EMAIL


def test_login_bad_password(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


# ─── Admin protected endpoints ───────────────────────
@pytest.mark.parametrize("path", ["/admin/summary", "/admin/bookings", "/admin/purchases", "/admin/contacts"])
def test_admin_requires_auth(s, path):
    r = requests.get(f"{API}{path}")
    assert r.status_code == 401


@pytest.mark.parametrize("path", ["/admin/summary", "/admin/bookings", "/admin/purchases", "/admin/contacts"])
def test_admin_with_token(s, auth_headers, path):
    r = requests.get(f"{API}{path}", headers=auth_headers)
    assert r.status_code == 200, r.text


# ─── Checkout ────────────────────────────────────────
def test_checkout_valid(s):
    r = s.post(f"{API}/checkout/session", json={
        "package_id": "starter",
        "origin_url": BASE_URL,
        "customer_name": "TEST_Buyer",
        "customer_email": "test_buyer@example.com",
        "customer_phone": "555-3333",
        "monthly_maintenance": 0,
    })
    assert r.status_code == 200, r.text
    j = r.json()
    assert "stripe.com" in j["url"]
    assert j["session_id"]
    # verify status endpoint works
    st = s.get(f"{API}/checkout/status/{j['session_id']}")
    assert st.status_code == 200
    assert "payment_status" in st.json()


def test_checkout_invalid_package(s):
    r = s.post(f"{API}/checkout/session", json={
        "package_id": "bogus",
        "origin_url": BASE_URL,
        "customer_name": "x",
        "customer_email": "x@x.com",
    })
    assert r.status_code == 400


def test_checkout_bad_maintenance(s):
    r = s.post(f"{API}/checkout/session", json={
        "package_id": "starter",
        "origin_url": BASE_URL,
        "customer_name": "x",
        "customer_email": "x@x.com",
        "monthly_maintenance": 5,
    })
    assert r.status_code == 400

    r2 = s.post(f"{API}/checkout/session", json={
        "package_id": "starter",
        "origin_url": BASE_URL,
        "customer_name": "x",
        "customer_email": "x@x.com",
        "monthly_maintenance": 200,
    })
    assert r2.status_code == 400
