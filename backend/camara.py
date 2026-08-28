import os
import httpx

# TODO: NaC dashboard'undan alınacak tam path'i buraya yerleştirin.
# Örnek/beklenen tam path benzeri: .../camara/v1/sim-swap/sim-swap/v0/check
SIM_SWAP_URL = "https://network-as-code.p-eu.rapidapi.com/passthrough/camara/v1/sim-swap/..._TODO_TAM_PATH_BURAYA_GELECEK_..."

async def check_sim_swap(phone_number: str) -> dict:
    """
    Belirtilen telefon numarası için son 240 saat (10 gün) içinde SIM değişikliği 
    olup olmadığını CAMARA API üzerinden kontrol eder.
    """
    api_key = os.getenv("NOKIA_NAC_API_KEY")
    
    # Geliştirme kolaylığı: Eğer API Key tanımlanmamışsa hata atmak yerine simüle edelim.
    if not api_key or api_key == "your_nokia_nac_api_key_here":
        print(f"[MOCK] Uyarı: NOKIA_NAC_API_KEY bulunamadı. '{phone_number}' için simülasyon verisi dönülüyor.")
        # Simülatör numaralarından birini "swapped: true" dönmesi için kurgulayalım
        if phone_number == "+99999990404": 
            return {"swapped": True}
        return {"swapped": False}
        
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "network-as-code.nokia.rapidapi.com",
        "Content-Type": "application/json"
    }
    
    payload = {
        "phoneNumber": phone_number,
        "maxAge": 240
    }
    
    # Asenkron HTTP isteği atıyoruz
    async with httpx.AsyncClient() as client:
        response = await client.post(SIM_SWAP_URL, json=payload, headers=headers)
        
        # Eğer sunucudan hata dönerse (örn 401, 404, 500) exception fırlatmasını sağlarız
        response.raise_for_status()
        
        return response.json()
