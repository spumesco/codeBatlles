from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.manager import AuthManager
from app.auth.dependencies import get_current_user
from app.auth.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserRead
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthManager.register(db, body.user_id, body.password, body.nickname)
    return {"message": "회원가입 성공", "user_id": user.user_id}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    token, _ = await AuthManager.login(db, body.user_id, body.password)
    return TokenResponse(access_token=token)


@router.post("/logout")
async def logout(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await UserRepository.update_online_status(db, current_user.id, False)
    return {"message": "로그아웃 성공"}


@router.get("/me", response_model=UserRead)
async def me(current_user=Depends(get_current_user)):
    return current_user
