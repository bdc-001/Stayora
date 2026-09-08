import asyncio
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import app
from app.schemas import Proposal, Item, PlanningRequest
from app.agents.itinerary import build_agent, TravelDeps
from pydantic_ai.models.test import TestModel

client = TestClient(app)
payload = {
    "messages": [{"role": "user", "content": "Plan London"}],
    "hotels": [],
    "today": "2026-12-01",
}


def test_private_service_rejects_browser(monkeypatch):
    monkeypatch.setenv("AGENT_SERVICE_TOKEN", "a" * 32)
    assert client.post("/itinerary/plan", json=payload).status_code == 401


def test_missing_model_is_explicit(monkeypatch):
    monkeypatch.setenv("AGENT_SERVICE_TOKEN", "a" * 32)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    r = client.post(
        "/itinerary/plan", headers={"Authorization": "Bearer " + "a" * 32}, json=payload
    )
    assert r.status_code == 503


def test_stay_dates_and_party_validation():
    with pytest.raises(ValidationError):
        Item(
            kind="hotel",
            title="Stay",
            city="London",
            date="2026-12-10",
            endDate="2026-12-01",
            description="Stay",
        )
    with pytest.raises(ValidationError):
        Proposal(title="Trip", summary="Trip", adults=0, children=0, budget=100)


def test_template_agent_structured_output(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    agent = build_agent()
    expected = {
        "title": "London escape",
        "summary": "Let us find your dates.",
        "question": "What dates and budget?",
        "adults": 2,
        "children": 0,
        "budget": 0,
        "items": [],
    }
    with agent.override(model=TestModel(call_tools=[], custom_output_args=expected)):
        result = asyncio.run(agent.run("London for two", deps=TravelDeps([])))
    assert result.output.question == expected["question"]
    assert result.output.items == []


def test_oversized_conversation():
    with pytest.raises(ValidationError):
        PlanningRequest.model_validate({**payload, "messages": payload["messages"] * 41})
