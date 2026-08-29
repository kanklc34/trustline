import os
import httpx

# Nokia NaC playground'undan doğrulanan gerçek endpoint (Test Endpoint cURL çıktısından alındı)
SIM_SWAP_URL = "https://network-as-code.p-eu.apihub.nokia.io/passthrough/camara/v1/sim-swap/sim-swap/v0/check"


async def check_sim_swap(phone_number: str) -> dict:
    """
    Belirtilen telefon numarası için son 240 saat (10 gün) içinde SIM değişikliği
    olup olmadığını CAMARA API üzerinden kontrol eder.
    """
    api_key = os.getenv("NOKIA_NAC_API_KEY")

    # Geliştirme kolaylığı: Eğer API Key tanımlanmamışsa hata atmak yerine simüle edelim.
    if not api_key or api_key == "your_nokia_nac_api_key_here":
        print(
            f"[MOCK] Uyarı: NOKIA_NAC_API_KEY bulunamadı. '{phone_number}' için simülasyon verisi dönülüyor."
        )
        # Simülatör numaralarından birini "swapped: true" dönmesi için kurgulayalım
        if phone_number == "+99999990404":
            return {"swapped": True}
        return {"swapped": False}

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "network-as-code.nokia.rapidapi.com",
        "Content-Type": "application/json",
    }

    payload = {"phoneNumber": phone_number, "maxAge": 240}

    # Asenkron HTTP isteği atıyoruz
    async with httpx.AsyncClient() as client:
        response = await client.post(SIM_SWAP_URL, json=payload, headers=headers)

        # Eğer sunucudan hata dönerse (örn 401, 404, 500) exception fırlatmasını sağlarız
        response.raise_for_status()

        return response.json()


# TODO(Kan): Bu path Nokia NaC playground'unda "Test Endpoint" ile doğrulanmalı.
# Doğrulama adımları README.md > "Yeni API Ekleme" bölümünde.
DEVICE_STATUS_URL = (
    "https://network-as-code.p-eu.apihub.nokia.io/device-status/v0/connectivity"
)


async def check_device_status(phone_number: str) -> dict:
    """
    Belirtilen telefon numarası için cihazın ağa bağlı olup olmadığını kontrol eder.
    """
    api_key = os.getenv("NOKIA_NAC_API_KEY")

    if not api_key or api_key == "your_nokia_nac_api_key_here":
        print(
            f"[MOCK] Uyarı: NOKIA_NAC_API_KEY bulunamadı. '{phone_number}' için Device Status simülasyon verisi dönülüyor."
        )
        if phone_number == "+99999990500":
            return {"connectivityStatus": "NOT_CONNECTED"}
        return {"connectivityStatus": "CONNECTED_DATA"}

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "network-as-code.nokia.rapidapi.com",
        "Content-Type": "application/json",
    }

    payload = {"device": {"phoneNumber": phone_number}}

    async with httpx.AsyncClient() as client:
        response = await client.post(DEVICE_STATUS_URL, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
