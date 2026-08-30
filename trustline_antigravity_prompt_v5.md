# TrustLine — Antigravity Beşinci Geliştirme Promptu (Frontend Polish)

Bu promptu Antigravity'ye tek seferde yapıştır. Bu sefer İSKELET/MİMARİ DEĞİL — sadece frontend'in "ürün hissi" kalitesini yükseltme görevi. Backend'e HİÇ dokunma.

## BAĞLAM: Neden Bu Prompt Var

Mevcut frontend işlevsel olarak doğru (gerçek API'lere bağlı, doğru veri akıyor) ama "hackathon MVP'si" gibi hissediyor — statik, boşluklar rastgele, geçiş/animasyon yok, loading/error/empty state'ler ya hiç yok ya da kaba. Bu promptun amacı bunu "gerçek bir ürün gibi hissettiren" bir seviyeye çıkarmak. Renk paleti ve font zaten önceki bir promptta düzeltildi — ONLARA DOKUNMA, mevcut `tl-` renk sistemini ve Inter fontunu koru.

## ÖNCE OKU

`frontend/src/app/page.tsx` ve `frontend/src/app/dashboard/page.tsx` dosyalarının tamamını oku. `frontend/src/app/globals.css` ve `frontend/tailwind.config.ts` içindeki mevcut `tl-` renk tokenlerini not al, yeni eklemeler bu tokenlerle tutarlı olsun.

## YAPILACAKLAR (hepsi frontend, backend'e dokunma)

### 1. Loading, Error, Empty States
- "Check Trust" butonuna basıldığında şu an muhtemelen ya hiç loading göstergesi yok ya da düz metin var. Bunun yerine: buton disabled olsun, içinde dönen bir spinner + "Analyzing..." metni olsun.
- Backend'den hata gelirse (network hatası, 500 vb.), kullanıcı dostu bir hata kartı göster — kırmızı/turuncu tonlu, "Something went wrong while checking this number. Try again." gibi net bir mesaj. Şu an muhtemelen ham JSON hatası veya hiçbir şey görünmüyor, bunu düzelt.
- Dashboard'da hiç kayıt yoksa (`evaluation_history` boşsa), boş bir tablo yerine "No checks yet — run your first trust check to see it here." gibi bir empty state göster, ideal olarak küçük bir ikon/illüstrasyonla.

### 2. Geçişler ve Mikro-Etkileşimler
- Sonuç kartı göründüğünde ani bir "pop" yerine yumuşak bir fade-in + slight slide-up animasyonu olsun (CSS transition veya Tailwind'in `animate-` utility'leri ile, framer-motion gibi yeni bir paket EKLEME).
- Butonlar hover'da hafif bir renk/gölge değişimi göstersin (`transition-colors`, `hover:` state'leri) — şu an muhtemelen statik.
- Agent'ın adım adım ilerleyişini gösteren progress metinleri (📡 🧠 ⚖️ ✅ emoji'li satırlar) şu an muhtemelen hepsi bir anda beliriyor. Bunun yerine her satırın sırayla, küçük bir gecikmeyle (150-250ms aralıklarla) belirmesini sağla — gerçek bir "işlem yapılıyor" hissi versin.
- Sonuç kartındaki decision badge'i (APPROVE/BLOCK/STEP_UP) render olduğunda hafif bir scale-in animasyonu ile vurgulansın.

### 3. Spacing ve Görsel Ritim
- Sayfadaki tüm bölümler arası boşlukları tutarlı bir ölçeğe (ör. Tailwind'in 4/6/8/12/16 spacing birimleri) oturt — şu an muhtemelen rastgele/tutarsız boşluklar var.
- Kartların içindeki padding'i tutarlı yap (tüm kartlarda aynı iç boşluk).
- Ana sayfadaki form (telefon numarası input + action type dropdown + buton) dikey olarak daha "nefes alan" bir düzene sahip olsun — şu an muhtemelen sıkışık duruyor.

### 4. Form ve Input Kalitesi
- Telefon numarası input'una focus olduğunda görünür bir focus ring (accessibility için önemli, `focus:ring-2 focus:ring-[tl-accent-rengi]` gibi) ekle.
- Geçersiz bir numara formatı girilirse (boş, çok kısa vb.) backend'e hiç gitmeden, anlık bir client-side uyarı göster ("Enter a valid phone number").
- Dropdown (action type seçimi) ve input'un görsel stilleri birbiriyle tutarlı olsun (aynı border-radius, aynı border rengi, aynı yükseklik).

### 5. Dashboard'a Görsel Derinlik
- Dashboard'daki sayaç kartları (Approved/Blocked/Step-up/Fraud Prevented) şu an muhtemelen düz duruyor — her birine ilgili bir küçük ikon ekle (lucide-react zaten kullanılabilir bir kütüphane, örn. `CheckCircle`, `ShieldAlert`, `AlertTriangle`, `DollarSign`).
- Tablodaki decision değerleri (APPROVE/BLOCK/STEP_UP) renkli badge'ler olarak gösterilsin (yeşil/kırmızı/sarı arka planlı küçük pill'ler), düz metin olarak değil.
- Grafik (recharts) üzerinde hover edildiğinde tooltip'in tasarımı sayfanın genel tasarım diliyle (renkler, font) tutarlı olsun — recharts'ın varsayılan beyaz/gri tooltip'i değil.

### 6. Genel Ürün Hissi
- Sayfa başlığının yanına (TrustLine + tagline) küçük bir "canlı" göstergesi eklenebilir — örn. yeşil bir nokta + "Connected to Nokia Network-as-Code" gibi bir mini durum etiketi (gerçek bağlantı durumunu yansıtması gerekmiyor, sadece görsel güven sinyali; ama yanıltıcı olmasın, "Live sandbox environment" gibi dürüst bir ifade kullan).
- "Start OAuth Verification" linkinin göründüğü yer şu an muhtemelen düz bir link gibi duruyor — bunu bir buton gibi tasarla (arka plan rengi, hover efekti, belki küçük bir external-link ikonu).

## KESİN KURALLAR (ihlal etme)

1. **Backend dosyalarına (backend/*) HİÇ dokunma.** Bu tamamen frontend işi.
2. **Mevcut `tl-` renk tokenlerini ve Inter fontunu koru** — yeni renk sistemi kurma, var olanı kullan.
3. **Yeni bir animasyon kütüphanesi (framer-motion, gsap vb.) EKLEME** — CSS transitions ve Tailwind'in yerleşik animasyon yardımcıları yeterli.
4. **API çağrılarının yapısını (fetch URL'leri, request/response formatları) DEĞİŞTİRME.**
5. **`.env`, `.gitignore`'a dokunma.**
6. **Git commit/push YAPMA.**
7. Mobil ekran genişliğinde de (responsive) düzenin bozulmadığından emin ol — Tailwind'in `sm:`/`md:` breakpoint'lerini kullan.
8. Klavye ile gezinildiğinde (Tab tuşu) interaktif elemanların (buton, input, link) görünür bir focus göstergesi olduğundan emin ol.
9. İşin sonunda değişen dosyaların bir listesini ver.

## DOĞRULAMA NOTU

Bu iş bittiğinde Kan tarayıcıda ana sayfayı ve dashboard'u gözden geçirecek, özellikle: loading state'in göründüğünü, hata durumunda kullanıcı dostu bir mesaj çıktığını, ve genel olarak sayfanın "bitmemiş" değil "cilalanmış" hissettiğini kontrol edecek.
