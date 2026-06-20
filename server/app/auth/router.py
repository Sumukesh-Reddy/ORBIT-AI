from fastapi import APIRouter, Depends, status
from app.auth.schemas import (
    RegisterRequest, LoginRequest, GoogleLoginRequest, VerifyOTPRequest,
    AuthResponse, UserResponse, RegisterResponse,
)
from app.auth import service
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_200_OK,
    summary="Register a new user account (initiates OTP verification)",
)
async def register(data: RegisterRequest):
    """
    Initiate a new user registration.

    - Validates email uniqueness
    - Hashes password with bcrypt
    - Generates and sends a 6-digit OTP to the email
    """
    return await service.register_user(data)


@router.post(
    "/verify-otp",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Verify email OTP and finalize account registration",
)
async def verify_otp(data: VerifyOTPRequest):
    """
    Verify the 6-digit email OTP.
    Finalizes user account creation on success.
    """
    return await service.verify_otp(data)


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
)
async def login(data: LoginRequest):
    """
    Authenticate with email and password.

    - Returns JWT access token on success
    - Returns 401 on invalid credentials
    """
    return await service.login_user(data)


@router.post(
    "/google",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Login or Register with Google ID Token",
)
async def google_login(data: GoogleLoginRequest):
    """
    Authenticate with Google OAuth ID token.
    Registers the user if they don't exist.
    """
    return await service.google_login(data)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user",
)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Protected route — returns the profile of the authenticated user.
    Requires `Authorization: Bearer <token>` header.
    """
    return await service.get_user_profile(current_user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout (client-side token invalidation)",
)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout the current user.

    Since JWTs are stateless, logout is handled client-side by
    discarding the token. This endpoint is provided for API
    consistency and future token blocklist support.
    """
    return {"message": "Logged out successfully. Please discard your token."}
