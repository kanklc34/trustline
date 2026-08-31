import os
import json
import asyncio
from typing import Dict, Any, TypedDict
from langgraph.graph import StateGraph, END
from google import genai

from risk_policy import RISK_POLICY_PROMPT
from camara import check_sim_swap, check_device_status, DEMO_PENDING_VERIFICATION_NUMBER
from oauth import verification_results

# 1. State Definition (Data structure updated by the State Machine at each node)
class TrustAgentState(TypedDict):
    phone_number: str
    action_type: str
    
    # Signals
    sim_swap_result: dict
    number_verification_result: dict
    device_status_result: dict
    
    # Gemini Evaluation
    trust_score: int
    signal_breakdown: list
    reasoning: str
    confidence: str
    
    # Final Decision and Explanation
    decision: str
    explanation: str

# 2. Nodes
async def collect_signals(state: TrustAgentState) -> dict:
    """Collects SIM Swap, Number Verification, and Device Status signals."""
    phone_number = state["phone_number"]
    
    # Collecting signals
    sim_swap_data = await check_sim_swap(phone_number)
    device_status_data = await check_device_status(phone_number)
    
    # Since Number Verification is completed asynchronously with OAuth, we check its latest state in memory
    if phone_number == DEMO_PENDING_VERIFICATION_NUMBER:
        # Demo scenario number: always shown as "pending", regardless of any OAuth flow
        # that may have run for it in memory. Guarantees a reliable STEP_UP_VERIFICATION demo.
        nv_data = {"status": "pending", "verified": None, "_demo_scenario": True}
    else:
        nv_data = verification_results.get(phone_number, {"status": "pending", "verified": None})
    
    return {
        "sim_swap_result": sim_swap_data,
        "number_verification_result": nv_data,
        "device_status_result": device_status_data
    }

