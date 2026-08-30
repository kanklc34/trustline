# TrustLine — Antigravity Üçüncü Geliştirme Promptu (Derinlik + Tasarım)

Bu promptu Antigravity'ye tek seferde yapıştır. Önce mevcut kod tabanının tamamını (backend/ ve frontend/) oku ve anla. Bu SIFIRDAN bir proje DEĞİL — mevcut, çalışan, gerçek API'lere bağlı bir projeye derinlik ve profesyonel görsel kimlik katma görevi.

## ÖNCE OKU: Mevcut Durum (bunlara DOKUNMA, sadece anla)

- Backend: FastAPI + LangGraph + Gemini 3.5 Flash Lite
- 3 CAMARA sinyali gerçek Nokia NaC API'lerine bağlı ve test edildi: SIM Swap, Number Verification (tam 3-legged OAuth), Device Status
- `.env` dosyası `backend/` klasöründe — path varsayımını bozma
- Frontend: Next.js, ana sayfa + basit bir Partner Dashboard sayfası zaten var
- `risk_policy.py`, `agent.py`, `oauth.py`, `camara.py` içindeki ÇALIŞAN API entegrasyon mantığına DOKUNMA — bu kısımlar gerçek API'lerle test edildi, path'leri/header'ları/OAuth akışını değiştirme

## BÖLÜM A: Görsel Tasarım Dili (Frontend)

**ÖNEMLİ KISIT**: Gerçek GSMA veya Nokia logosunu kullanma, kopyalama veya "resmi GSMA/Nokia ürünüymüş" izlenimi veren hiçbir şey yapma (telif/marka hakkı ihlali riski). Bunun yerine GSMA/telekom sektörünün genel estetiğinden (kurumsal, güven veren, temiz) ilham alan ÖZGÜN bir tasarım dili kur.

Tasarım yönü:
- **Renk paleti**: Koyu lacivert/gece mavisi ana renk (telekom/güvenlik sektöründe güven çağrıştırır) + tek bir vurgu rengi (elektrik mavisi veya yeşil — "bağlantı/sinyal" hissi). Kırmızıyı ana renk yapma (GSMA'nın kendi rengiyle karışmasın).
- **Tipografi**: Sistem fontu yerine Inter veya benzer modern bir sans-serif (Google Fonts'tan ücretsiz, Next.js'e `next/font/google` ile kolayca eklenir)
- **Görsel motifler**: Sinyal çubukları, ağ/bağlantı düğümleri gibi soyut telekom motifleri (SVG ikon olarak, basit çizgiler — abartılı olmasın)
- **Genel his**: Bir fintech/güvenlik dashboard'u gibi dursun (Stripe, Plaid tarzı temiz kurumsal SaaS estetiği) — "AI'ın varsayılan mor-mavi gradient'i" gibi durmasın

Yapılacaklar:
1. `frontend/src/app/globals.css` içine yeni renk değişkenlerini (CSS custom properties) tanımla
2. Ana sayfa (`page.tsx`) ve dashboard sayfasını bu yeni palet ve tipografiyle güncelle
3. Basit bir logo/wordmark tasarla: sadece "TrustLine" yazısı + yanında basit bir SVG ikon (sinyal çubuğu + kalkan birleşimi gibi, ORİJİNAL, hiçbir marka logosuna benzemeyen)
4. Butonlar, kartlar, badge'ler (APPROVE yeşil, BLOCK kırmızı, STEP_UP sarı) tutarlı bir tasarım sistemiyle güncellensin

## BÖLÜM B: Audit Trail (Skorun Şeffaf Açıklaması)

Şu an `reasoning` tek bir paragraf. Bunu, jürinin "ajan neden bu kararı verdi" sorusuna adım adım cevap verebilecek bir yapıya çevir.

1. `agent.py`'deki Gemini prompt'unu güncelle — modelin artık düz `reasoning` yerine şu yapıda JSON dönmesini iste:
   ```json
   {
     "trust_score": 45,
     "signal_breakdown": [
       {"signal": "sim_swap", "impact": "negative", "points": -30, "note": "SIM son 10 gün içinde değişmiş"},
       {"signal": "number_verification", "impact": "neutral", "points": 0, "note": "Doğrulama henüz tamamlanmamış"},
       {"signal": "device_status", "impact": "positive", "points": 5, "note": "Cihaz aktif olarak bağlı (CONNECTED_DATA)"}
     ],
     "reasoning": "Genel özet cümlesi burada",
     "confidence": "medium"
   }
   ```
   NOT: `points` değerlerinin toplamı `trust_score`'u garanti etmek zorunda değil (LLM'den milimetrik matematik beklemiyoruz), bu alan görsel/açıklayıcı amaçlı. `decide()` fonksiyonundaki sabit eşikler (70/40) DEĞİŞMEDEN kalsın.
