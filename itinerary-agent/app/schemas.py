from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, model_validator


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class Hotel(BaseModel):
    id: str = Field(alias="_id")
    name: str
    city: str
    country: str
    pricePerNight: float
    adultCount: int
    childCount: int
    facilities: list[str] = []


class PlanningRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=40)
    hotels: list[Hotel] = Field(max_length=150)
    today: date
    market: dict | None = None


class Item(BaseModel):
    kind: Literal["hotel", "activity", "transport"]
    title: str = Field(max_length=200)
    city: str = Field(max_length=100)
    date: date
    endDate: date | None = None
    description: str = Field(max_length=1500)
    hotelId: str | None = None

    @model_validator(mode="after")
    def valid_stay(self):
        if self.kind == "hotel" and (
            not self.endDate or not 1 <= (self.endDate - self.date).days <= 30
        ):
            raise ValueError("Hotel stays must have 1–30 nights.")
        return self


class Proposal(BaseModel):
    title: str = Field(max_length=150)
    summary: str = Field(max_length=2500)
    question: str = Field(
        default="",
        max_length=2000,
        description="Ask for missing dates, origin, party or budget. Empty only when ready for review.",
    )
    adults: int = Field(ge=1, le=20)
    children: int = Field(ge=0, le=20)
    budget: float = Field(
        ge=0, le=5000000, description="Total trip budget in INR, or zero if unknown."
    )
    items: list[Item] = Field(default_factory=list, max_length=90)
