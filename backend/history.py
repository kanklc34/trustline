from datetime import datetime

# Bellek-içi değerlendirme geçmişi listesi
evaluation_history = []

def add_to_history(phone_number: str, decision: str, trust_score: int):
    """
    Değerlendirme sonucunu maskelenmiş numara ile geçmişe ekler.
    """
    # Gizlilik için numarayı maskele (örn: ***1000)
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
    Son 20 kaydı ve basit bir özeti döndürür.
    """
    total = len(evaluation_history)
    approved = sum(1 for r in evaluation_history if r["decision"] == "APPROVE")
    blocked = sum(1 for r in evaluation_history if r["decision"] == "BLOCK")
    step_up = sum(1 for r in evaluation_history if r["decision"] == "STEP_UP_VERIFICATION")
    
    # Son 20 kayıt (en yeni en üstte olması için ters çevirebiliriz, şimdilik sondan 20 alıp ters çevirelim)
    recent_history = list(reversed(evaluation_history[-20:]))
    
    return {
        "summary": {
            "total": total,
            "approved": approved,
            "blocked": blocked,
            "step_up": step_up
        },
        "history": recent_history
    }
