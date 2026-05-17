from typing import Optional
from pydantic import BaseModel
import re


class RegisterRequest(BaseModel):
    user_id: str
    password: str
    nickname: str

    @staticmethod
    def validate_password(v: str) -> str:
        if not re.match(r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$", v):
            raise ValueError("비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.")
        return v

    @staticmethod
    def validate_user_id(v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_]{3,20}$", v):
            raise ValueError("아이디는 영문/숫자/밑줄 3~20자여야 합니다.")
        return v


class LoginRequest(BaseModel):
    user_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
