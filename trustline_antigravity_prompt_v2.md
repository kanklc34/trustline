# TrustLine — Antigravity İkinci Geliştirme Promptu (Derinleştirme)

Bu promptu Antigravity'ye tek seferde yapıştır. Başlamadan önce mevcut kod tabanını (backend/ ve frontend/) oku ve anla — bu, sıfırdan bir proje DEĞİL, mevcut çalışan bir projeye 3 ek özellik ekleme görevi.

## ÖNCE OKU: Mevcut Durum (DEĞİŞTİRME, sadece anla)

- Backend: FastAPI + LangGraph + Gemini 3.5 Flash Lite, gerçek Nokia NaC API'lerine bağlı (SIM Swap + Number Verification OAuth akışı TAMAMEN ÇALIŞIYOR ve test edildi)
- Frontend: Next.js, tek sayfa, telefon numarası + action_type girip "Check Trust" yapan bir arayüz
- `.env` dosyası `backend/` klasöründe duruyor (KÖK dizinde DEĞİL) — bunu değiştirme, path varsayımını bozma
- API key'ler zaten `.env`'de tanımlı ve çalışıyor durumda — bunlara dokunma, yeniden isteme

## YAPILACAK 3 EKLEME (sırayla, birini bitirmeden diğerine geçme)

### Ekleme 1: Üçüncü CAMARA sinyali — Device Status

- `backend/camara.py` içine yeni bir fonksiyon ekle: `check_device_status(phone_number: str) -> dict`
- Gerçek Nokia NaC endpoint şeması (dokümantasyondan doğrulanmış):
  ```
  POST https://network-as-code.p-eu.apihub.nokia.io/passthrough/camara/v1/device-status/device-status/v0/connectivity
  Headers: x-rapidapi-key, x-rapidapi-host: network-as-code.nokia.rapidapi.com, Content-Type: application/json
  Body: { "device": { "phoneNumber": "+99999991000" } }
  Response: { "connectivityStatus": "CONNECTED_DATA" | "CONNECTED_SMS" | "NOT_CONNECTED" }
  ```
  ⚠️ Bu path'i playground'da (https://networkascode.nokia.io/hub → Device Status v0.5.1) test etmeden kesinleştirme — SIM Swap'ta path tahmini yanlış çıkmıştı. Kod içine şu yorumu ekle:
  ```python
  # TODO(Kan): Bu path Nokia NaC playground'unda "Test Endpoint" ile doğrulanmalı.
  # Doğrulama adımları README.md > "Yeni API Ekleme" bölümünde.
  ```
- `agent.py`'deki `TrustAgentState`'e `device_status_result: dict` alanı ekle
- `collect_signals` düğümüne bu üçüncü sinyali de ekle (SIM Swap ve Number Verification ile paralel/ardışık, mevcut yapıyı bozmadan)
- `risk_policy.py`'deki `RISK_POLICY_PROMPT`'a Device Status için YENİ bir kural ekle (mevcut 5 kuralı SİLME, 6. kural olarak ekle): "Eğer cihaz NOT_CONNECTED ise ve aynı anda bir işlem talebi geliyorsa, bu şüphelidir (cihaz kapalıyken işlem gelemez) — skor 20 puan düşürülmeli"
- Frontend'de sonuç kartına üçüncü bir sinyal kutusu ekle (mevcut sim_swap ve number_verification kutularının yanına, aynı görsel stilde)

### Ekleme 2: Entegrasyon örneği + basit fiyatlandırma (SADECE DOKÜMANTASYON, KOD DEĞİL)

- `backend/README.md` içine (ana README'ye değil, backend'e özel yeni bir dosya: `backend/INTEGRATION.md`) şunu ekle:
  - "Nasıl Entegre Edilir" başlığı altında, bir fintech/e-ticaret platformunun TrustLine'ı nasıl çağıracağını gösteren 5-6 satırlık bir curl örneği (gerçek `/api/evaluate` endpoint'ini kullanarak — bunu zaten biliyorsun, uydurma)
  - "Fiyatlandırma Modeli (Öneri)" başlığı altında 3 satırlık basit bir tablo: Free tier (ayda 100 kontrol), Growth tier (kontrol başına ücret), Enterprise (özel SLA) — bunlar gerçek fiyat değil, kavramsal öneri olduğunu açıkça belirt
