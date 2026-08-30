# TrustLine — Antigravity Dördüncü Geliştirme Promptu (İngilizceleştirme)

Bu promptu Antigravity'ye tek seferde yapıştır. Bu bir çeviri/lokalizasyon görevi — MANTIK DEĞİŞİKLİĞİ YOK, sadece dil değişikliği. Bu, hatalara en açık türde bir görevdir çünkü metin değiştirirken kod mantığını yanlışlıkla bozmak kolaydır. Çok dikkatli ol.

## ÖNCE OKU: Mevcut Durum

TrustLine, GSMA MENA Ignite Hackathon için geliştirilen, gerçek Nokia NaC CAMARA API'lerine (SIM Swap, Number Verification OAuth, Device Status) bağlı, LangGraph + Gemini ile çalışan bir trust-scoring ajanı. Şu an kod, yorumlar, log mesajları ve UI metinleri TÜRKÇE. Bunların hepsini İNGİLİZCE'ye çevireceğiz.

## YAPILACAK: Her Şeyi İngilizceye Çevir

Kapsam (aşağıdaki dosyaların TÜMÜ):
- `backend/agent.py`
- `backend/camara.py`
- `backend/oauth.py`
- `backend/risk_policy.py`
- `backend/main.py`
- `backend/history.py`
- `backend/INTEGRATION.md`
- `frontend/src/app/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `README.md`

Çevrilecek olanlar:
- Tüm kod yorumları (`#`, `//`, docstring'ler)
- Tüm `print()` / log mesajları (`[MOCK]`, `[DEMO SENARYO]`, `[HATA]` gibi etiketler dahil — bunları `[MOCK]`, `[DEMO SCENARIO]`, `[ERROR]` yap)
- Tüm kullanıcıya görünen frontend metinleri (buton yazıları, başlıklar, hata mesajları, "Simülatör numaraları" listesi vb.)
- `risk_policy.py` içindeki RISK_POLICY_PROMPT'un TAMAMI (Gemini'ye giden bu prompt artık İngilizce olacak)
- README.md ve INTEGRATION.md'nin tamamı
- HTTPException mesajları (`detail="..."` içindeki Türkçe metinler)

Çevrilmeyecek / DOKUNULMAYACAK olanlar:
- Değişken adları, fonksiyon adları, dosya adları (zaten İngilizce, örn. `check_sim_swap`, `trust_score` — bunlar zaten doğru, değiştirme)
- API endpoint URL'leri, path'ler, header adları
- JSON key isimleri (örn. `"trust_score"`, `"signal_breakdown"`, `"swapped"`) — bunlar API sözleşmesinin parçası, backend ile frontend'in anlaştığı format, değiştirilirse entegrasyon bozulur
- `.env` dosyası ve `.env.example` (zaten İngilizce anahtar isimleri var)

## KRİTİK: Bu Sırada Bir Mantık Hatasını da Düzelt

`risk_policy.py`'yi İngilizceye çevirirken, aşağıdaki mantığı da KESİN olarak koru (bu Türkçe halinde zaten düzeltilmişti, çeviri sırasında kaybolmasın):

- Kural 1: Number Verification "False VEYA pending/null" (yani doğrulama tamamlanmamışsa) VE SIM Swap "True" ise, skor KESİNLİKLE 0-30 arasında olmalı. "Pending" durumu bu kuralda "False" ile birebir aynı ağırlıkta ele alınmalı, daha yumuşak bir ara kategori DEĞİL.
- Kural 3'ün bu kuralla çakışmaması için, Kural 3'te "SIM Swap: False" şartının açıkça (parantez içinde "bu şart mutlaka sağlanmalı, aksi halde Kural 1 geçerlidir" notuyla) belirtilmesi gerekiyor.

İngilizce prompt'u yazarken bu iki kuralın birbiriyle çelişmediğinden, "pending" durumunun hangi kuralın kapsamına gireceğinin belirsiz olmadığından emin ol.

## KESİN KURALLAR (ihlal etme)

1. **API entegrasyon mantığını (URL'ler, header'lar, payload yapıları, OAuth akışı, demo senaryo numaraları `+90000000001`/`+90000000002`) DEĞİŞTİRME.** Sadece bu dosyalardaki metinleri/yorumları/log mesajlarını çevir.
2. **JSON response yapılarındaki key isimlerini değiştirme** (`trust_score`, `decision`, `signal_breakdown`, `swapped`, `connectivityStatus` vb.) — bunlar İngilizce zaten ve backend-frontend arasındaki sözleşmenin parçası.
3. **`decide()` fonksiyonundaki 70/40 eşiklerini değiştirme.**
4. **Frontend'deki "Simülatör numaraları" listesini güncelle**: artık `+99999990404` ve `+99999990500` yerine gerçek çalışan demo senaryolarını göster:
   - `+99999991000` → "Clean number" (APPROVE)
   - `+90000000001` → "SIM Swap detected (demo scenario)" (BLOCK)
   - `+99999991000` + OAuth tamamlanmadan → "Pending verification" (STEP_UP_VERIFICATION)
5. **`.env`, `.gitignore`'a dokunma.**
6. **Git commit/push YAPMA.**
7. Çeviri sonrası HER dosyanın Python/TypeScript syntax olarak GEÇERLİ kaldığından emin ol (özellikle f-string'lerin, docstring'lerin çeviri sırasında bozulmadığını kontrol et).
8. İşin sonunda değişen dosyaların bir listesini ver.

## DOĞRULAMA NOTU

Bu iş bittiğinde Kan şunları test edecek: (1) backend'in hatasız başladığını, (2) `+90000000001` ile artık gerçekten BLOCK kararı (skor <30) geldiğini, (3) frontend'deki tüm metinlerin İngilizce ve tutarlı göründüğünü.
