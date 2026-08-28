import os
import httpx
import urllib.parse
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter()

# Bellek içi veri deposu: OAuth dönüşünde doğrulama sonuçlarını saklayacağımız geçici yapı.
# Gerçek production sistemlerinde bu verilerin Redis vb. dağıtık/kalıcı bir veritabanında tutulması gerekir.
verification_results = {}

# TODO: Production için NaC (Network-as-Code) Dashboard üzerinden alınan gerçek host adresleri ile güncellenmelidir.
NAC_AUTH_HOST = "https://network-as-code.p-eu.rapidapi.com" 
NAC_API_HOST = "https://network-as-code.p-eu.rapidapi.com/passthrough/camara/v1/number-verification"

# 1 ve 2. adımlar (Client Credentials & Well-Known Config) genellikle uygulamanın 
# ayağa kalkmasında veya belirli aralıklarla önbelleğe alınarak yapılır.
# Burada akışın temel yapısını sabitleyerek kuruyoruz.
AUTHORIZATION_ENDPOINT = f"{NAC_AUTH_HOST}/oauth2/v1/authorize" 
TOKEN_ENDPOINT = f"{NAC_AUTH_HOST}/oauth2/v1/token"

@router.get("/auth/number-verification/start", tags=["OAuth"])
async def start_verification(phone_number: str):
    """
    [Adım 3] Kullanıcıyı CAMARA Number Verification (OAuth 2.0) sayfasına yönlendirir.
    Kullanıcı kendi numarasını doğrulamak için şebeke sağlayıcısına (consent) gönderilir.
    """
    client_id = os.getenv("NOKIA_NAC_CLIENT_ID")
    # Geliştirme ortamı (localhost) veya prod yönlendirmesi için .env'den okunur
    redirect_uri = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/number-verification/callback")
    
    # API key tanımlı değilse geliştirici deneyimini (DX) bozmamak için mock yönlendirmesi yapılır.
    if not client_id or client_id == "your_nokia_client_id_here":
        print(f"[MOCK] OAuth Start: '{phone_number}' için sahte (mock) akış başlatılıyor.")
        mock_code = "mock_auth_code_for_" + phone_number.replace("+", "")
        # Kullanıcı şebeke sağlayıcı sayfasına gitmiş ve kabul etmiş gibi doğrudan callback'e düşüyoruz.
        return RedirectResponse(url=f"{redirect_uri}?code={mock_code}&state={phone_number}")

    scope = "dpv:FraudPreventionAndDetection number-verification:verify"
    
    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": scope,
        "login_hint": phone_number,
        # Güvenlik gereği state içerisine hem random token (CSRF önleme) hem de bağlam konulmalıdır.
        # Bu prototip için, geri dönüşte numarayı anlayabilmek adına doğrudan numarayı state'te taşıyoruz.
        "state": phone_number
    }
    
    url = f"{AUTHORIZATION_ENDPOINT}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)

@router.get("/auth/number-verification/callback", tags=["OAuth"])
async def verification_callback(code: str, state: str):
    """
    [Adım 4 ve 5] Kullanıcı şebeke sağlayıcısından (consent) geri döndüğünde çağrılan endpoint.
    'code' değeri token'a çevrilir, bu token ile gerçek Number Verification API'sine istek atılır.
    """
    phone_number = state
    client_id = os.getenv("NOKIA_NAC_CLIENT_ID")
    client_secret = os.getenv("NOKIA_NAC_CLIENT_SECRET")
    redirect_uri = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/number-verification/callback")
    
    # Mock / Simülasyon mantığı (Eğer gerçek kimlik bilgileri yoksa)
    if not client_id or client_id == "your_nokia_client_id_here" or code.startswith("mock_auth_code_for_"):
        print(f"[MOCK] Callback alındı. Numara: {phone_number}")
        # Test senaryosu gereği: Eğer numara '+99999990500' ise doğrulama başarısız (False) dönsün
        is_verified = False if phone_number == "+99999990500" else True
        verification_results[phone_number] = {"verified": is_verified, "status": "completed"}
        return {
            "message": "Doğrulama simüle edildi (MOCK).", 
            "phone_number": phone_number, 
            "verified": is_verified
        }

    # Gerçek token alma (Token Exchange) payload'u
    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # 4. Adım: Yetkilendirme kodu (code) ile Access Token alıyoruz
            token_res = await client.post(TOKEN_ENDPOINT, data=token_payload)
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            
            # 5. Adım: Alınan Access Token ile 'Number Verification' sorgusunu yapıyoruz
            verify_url = f"{NAC_API_HOST}/number-verification/v0/verify"
            verify_headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            verify_payload = {"phoneNumber": phone_number}
            
            verify_res = await client.post(verify_url, json=verify_payload, headers=verify_headers)
            verify_res.raise_for_status()
            
            verify_data = verify_res.json()
            
            # API'den dönen genelde 'devicePhoneNumberVerified' alanıdır (bool)
            is_verified = verify_data.get("devicePhoneNumberVerified", False)
            
            # Sonucu LangGraph ajanı okusun diye bellekteki sözlüğe kaydediyoruz
            verification_results[phone_number] = {
                "verified": is_verified,
                "raw_data": verify_data,
                "status": "completed"
            }
            
            return {
                "message": "Number Verification başarıyla tamamlandı.", 
                "verified": is_verified
            }

        except httpx.HTTPStatusError as e:
            print(f"[HATA] Number Verification Error: {e.response.text}")
            verification_results[phone_number] = {"verified": False, "status": "failed", "error": str(e)}
            raise HTTPException(status_code=500, detail="Doğrulama sırasında şebeke hatası oluştu.")
