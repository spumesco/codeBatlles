from pydantic import BaseModel, field_validator
import re


class RegisterRequest(BaseModel):
    user_id: str
    password: str
    nickname: str

    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9]{4,20}$', v):
            raise ValueError('아이디는 영문/숫자 조합 4~20자여야 합니다.')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$', v):
            raise ValueError('비밀번호는 영문+숫자+특수문자 조합 8자 이상이어야 합니다.')
        return v


class LoginRequest(BaseModel):
    user_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'