2. `TrustAgentState`'e `signal_breakdown: list` alanı ekle, `evaluate_risk` ve `explain` düğümlerinde bu veriyi taşı
3. Frontend'de sonuç kartına, mevcut "signals" kutularının ALTINA yeni bir "Neden bu karar?" bölümü ekle — her sinyali bir satır olarak, yanında pozitif/negatif/nötr bir ikon (▲▼–) ve kısa notuyla listele

## BÖLÜM C: Dashboard'u Güçlendirme

1. `backend/history.py`'deki `evaluation_history` yapısını koru, ama `/api/dashboard-summary` endpoint'ine ek bir alan ekle: `"estimated_fraud_prevented"` — basit bir varsayımsal hesaplama (ör. BLOCK kararı verilen her işlem için ortalama 150 USD varsayımsal fraud tutarı × BLOCK sayısı). Bunu kodda AÇIKÇA yorum olarak "varsayımsal/örnek hesaplama, gerçek veri değil" diye belirt.
2. Frontend dashboard sayfasına basit bir trend grafiği ekle (recharts kütüphanesi zaten mevcut ortamda kullanılabilir): son N kararın zaman içinde skor dağılımını gösteren basit bir çizgi/bar grafik
3. Üstteki 3 sayaç kartının yanına 4. bir kart ekle: "Tahmini Önlenen Zarar (örnek senaryo)" başlığıyla

## KESİN KURALLAR (ihlal etme)

1. **Gerçek GSMA/Nokia logosunu kullanma veya taklit etme.** Marka ihlali riski taşıyan hiçbir görsel eleman ekleme.
2. **API entegrasyon dosyalarının (camara.py, oauth.py) çalışan mantığını REFACTOR ETME.** Sadece agent.py'deki prompt ve state yapısına ekleme yap, mevcut API çağrılarını bozma.
3. **`decide()` fonksiyonundaki 70/40 eşiklerini değiştirme** — bu, LLM'in karar sınırlarını belirlememesi gerektiği için bilinçli bir tasarım kararıydı, böyle kalmalı.
4. **`.env` dosyasına dokunma veya yeni env variable isteme.**
5. **`.gitignore`'a dokunma.**
6. **Git commit/push YAPMA.** Sadece dosya oluştur/değiştir.
7. **Yeni bir üçüncü-parti servis ekleme** (veritabanı, yeni paket vb.) — recharts zaten mevcut, başka bir şey gerekmiyor.
8. **"estimated_fraud_prevented" gibi varsayımsal rakamları ASLA gerçek veri gibi sunma** — kodda ve UI'da "örnek senaryo / varsayımsal" ibaresi mutlaka görünür olsun, jüriyi yanıltıcı olmasın.
9. Telefon numaralarının maskeli kalması kuralı (mevcut history.py'de zaten var) korunmalı.
10. İşin sonunda değişen/eklenen dosyaların bir listesini ver (dosya adı + tek satır açıklama).

## TESLİM SONRASI DOĞRULAMA NOTU

Bölüm A ve C kod-only, dış API gerektirmiyor, test riski düşük. Bölüm B (audit trail), Gemini'nin yeni JSON formatını doğru dönüp dönmediğini test etmek gerekecek — bu kısmı bitirince Kan'ın gerçek bir `/api/evaluate` çağrısıyla `signal_breakdown` alanının dolu ve mantıklı geldiğini doğrulaması gerekiyor.