def evaluate_risk(state: TrustAgentState) -> dict:
    """Passes the signals to Gemini 2.5 Flash to calculate the trust_score."""
    api_key = os.getenv("GEMINI_API_KEY")
    
    # If API key is not entered, return a MOCK evaluation so the flow doesn't break
    if not api_key or api_key == "your_gemini_api_key_here":
        print("[MOCK] Gemini API Key not found, performing a mock evaluation.")

        sim_swapped = state["sim_swap_result"].get("swapped", False)
        sim_swap_unavailable = state["sim_swap_result"].get("_error", False) or sim_swapped is None
        device_status = state["device_status_result"].get("connectivityStatus", "UNKNOWN")
        nv_status = state["number_verification_result"].get("status")
        nv_verified = state["number_verification_result"].get("verified")

        # Build a signal breakdown that mirrors the real risk policy's logic
        # (see risk_policy.py), so the demo/mock deployment still shows the
        # same transparent, signal-by-signal reasoning as the live version —
        # instead of a generic "mock evaluation" placeholder that undersells
        # the product's core feature.
        breakdown = []

        if sim_swap_unavailable:
            breakdown.append({"signal": "sim_swap", "impact": "neutral", "points": 0, "note": "SIM Swap signal unavailable; treated as unverified"})
            score = 55
        elif sim_swapped:
            breakdown.append({"signal": "sim_swap", "impact": "negative", "points": -30, "note": "SIM has changed within the last 240 hours"})
        else:
            breakdown.append({"signal": "sim_swap", "impact": "neutral", "points": 0, "note": "No recent SIM change detected"})

        if nv_verified is True:
            breakdown.append({"signal": "number_verification", "impact": "positive", "points": 15, "note": "Number is verified to match the device"})
        elif nv_verified is False:
            breakdown.append({"signal": "number_verification", "impact": "negative", "points": -20, "note": "Number verification failed"})
        else:
            breakdown.append({"signal": "number_verification", "impact": "negative", "points": -20, "note": f"Number verification is {nv_status or 'pending'}; treated as unverified"})

        if device_status == "NOT_CONNECTED":
            breakdown.append({"signal": "device_status", "impact": "negative", "points": -20, "note": "Device is not connected to the network"})
        elif device_status in ("CONNECTED_DATA", "CONNECTED_SMS"):
            breakdown.append({"signal": "device_status", "impact": "positive", "points": 5, "note": f"Device is actively connected ({device_status})"})
        else:
            breakdown.append({"signal": "device_status", "impact": "neutral", "points": 0, "note": f"Device status: {device_status}"})

        if sim_swap_unavailable:
            score = 55
        elif nv_verified == True and not sim_swapped:
            score = 90
        elif sim_swapped:
            score = 25
        else:
            score = 60 # pending or ambiguous

        return {
            "trust_score": score,
            "signal_breakdown": breakdown,
            "reasoning": "Demo mode (no live Gemini/Nokia credentials configured): this evaluation uses the same fixed decision thresholds and risk-policy logic as the full system, applied deterministically instead of via live LLM reasoning.",
            "confidence": "medium"
        }
    
    # Real Gemini integration (new google-genai SDK)
    client = genai.Client(api_key=api_key)

    prompt = f"""
    {RISK_POLICY_PROMPT}

    CURRENT STATE:
    - Action Type: {state["action_type"]}
    - SIM Swap Result: {json.dumps(state["sim_swap_result"])}
    - Number Verification Result: {json.dumps(state["number_verification_result"])}
    - Device Status Result: {json.dumps(state["device_status_result"])}
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
        )
        # JSON parsing (some LLMs might return it inside a markdown block, clean it up)
        response_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(response_text)

        # Parse trust_score defensively: Gemini may occasionally return it as a
        # string (e.g. "45") or a float (e.g. 45.0) instead of a plain int, or
        # omit/garble it. We don't want a formatting quirk on this one field to
        # throw away an otherwise valid reasoning/signal_breakdown response.
        raw_score = data.get("trust_score", 50)
        try:
            score = int(round(float(raw_score)))
        except (TypeError, ValueError):
            print(f"[WARN] Gemini returned a non-numeric trust_score ({raw_score!r}); defaulting to 50.")
            score = 50
        # Clamp to the documented 0-100 range in case the model drifts outside it.
        score = max(0, min(100, score))

        return {
            "trust_score": score,
            "signal_breakdown": data.get("signal_breakdown", []),
            "reasoning": data.get("reasoning", "Could not generate reasoning."),
            "confidence": data.get("confidence", "low")
        }
    except Exception as e:
        print(f"[ERROR] Gemini Evaluation Error: {e}")
        # Fail-safe approach in case of API error (low score to avoid risking security)
        return {
            "trust_score": 30,
            "signal_breakdown": [],
            "reasoning": "An error occurred during AI evaluation. Default low score assigned.",
            "confidence": "low"
        }

def decide(state: TrustAgentState) -> dict:
    """Generates a strict rule-based decision based on the trust_score. (Thresholds are not left to the LLM)"""
    score = state.get("trust_score", 0)
    
    if score >= 70:
        decision = "APPROVE"
    elif 40 <= score < 70:
        decision = "STEP_UP_VERIFICATION"
    else:
        decision = "BLOCK"
        
    return {"decision": decision}

def explain(state: TrustAgentState) -> dict:
    """Packages the final state into a text that can be logged and returned to the UI."""
    decision = state.get("decision")
    reasoning = state.get("reasoning")
    score = state.get("trust_score")
    
    explanation = f"DECISION: {decision} (Score: {score}/100) | REASONING: {reasoning}"
    return {"explanation": explanation}


# 3. LangGraph Workflow (State Machine) Setup
workflow = StateGraph(TrustAgentState)

# Add nodes
workflow.add_node("collect_signals", collect_signals)
workflow.add_node("evaluate_risk", evaluate_risk)
workflow.add_node("decide", decide)
workflow.add_node("explain", explain)

# Set edges
workflow.set_entry_point("collect_signals")
workflow.add_edge("collect_signals", "evaluate_risk")
workflow.add_edge("evaluate_risk", "decide")
workflow.add_edge("decide", "explain")
workflow.add_edge("explain", END)

# Compile agent
trust_agent = workflow.compile()

async def run_trust_agent(phone_number: str, action_type: str = "login") -> dict:
    """Helper function to be called from the outside"""
    initial_state = {
        "phone_number": phone_number,
        "action_type": action_type
    }
    
    # Run the LangGraph state machine asynchronously
    final_state = await trust_agent.ainvoke(initial_state)
    return final_state
