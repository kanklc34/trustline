from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

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

@app.get("/")
def read_root():
    return {"message": "TrustLine API çalışıyor"}
