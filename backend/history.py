from datetime import datetime

# In-memory evaluation history list
evaluation_history = []

def add_to_history(phone_number: str, decision: str, trust_score: int):
    """
    Adds the evaluation result to the history with a masked phone number.
    """
    # Mask the number for privacy (e.g.: ***1000)
    masked_number = f"***{phone_number[-4:]}" if len(phone_number) >= 4 else "***"
    
    record = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "phone_number": masked_number,
        "decision": decision,
        "trust_score": trust_score
    }
    
    evaluation_history.append(record)
    
def get_dashboard_summary():
    """
    Returns the last 20 records and a simple summary.
    """
    total = len(evaluation_history)
    approved = sum(1 for r in evaluation_history if r["decision"] == "APPROVE")
    blocked = sum(1 for r in evaluation_history if r["decision"] == "BLOCK")
    step_up = sum(1 for r in evaluation_history if r["decision"] == "STEP_UP_VERIFICATION")
    
    # Hypothetical calculation: assuming an average of $150 prevented fraud per BLOCK decision.
    # WARNING: This is an example scenario, not real data.
    estimated_fraud_prevented = blocked * 150

    # Last 20 records (we can reverse to put newest on top; take last 20 and reverse)
    recent_history = list(reversed(evaluation_history[-20:]))
    
    return {
        "summary": {
            "total": total,
            "approved": approved,
            "blocked": blocked,
            "step_up": step_up,
            "estimated_fraud_prevented": estimated_fraud_prevented
        },
        "history": recent_history
    }
