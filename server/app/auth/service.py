import random
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from bson import ObjectId
from app.database.mongodb import get_db
from app.utils.hashing import hash_password, verify_password
from app.utils.jwt import create_access_token
from app.config import settings
from app.auth.schemas import RegisterRequest, LoginRequest, GoogleLoginRequest, VerifyOTPRequest
from app.utils.email import send_welcome_email, send_otp_email
from google.oauth2 import id_token
from google.auth.transport import requests


async def register_user(data: RegisterRequest) -> dict:
    """
    Register a new user.
    - Validates duplicate email in main user collection
    - Hashes password
    - Generates 6-digit OTP
    - Stores pending registration in database
    - Sends OTP email
    """
    db = get_db()

    # Check duplicate email in users collection
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    now = datetime.now(timezone.utc)
    otp = str(random.randint(100000, 999999))
    expires_at = now + timedelta(minutes=10)

    pending_doc = {
        "name": data.name.strip(),
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "otp": otp,
        "expiresAt": expires_at,
    }

    # Upsert the pending registration
    await db.pending_registrations.update_one(
        {"email": pending_doc["email"]},
        {"$set": pending_doc},
        upsert=True
    )

    # Send OTP email
    send_otp_email(pending_doc["email"], pending_doc["name"], otp)

    return {
        "message": "Verification code sent to your email. Please enter the OTP to complete registration.",
        "email": pending_doc["email"],
    }


async def verify_otp(data: VerifyOTPRequest) -> dict:
    """
    Verify the OTP for a pending registration.
    - Validates OTP and expiration
    - Moves user from pending_registrations to users
    - Deletes pending registration
    - Sends welcome email
    - Returns JWT access token
    """
    db = get_db()
    email_lower = data.email.lower()

    # Look up pending registration
    pending = await db.pending_registrations.find_one({"email": email_lower})
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending registration found for this email. Please sign up again.",
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    expires_at = pending["expiresAt"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one.",
        )

    # Verify OTP code
    if pending["otp"] != data.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    # Insert into users collection
    user_doc = {
        "name": pending["name"],
        "email": pending["email"],
        "password": pending["password"],
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Delete pending registration
    await db.pending_registrations.delete_one({"email": email_lower})

    # Send welcome email
    send_welcome_email(user_doc["email"], user_doc["name"])

    # Generate token
    token = create_access_token({"sub": user_id, "email": user_doc["email"]})

    return {
        "user": {
            "id": user_id,
            "name": user_doc["name"],
            "email": user_doc["email"],
            "createdAt": now,
        },
        "token": {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
        "message": "Email verified and account created successfully.",
    }



async def login_user(data: LoginRequest) -> dict:
    """
    Authenticate user credentials and return JWT.
    - Looks up user by email
    - Verifies bcrypt password
    - Returns access token
    """
    db = get_db()

    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "email": user["email"]})

    return {
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"],
            "createdAt": user["createdAt"],
        },
        "token": {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
        "message": "Login successful.",
    }


async def get_user_profile(current_user: dict) -> dict:
    """Return the current authenticated user's profile."""
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "createdAt": current_user["createdAt"],
    }


async def google_login(data: GoogleLoginRequest) -> dict:
    """
    Authenticate user using Google ID Token.
    - Verifies the token with Google
    - Registers the user if they don't exist
    - Logs them in and returns a JWT
    """
    db = get_db()
    
    try:
        # Verify access token by fetching user profile
        import requests as req
        userinfo_response = req.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {data.credential}"}
        )
        
        if userinfo_response.status_code != 200:
            raise ValueError("Invalid token")
            
        idinfo = userinfo_response.json()
        
        email = idinfo['email'].lower()
        name = idinfo.get('name', '')
        
        # Check if user exists
        user = await db.users.find_one({"email": email})
        now = datetime.now(timezone.utc)
        
        if not user:
            # Create new user
            user_doc = {
                "name": name,
                "email": email,
                "password": hash_password(data.credential[:16]), # Dummy password for OAuth users
                "createdAt": now,
                "updatedAt": now,
            }
            result = await db.users.insert_one(user_doc)
            user_id = str(result.inserted_id)
            user = await db.users.find_one({"_id": result.inserted_id})
            
            # Send welcome email
            send_welcome_email(email, name)
        else:
            user_id = str(user["_id"])
            
        # Generate our JWT token
        token = create_access_token({"sub": user_id, "email": email})
        
        return {
            "user": {
                "id": user_id,
                "name": user["name"],
                "email": user["email"],
                "createdAt": user["createdAt"],
            },
            "token": {
                "access_token": token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            },
            "message": "Google Login successful.",
        }
        
    except ValueError:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credentials.",
        )
