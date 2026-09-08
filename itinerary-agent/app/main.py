import asyncio
import logging
import os
import secrets
from fastapi import Depends, FastAPI, Header, HTTPException
from app.agents.itinerary import plan
from app.schemas import PlanningRequest, Proposal

app = FastAPI(title="Stayora Itinerary Agent", docs_url=None, redoc_url=None)
logger = logging.getLogger("stayora.agent")


async def authorize(authorization: str = Header(default="")):
    token = os.environ.get("AGENT_SERVICE_TOKEN", "")
    if not token or len(token) < 32:
        raise HTTPException(503, "Agent service token is not configured.")
    if not secrets.compare_digest(authorization, "Bearer " + token):
        raise HTTPException(401, "Invalid service credential.")


@app.get("/health")
async def health():
    configured = bool(
        os.environ.get("OPENAI_API_KEY") or os.environ.get("MODEL_API_KEY")
    )
    return {
        "status": "ok",
        "plannerConfigured": configured,
        "model": os.environ.get("AGENT_MODEL"),
        "baseUrl": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    }


@app.post("/itinerary/plan", response_model=Proposal, dependencies=[Depends(authorize)])
async def itinerary(request: PlanningRequest):
    if not (os.environ.get("OPENAI_API_KEY") or os.environ.get("MODEL_API_KEY")):
        raise HTTPException(503, "Configure a model provider before planning.")
    try:
        async with asyncio.timeout(80):
            return await plan(request)
    except TimeoutError:
        raise HTTPException(504, "Planning timed out. Please retry.") from None
    except Exception:
        logger.exception("Planning failed")
        raise HTTPException(502, "Planning failed. Please retry.") from None
