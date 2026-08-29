import os
import httpx
import urllib.parse
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter()

# Bellek içi veri deposu: OAuth dönüşünde doğrulama sonuçlarını saklayacağımız geçici yapı.
# Gerçek production sistemlerinde bu verilerin Redis vb. dağıtık/kalıcı bir veritabanında tutulması gerekir.
verification_results = {}

# SIM Swap testinde doğrulanan gerçek host: network-as-code.p-eu.apihub.nokia.io
NAC_AUTH_HOST = "https://network-as-code.p-eu.apihub.nokia.io"
NAC_API_HOST = "https://network-as-code.p-eu.apihub.nokia.io/passthrough/camara/v1/number-verification"

# Dinamik olarak çekilen değerleri bellekte tutuyoruz (uygulama her açıldığında tekrar çekilir)
_oauth_config_cache: dict = {}

async def get_oauth_config() -> dict:
    """
    Dökümanın 1. ve 2. adımlarını uygular:
    1) /oauth2/v1/auth/clientcredentials -> client_id, client_secret
    2) /.well-known/openid-configuration -> authorization_endpoint, token_endpoint
    Bu bilgiler değişmediği için basitçe önbelleğe alınır (process ömrü boyunca bir kez çekilir).
    """
    if _oauth_config_cache:
        return _oauth_config_cache

    api_key = os.getenv("NOKIA_NAC_API_KEY")
    headers = {
        "x-rapidapi-host": "network-as-code.nokia.rapidapi.com",
        "x-rapidapi-key": api_key,
    }

    async with httpx.AsyncClient() as client:
        cred_res = await client.get(f"{NAC_AUTH_HOST}/oauth2/v1/auth/clientcredentials", headers=headers)
        cred_res.raise_for_status()
        creds = cred_res.json()

        wellknown_res = await client.get(f"{NAC_AUTH_HOST}/.well-known/openid-configuration", headers=headers)
        wellknown_res.raise_for_status()
        wellknown = wellknown_res.json()

    _oauth_config_cache.update({
        "client_id": creds.get("client_id"),
        "client_secret": creds.get("client_secret"),
        "authorization_endpoint": wellknown.get("authorization_endpoint"),
        "token_endpoint": wellknown.get("token_endpoint"),
    })
    return _oauth_config_cache

@router.get("/auth/number-verification/start", tags=["OAuth"])
async def start_verification(phone_number: str):
    """
    [Adım 3] Kullanıcıyı CAMARA Number Verification (OAuth 2.0) sayfasına yönlendirir.
    Kullanıcı kendi numarasını doğrulamak için şebeke sağlayıcısına (consent) gönderilir.
    """
    # Query parametresinden gelen numarayı normalize ediyoruz (bkz. callback'teki aynı not).
    phone_number = phone_number.strip()
    if not phone_number.startswith("+"):
        phone_number = "+" + phone_number.lstrip()

    api_key = os.getenv("NOKIA_NAC_API_KEY")
    redirect_uri = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/number-verification/callback")

    # API key tanımlı değilse geliştirici deneyimini (DX) bozmamak için mock yönlendirmesi yapılır.
    if not api_key or api_key == "your_nokia_nac_api_key_here":
        print(f"[MOCK] OAuth Start: '{phone_number}' için sahte (mock) akış başlatılıyor.")
        mock_code = "mock_auth_code_for_" + phone_number.replace("+", "")
        return RedirectResponse(url=f"{redirect_uri}?code={mock_code}&state={phone_number}")

    try:
        config = await get_oauth_config()
    except Exception as e:
        print(f"[HATA] OAuth config alınamadı: {e}")
        raise HTTPException(status_code=502, detail="Nokia NaC OAuth yapılandırması alınamadı.")

    scope = "dpv:FraudPreventionAndDetection number-verification:verify"

    params = {
        "client_id": config["client_id"],
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": scope,
        "login_hint": phone_number,
        # Güvenlik gereği state içerisine hem random token (CSRF önleme) hem de bağlam konulmalıdır.
        # Bu prototip için, geri dönüşte numarayı anlayabilmek adına doğrudan numarayı state'te taşıyoruz.
        "state": phone_number
    }

    url = f"{config['authorization_endpoint']}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)

@router.get("/auth/number-verification/callback", tags=["OAuth"])
async def verification_callback(code: str, state: str):
    """
    [Adım 4 ve 5] Kullanıcı şebeke sağlayıcısından (consent) geri döndüğünde çağrılan endpoint.
    'code' değeri token'a çevrilir, bu token ile gerçek Number Verification API'sine istek atılır.
    """
    # NOT: OAuth redirect zincirinde '+' karakteri bazen URL query string kurallarına göre
    # boşluğa dönüşebiliyor (application/x-www-form-urlencoded'da '+' = boşluk demektir).
    # Bu yüzden numarayı kullanmadan önce normalize ediyoruz: boşlukları temizle, eksikse '+' ekle.
    phone_number = state.strip()
    if not phone_number.startswith("+"):
        phone_number = "+" + phone_number.lstrip()
    redirect_uri = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/number-verification/callback")

    # Mock / Simülasyon mantığı (Eğer gerçek kimlik bilgileri yoksa)
    if code.startswith("mock_auth_code_for_"):
        print(f"[MOCK] Callback alındı. Numara: {phone_number}")
        # Test senaryosu gereği: Eğer numara '+99999990500' ise doğrulama başarısız (False) dönsün
        is_verified = False if phone_number == "+99999990500" else True
        verification_results[phone_number] = {"verified": is_verified, "status": "completed"}
        return {
            "message": "Doğrulama simüle edildi (MOCK).", 
            "phone_number": phone_number, 
            "verified": is_verified
        }

    try:
        config = await get_oauth_config()
    except Exception as e:
        print(f"[HATA] OAuth config alınamadı: {e}")
        raise HTTPException(status_code=502, detail="Nokia NaC OAuth yapılandırması alınamadı.")

    # Gerçek token alma (Token Exchange) payload'u
    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": redirect_uri
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # 4. Adım: Yetkilendirme kodu (code) ile Access Token alıyoruz
            token_res = await client.post(config["token_endpoint"], data=token_payload)
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            
            # 5. Adım: Alınan Access Token ile 'Number Verification' sorgusunu yapıyoruz
            verify_url = f"{NAC_API_HOST}/number-verification/v0/verify"
            verify_headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "x-rapidapi-key": os.getenv("NOKIA_NAC_API_KEY"),
                "x-rapidapi-host": "network-as-code.nokia.rapidapi.com",
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
