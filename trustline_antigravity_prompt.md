# TrustLine — Antigravity Geliştirme Promptu

Bu dosyanın tamamını Antigravity'ye tek seferde yapıştır. Adım adım ilerlemesini, her adımdan sonra durup sana göstermesini iste.

---

## PROJE TANIMI

**TrustLine** — GSMA MENA Ignite Hackathon (Open Innovation teması) için geliştirilen, telekom ağ sinyallerini (CAMARA API'leri) kullanarak gerçek zamanlı güven skoru üreten bir AI ajan sistemi.

**Problem**: SIM swap dolandırıcılığı ve sahte hesaplar, MENA bölgesinde fintech, e-ticaret ve kiralama platformlarını tehdit ediyor. SMS OTP doğrulaması artık yetersiz.

**Çözüm akışı**:
1. Kullanıcı bir telefon numarası girer (signup, checkout, veya hassas bir işlem sırasında)
2. Sistem iki CAMARA sinyalini toplar:
   - **SIM Swap**: Bu numarada son N saat içinde SIM değişimi oldu mu?
   - **Number Verification**: Numara, o an bağlı olan cihazla gerçekten eşleşiyor mu? (OAuth consent akışıyla)
3. Bir **AI ajanı (LangGraph state machine)** bu iki sinyali + işlem bağlamını (action type, platform) alır, bir risk politikasına göre tartar, ve şu kararlardan birini üretir: **APPROVE / STEP-UP VERIFICATION / BLOCK**
4. Ajan, kararını insan-okunabilir bir gerekçeyle birlikte döner ("SIM son 2 saatte değişti + numara cihazla eşleşmiyor → BLOCK öneriyorum çünkü...")
5. Sınırda kalan (ambiguous) case'ler için ajan ekstra doğrulama ister, otomatik karar vermez

---

## TEKNİK MİMARİ (ZORUNLU — DEĞİŞTİRME)

### Backend
- **Dil/Framework**: Python + FastAPI
- **Agent orchestration**: **LangGraph** (state machine tarzı — düğümler: `collect_signals` → `evaluate_risk` → `decide` → `explain` → conditional edge: sınırda kalırsa `escalate`)
- **LLM**: **Google AI Studio — Gemini 2.5 Flash**, ücretsiz API key ile (`google-generativeai` Python paketi). API key `.env` dosyasından okunacak, hardcode edilmeyecek.
- **CAMARA API entegrasyonu**: Nokia Network-as-Code (NaC) sandbox, aşağıdaki gerçek şemalarla:

**SIM Swap Check** (basit API key ile, OAuth gerekmiyor):
```
POST https://network-as-code.p-eu.rapidapi.com/passthrough/camara/v1/sim-swap/... (tam path NaC dashboard'undan alınacak — placeholder bırak, koda TODO yaz)
Headers: X-RapidAPI-Key, X-RapidAPI-Host: network-as-code.nokia.rapidapi.com
Body: { "phoneNumber": "+99999991000", "maxAge": 240 }
Response: { "swapped": true }
```

**Number Verification** (3-legged OAuth 2.0 — TAM AKIŞI KUR):
1. Client credentials al: `GET /oauth2/v1/auth/clientcredentials`
2. Well-known config al: `GET /.well-known/openid-configuration` → `authorization_endpoint`, `token_endpoint`
3. Authorization code akışı: kullanıcıyı `{authorization_endpoint}?scope=dpv:FraudPreventionAndDetection number-verification:verify&response_type=code&client_id=...&redirect_uri=...&login_hint={phoneNumber}` adresine yönlendir
4. Callback'te gelen `code` ile token al: `POST {token_endpoint}` (client_id, client_secret, grant_type=authorization_code, code)
5. Access token ile asıl doğrulamayı yap: `POST /passthrough/camara/v1/number-verification/number-verification/v0/verify` — header `Authorization: Bearer {access_token}`, body `{"phoneNumber": "+99999991000"}`

Bu OAuth akışını FastAPI'de ayrı endpoint'ler olarak kur:
- `GET /auth/number-verification/start?phone_number=...` → kullanıcıyı authorization_endpoint'e yönlendirir
- `GET /auth/number-verification/callback` → code'u alır, token'a çevirir, sonucu session/geçici store'da tutar
- Geliştirme ortamında `redirect_uri` = `http://localhost:8000/auth/number-verification/callback` olacak (TODO comment: production'da gerçek domain'e çevrilecek)

**Simülatör test numaraları** (Nokia sandbox, gerçek SIM kullanma):
```
+99999991000, +99999991001, +99999990400, +99999990404, +99999990422, +99999990500, +99999990502, +99999990503, +99999990504
```

### AI Agent Katmanı (LangGraph) — Detaylı Tasarım

State machine düğümleri:
1. **`collect_signals`**: SIM Swap + Number Verification sonuçlarını paralel topla (Number Verification henüz OAuth tamamlanmadıysa "pending" durumu döner)
2. **`evaluate_risk`**: Gemini'ye şu bilgileri ver — sim_swap sonucu, number_verification sonucu, action_type (örn. "login", "checkout", "password_reset"), ve bir risk policy prompt'u. Gemini'den yapılandırılmış JSON döndürmesini iste: `{ "trust_score": 0-100, "reasoning": "...", "confidence": "high/medium/low" }`
3. **`decide`**: trust_score'a göre conditional routing:
   - score >= 70 → APPROVE
   - 40 <= score < 70 → STEP_UP_VERIFICATION (escalate)
   - score < 40 → BLOCK
4. **`explain`**: Kararı + gerekçeyi insan-okunabilir formatta son response'a paketle

Risk policy'yi ayrı bir `risk_policy.py` dosyasında, açıkça yorumlanmış kurallar olarak tut (örn: "SIM son 6 saatte değiştiyse ve numara doğrulanamadıysa, skor otomatik 30'un altına düşer" gibi). Bunu Gemini'ye system prompt olarak ver, ama nihai sayısal eşikleri (70/40) kod tarafında sabit tut — LLM'in objektif olmayan kararlar üretmesini engellemek için.

### Frontend
- **Next.js** (App Router), TailwindCSS
- Tek sayfa demo: telefon numarası input → "Check Trust" butonu → sonuç kartı (skor, karar, gerekçe, hangi sinyallerin kullanıldığı)
- Ajanın "düşünme sürecini" adım adım göster (collect → evaluate → decide) — jüri bunu görmeyi seviyor, rehberde özellikle belirtiliyor
- Basit, temiz tasarım — aşırı süslemeden kaçın, okunabilirlik öncelik

### Deployment (hepsi ücretsiz tier)
- Backend: **Render** (free web service)
- Frontend: **Vercel** (Hobby tier)
- Ortam değişkenleri (.env.example dosyası oluştur, gerçek key'leri asla commit etme):
  - `GEMINI_API_KEY`
  - `NOKIA_NAC_API_KEY`
  - `NOKIA_NAC_CLIENT_ID`, `NOKIA_NAC_CLIENT_SECRET`
  - `REDIRECT_URI`

---

## GELİŞTİRME SIRASI (bunu takip et, atlamadan)

1. Proje iskeletini kur (backend + frontend klasörleri, temel FastAPI app, temel Next.js app)
2. SIM Swap entegrasyonunu kur ve test et (basit, OAuth yok) — çalıştığını simülatör numaralarıyla doğrula
3. Number Verification OAuth akışını kur ve test et — bu en riskli parça, önce izole test et
4. LangGraph agent'ı kur, Gemini'ye bağla, mock sinyal verileriyle test et (gerçek API'lere bağlanmadan önce)
5. Agent'ı gerçek SIM Swap + Number Verification çıktılarına bağla
6. Frontend'i kur, backend'e bağla
7. Uçtan uca 3 senaryo test et: (a) temiz numara → APPROVE, (b) yakın zamanda SIM swap olmuş → BLOCK, (c) sınırda bir durum → STEP_UP_VERIFICATION
8. README.md yaz: kurulum adımları, .env nasıl doldurulur, nasıl çalıştırılır (hackathon submission formunda "Instructions to Run" zorunlu alan)

## KISITLAR (unutma)

- **Sıfır maliyet**: Sadece ücretsiz tier'lar kullanılacak, hiçbir yerde kredi kartı istenmeyecek
- **Orijinal kod**: Hiçbir yerden kopyala-yapıştır yapma, her şeyi bu proje için yaz
- **Agent katmanı sadece onaylı araçlarla**: LangGraph + Gemini dışında bir agent framework/LLM kullanma (kural gereği)
- Kod boyunca yorsatırlarıyla neyin ne işe yaradığını açıkla — bu bir öğrenci projesi, geliştirici (Kan) her satırı anlayabilmeli
- Karmaşık gösteriş için gereksiz soyutlama yapma; okunabilir, düz, anlaşılır kod tercih et
