from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.backend import hash_password, verify_password, create_access_token
from app.repositories.user_repository import UserRepository


class AuthManager:
    @staticmethod
    async def register(db: AsyncSession, user_id: str, password: str, nickname: str):
        if await UserRepository.get_user_by_user_id(db, user_id):
            raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")
        if await UserRepository.get_user_by_nickname(db, nickname):
            raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")
        hashed = hash_password(password)
        return await UserRepository.create_user(db, user_id, hashed, nickname)

    @staticmethod
    async def login(db: AsyncSession, user_id: str, password: str):
        user = await UserRepository.get_user_by_user_id(db, user_id)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
        token = create_access_token({"sub": user.user_id})
        await UserRepository.update_online_status(db, user.id, True)
        return token, user
