from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from camara import check_sim_swap
from oauth import router as auth_router, verification_results
from agent import run_trust_agent
from history import add_to_history, get_dashboard_summary

# Çevresel değişkenleri .env dosyasından yükle
load_dotenv()

app = FastAPI(
    title="TrustLine API",
    description="GSMA MENA Ignite Hackathon - AI tabanlı SIM Swap ve Number Verification ajanı",
    version="1.0.0"
)

# Frontend'in backend'e erişebilmesi için CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme ortamı için tüm kökenlere izin veriyoruz
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth 2.0 (Number Verification) yönlendirmelerini içeren router'ı ana uygulamaya bağlıyoruz
app.include_router(auth_router)

# İstek (Request) gövdeleri için Pydantic modelleri
class PhoneRequest(BaseModel):
    phone_number: str

class EvaluateRequest(BaseModel):
    phone_number: str
    action_type: str = "login"

@app.get("/")
def read_root():
    """API'nin ayakta olup olmadığını kontrol etmek için basit bir uç nokta."""
    return {"message": "TrustLine API çalışıyor"}

@app.post("/api/sim-swap-check")
async def api_sim_swap_check(request: PhoneRequest):
    """(Test Endpoint'i) Verilen numara için bağımsız SIM swap sinyalini test eder."""
    try:
        result = await check_sim_swap(request.phone_number)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/number-verification-result/{phone_number}")
async def get_verification_result(phone_number: str):
    """(Test Endpoint'i) Number Verification OAuth akışının mevcut durumunu döndürür."""
    result = verification_results.get(phone_number)
    if not result:
        return {"status": "pending", "verified": None, "message": "Henüz OAuth akışı başlatılmadı veya devam ediyor."}
    return result

@app.post("/api/evaluate")
async def api_evaluate_trust(request: EvaluateRequest):
    """
    [ANA UÇ NOKTA] Frontend üzerinden çağrıldığında LangGraph AI ajanını tetikler.
    Ajan, 'collect_signals' -> 'evaluate_risk' -> 'decide' -> 'explain' adımlarını çalıştırır
    ve nihai bir karar döner.
    """
    try:
        final_state = await run_trust_agent(request.phone_number, request.action_type)
        
        # Dashboard geçmişine ekle
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
        raise HTTPException(status_code=500, detail=f"Ajan çalıştırılırken hata oluştu: {str(e)}")

@app.get("/api/dashboard-summary")
def api_dashboard_summary():
    """
    Dashboard için geçmiş özetini ve son işlemleri döndürür.
    """
    return get_dashboard_summary()
