from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from camara import check_sim_swap
from oauth import router as auth_router, verification_results
from agent import run_trust_agent
from history import add_to_history, get_dashboard_summary

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="TrustLine API",
    description="GSMA MENA Ignite Hackathon - AI based SIM Swap and Number Verification agent",
    version="1.0.0"
)

# CORS settings to allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allowing all origins for development environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Including the router that contains OAuth 2.0 (Number Verification) redirects into the main app
app.include_router(auth_router)

# Pydantic models for Request bodies
class PhoneRequest(BaseModel):
    phone_number: str

class EvaluateRequest(BaseModel):
    phone_number: str
    action_type: str = "login"

@app.get("/")
def read_root():
    """A simple endpoint to check if the API is up and running."""
    return {"message": "TrustLine API is running"}

@app.post("/api/sim-swap-check")
async def api_sim_swap_check(request: PhoneRequest):
    """(Test Endpoint) Tests the independent SIM swap signal for a given number."""
    try:
        result = await check_sim_swap(request.phone_number)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/number-verification-result/{phone_number}")
async def get_verification_result(phone_number: str):
    """(Test Endpoint) Returns the current state of the Number Verification OAuth flow."""
    result = verification_results.get(phone_number)
    if not result:
        return {"status": "pending", "verified": None, "message": "OAuth flow has not been initiated yet or is still in progress."}
    return result

@app.post("/api/evaluate")
async def api_evaluate_trust(request: EvaluateRequest):
    """
    [MAIN ENDPOINT] Triggers the LangGraph AI agent when called from the frontend.
    The agent runs the steps 'collect_signals' -> 'evaluate_risk' -> 'decide' -> 'explain'
    and returns a final decision.
    """
    try:
        final_state = await run_trust_agent(request.phone_number, request.action_type)
        
        # Add to dashboard history
        add_to_history(
            phone_number=final_state.get("phone_number"),
            decision=final_state.get("decision"),
            trust_score=final_state.get("trust_score")
        )
        
        return {
            "success": True,
            "data": {
                "phone_number": final_state.get("phone_number"),
                "action_type": final_state.get("action_type"),
                "trust_score": final_state.get("trust_score"),
                "decision": final_state.get("decision"),
                "explanation": final_state.get("explanation"),
                "reasoning": final_state.get("reasoning"),
                "signals": {
                    "sim_swap": final_state.get("sim_swap_result"),
                    "number_verification": final_state.get("number_verification_result"),
                    "device_status": final_state.get("device_status_result")
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while running the agent: {str(e)}")

@app.get("/api/dashboard-summary")
def api_dashboard_summary():
    """
    Returns history summary and recent transactions for the Dashboard.
    """
    return get_dashboard_summary()
