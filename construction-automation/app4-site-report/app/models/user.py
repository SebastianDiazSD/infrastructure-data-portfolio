# app/models/user.py

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import string

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "Bauüberwacher"
    default_project_name: Optional[str]=None
    default_project_id: Optional[str]=None
    language: str="de"

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v:str) -> str:
        # Check length
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        # Check for at least one uppercase letter
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        # Check for at least one lowercase letter
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter.")
        # Check for at least one digit
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number.")
        # Check for at least one special character
        special_chars = string.punctuation  # Includes: !@#$%^&*()_+-= etc.
        if not any(c in special_chars for c in v):
            raise ValueError("Password must contain at least one special character.")

        return v

    @field_validator("full_name","role")
    @classmethod
    def no_empty_strings(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field cannot be empty.")
        return v.strip()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id:str
    email:str
    full_name:str
    role:str
    default_project_name:Optional[str]
    default_project_id:Optional[str]
    language:str

class TokenResponse(BaseModel):
    access_token:str
    token_type:str = "bearer"
    user:UserResponse