- Bu adımda HİÇBİR KOD DOSYASI DEĞİŞTİRME, sadece yeni bir markdown dosyası oluştur

### Ekleme 3: Basit Partner Dashboard görünümü

- Backend'de bellek-içi bir liste ekle: `evaluation_history = []` (yeni bir dosya: `backend/history.py`, ya da `main.py` içine — sen seç, ama var olan `verification_results` sözlüğüyle KARIŞTIRMA, ayrı bir yapı olsun)
- Her `/api/evaluate` çağrısı sonucunda bu listeye `{timestamp, phone_number (son 4 hane maskeli, örn "***1000"), decision, trust_score}` eklensin — TAM TELEFON NUMARASINI KAYDETME, gizlilik için maskele
- Yeni bir endpoint: `GET /api/dashboard-summary` → son 20 kaydı ve basit bir özet (`{"total": N, "approved": N, "blocked": N, "step_up": N}`) döndürsün
- Frontend'de yeni bir sayfa/sekme: `frontend/src/app/dashboard/page.tsx` — basit bir tablo (zaman, maskelenmiş numara, karar, skor) + üstte 3 sayaç kartı (Approved/Blocked/Step-up). Ana sayfadaki tasarım diliyle (Tailwind, aynı renk paleti) tutarlı olsun.
- Ana sayfaya (`page.tsx`) küçük bir link/buton ekle: "Partner Dashboard →" (yeni sayfaya götürsün)

## KESİN KURALLAR (ihlal etme)

1. **Mevcut çalışan hiçbir şeyi bozma.** `camara.py`'deki `check_sim_swap` ve `oauth.py`'deki OAuth akışı test edilmiş ve çalışıyor — bunları REFACTOR ETME, sadece yanına ekleme yap.
2. **`.env` dosyasına dokunma, yeni env variable istemiyorsan ekleme isteme.** Zaten var olan `NOKIA_NAC_API_KEY` ve `GEMINI_API_KEY` yeterli.
3. **Hiçbir API key/secret'ı kod içine hardcode etme**, hepsi `os.getenv(...)` ile okunmalı.
4. **`.gitignore`'a dokunma** — `.env`, `__pycache__`, `node_modules`, `.next` zaten orada, bunları koru.
5. **Git commit/push YAPMA.** Sadece dosyaları oluştur/değiştir, commit atmak veya remote'a push etmek tamamen Kan'ın kararı — sen hiçbir git komutu çalıştırma.
6. **Yeni bir üçüncü-parti servis/paket ekleme** (veritabanı, Redis, yeni bir LLM sağlayıcısı vb.) — bellek-içi Python listesi/sözlüğü yeterli, bu bir hackathon prototipi.
7. **Var olan dosya yapısını koru** — yeni dosyaları mantıklı yerlere ekle (backend/ içine yeni .py dosyaları, frontend/src/app/ içine yeni route'lar), ama klasör isimlerini/ana yapıyı değiştirme.
8. **Telefon numaralarını asla maskelemeden loglama veya saklama** — dashboard history'de mutlaka maskeli olsun (`***` + son 4 hane).
9. Her üç ekleme bitince, `README.md`'ye "Yeni Özellikler" başlığı altında ne eklendiğini 3-4 satırla özetle (kod detayına girme, sadece ne yaptığını anlat).
10. İşin sonunda hangi dosyaların değiştiğinin/eklendiğinin bir listesini ver (dosya adı + tek satır açıklama), ki Kan neyin değiştiğini hızlıca görebilsin.
