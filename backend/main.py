from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from camara import check_sim_swap

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

# İstek (Request) gövdeleri için Pydantic modelleri
class PhoneRequest(BaseModel):
    phone_number: str

@app.get("/")
def read_root():
    """API'nin ayakta olup olmadığını kontrol etmek için basit bir uç nokta."""
    return {"message": "TrustLine API çalışıyor"}

@app.post("/api/sim-swap-check")
async def api_sim_swap_check(request: PhoneRequest):
    """
    Verilen numara için SIM swap sinyalini toplar.
    Bu uç nokta, ileride ajanın "collect_signals" aşamasında kullanılacak, 
    şu an test için bağımsız olarak eklendi.
    """
    try:
        result = await check_sim_swap(request.phone_number)
        return {"success": True, "data": result}
    except Exception as e:
        # Hata durumlarında düzgün JSON hata mesajı dönmesi için HTTPException kullanıyoruz
        raise HTTPException(status_code=500, detail=str(e))
