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
        # 8자 이상 + 대문자 + 소문자 + 숫자 + 특수문자 모두 포함
        # 특수문자 셋은 일반적인 ASCII 기호 전체를 허용 (좁은 셋으로 잡으면 사용자가 흔히 쓰는 비번에서 400 발생)
        if len(v) < 8:
            raise ValueError('비밀번호는 8자 이상이어야 합니다.')
        if not re.search(r'[a-z]', v):
            raise ValueError('비밀번호에 소문자가 포함되어야 합니다.')
        if not re.search(r'[A-Z]', v):
            raise ValueError('비밀번호에 대문자가 포함되어야 합니다.')
        if not re.search(r'\d', v):
            raise ValueError('비밀번호에 숫자가 포함되어야 합니다.')
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>/?`~]', v):
            raise ValueError('비밀번호에 특수문자가 포함되어야 합니다.')
        return v


class LoginRequest(BaseModel):
    user_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'