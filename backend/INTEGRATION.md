# TrustLine Entegrasyon Rehberi

## Nasıl Entegre Edilir

Bir fintech veya e-ticaret platformu olarak, kullanıcı işlemlerinde dolandırıcılık riskini ölçmek için TrustLine API'sini aşağıdaki gibi çağırabilirsiniz. Sadece telefon numarasını ve işlem türünü (login, checkout, password_reset) göndermeniz yeterlidir.

```bash
curl -X POST "http://localhost:8000/api/evaluate" \
     -H "Content-Type: application/json" \
     -d '{
           "phone_number": "+99999991000",
           "action_type": "checkout"
         }'
```

Dönen yanıt içerisindeki `trust_score` (0-100) veya doğrudan kural tabanlı `decision` (APPROVE, STEP_UP_VERIFICATION, BLOCK) değerine göre kullanıcı akışınızı yönlendirebilirsiniz.

## Fiyatlandırma Modeli (Öneri)

*Not: Aşağıdaki fiyatlandırma modeli kavramsal bir öneridir ve hackathon konsepti için hazırlanmıştır.*

| Plan | Kapsam | Ücretlendirme |
| --- | --- | --- |
| **Free** | Ayda 100 API çağrısı (Geliştirme ve Test) | Ücretsiz |
| **Growth** | Sınırsız API çağrısı, standart destek | İşlem başına $0.05 |
| **Enterprise** | Özel SLA, dedike destek, özel risk kuralları | İletişime geçin |
