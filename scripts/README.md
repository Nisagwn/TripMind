# TripMind - Fetch and Save Places Scripts

Bu klasör, Google Places API kullanarak Antalya'daki mekanları çekip Firestore ve Redis'e kaydetmek için gerekli scriptleri içerir.

## 📋 Gereksinimler

- Node.js (v18 veya üzeri)
- Firebase projesi yapılandırılmış olmalı
- Redis sunucusu çalışır durumda olmalı
- `.env.local` dosyasında Google Maps API anahtarı tanımlı olmalı

## 🔑 Ortam Değişkenleri

`.env.local` dosyanızda şu değişkenler tanımlı olmalı:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 🚀 Kullanım

### 1. Antalya'dan 100+ Mekan Çekme (Pagination ile)

Bu komut, Antalya şehrinden en az 100 mekan çeker:

```bash
npx tsx scripts/fetchAndSavePlaces.ts
```

**Özellikler:**
- ✅ Otomatik pagination (sayfalama)
- ✅ Her sayfada 20 mekan
- ✅ Maksimum 6 sayfa (120 mekan)
- ✅ Duplicate (tekrar) kontrolü
- ✅ 30km yarıçapında arama
- ✅ Otomatik 2 saniye bekleme (API kuralı)

**Çıktı Örneği:**
```
🚀 Antalya mekan verileri çekme işlemi başlatıldı...

🌍 Antalya'dan en az 100 mekan çekiliyor...
📄 Sayfa 1 çekiliyor...
  ✅ 20 mekan eklendi (Toplam: 20)
⏳ Sonraki sayfa için 2 saniye bekleniyor...
📄 Sayfa 2 çekiliyor...
  ✅ 20 mekan eklendi (Toplam: 40)
...

✅ Antalya'dan toplam 115 mekan çekildi! (6 sayfa)

📊 Detaylar:
  - Ortalama puan: 4.32
  - Puan alan mekan: 98
  - Fotoğraflı mekan: 112

💾 Firestore'a kaydediliyor...
🧠 Redis cache güncelleniyor...

✅ İşlem tamamlandı!
📍 115 mekan başarıyla Firestore ve Redis'e kaydedildi!
```

### 2. Kategorilere Göre Mekan Çekme (Opsiyonel)

Script içinde `fetchByCategories()` fonksiyonunu kullanmak için:

1. `scripts/fetchAndSavePlaces.ts` dosyasını açın
2. En alttaki satırı yorum satırı yapın:
   ```typescript
   // main().catch((err) => console.error("❌ Hata oluştu:", err));
   ```
3. Altındaki satırın yorum işaretini kaldırın:
   ```typescript
   fetchByCategories().catch((err) => console.error("❌ Hata oluştu:", err));
   ```
4. Scripti çalıştırın:
   ```bash
   npx tsx scripts/fetchAndSavePlaces.ts
   ```

**Desteklenen Kategoriler:**
- Restoran
- Kafe
- Müze
- Park
- Sahil
- Otel

Her kategoriden ~20 mekan çekilerek toplam 100+ benzersiz mekan elde edilir.

## 📚 Diğer Scriptler

### `deleteAllPlaces.ts`
Firestore'daki tüm mekanları siler:
```bash
npx tsx scripts/deleteAllPlaces.ts
```

### `deleteDuplicates.ts`
Firestore'daki tekrar eden mekanları siler:
```bash
npx tsx scripts/deleteDuplicates.ts
```

## 🔧 Teknik Detaylar

### Pagination Nasıl Çalışır?

1. İlk istek 20 mekan döner + `nextPageToken`
2. `nextPageToken` varsa, 2 saniye bekle
3. Token ile bir sonraki sayfayı çek
4. 100 mekana ulaşana kadar tekrarla (max 6 sayfa)

### Duplicate Kontrolü

Her mekan eklenirken şu kriterlere göre kontrol edilir:
```typescript
const exists = allPlaces.some(
  (p) =>
    p.displayName?.text === place.displayName?.text &&
    p.formattedAddress === place.formattedAddress
);
```

Aynı isim + adres varsa mekan eklenmez.

### Konum Sınırlaması

Antalya merkezi:
- Enlem: 36.88414
- Boylam: 30.70563
- Yarıçap: 30,000m (30km)

## 🎯 Google Places API Field Mask

Script şu alanları çeker:
- `displayName` - Mekan adı
- `formattedAddress` - Adres
- `location` - Koordinatlar (lat/lng)
- `photos` - Fotoğraflar
- `rating` - Puan
- `userRatingCount` - Değerlendirme sayısı
- `types` - Mekan tipleri
- `internationalPhoneNumber` - Telefon
- `websiteUri` - Web sitesi
- `googleMapsUri` - Google Maps linki

## ⚠️ Önemli Notlar

1. **API Limits:** Google Places API ücretsiz kotası sınırlıdır. Çok fazla istek yapmayın.
2. **Rate Limiting:** Sayfalar arası 2 saniye, kategoriler arası 3 saniye bekleme zorunlu.
3. **Duplicate Check:** Her çalıştırmada duplicate kontrolü otomatik yapılır.
4. **Error Handling:** Hata durumunda işlem durur, o ana kadar çekilen mekanlar kaydedilir.

## 🐛 Hata Giderme

### "Google API anahtarı bulunamadı!"
- `.env.local` dosyasını kontrol edin
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` tanımlı mı?

### "Places API isteği başarısız"
- API key geçerli mi?
- Kota dolmuş olabilir (Google Console'dan kontrol edin)
- Internet bağlantınızı kontrol edin

### "Hiç mekan çekilemedi!"
- API yanıt vermiyor olabilir
- Konum parametrelerini kontrol edin
- API key yetkilerini kontrol edin

## 📊 Performans

- **Ortalama Süre:** 100 mekan için ~15-20 dakika
- **İstek Sayısı:** 5-6 istek
- **Veri Boyutu:** ~2-3 MB (100 mekan için)

## 🔗 İlgili Dosyalar

- `lib/googlePlaces.ts` - Google Places API fonksiyonları
- `lib/savePlacesToFirestore.ts` - Firestore kaydetme logic
- `lib/redis.ts` - Redis cache yapılandırması
- `lib/firebase.ts` - Firebase yapılandırması

## 💡 İpuçları

1. İlk çalıştırmada az mekan çekerek test edin (minResults: 20)
2. Kategorilere göre çekerseniz daha çeşitli mekan elde edersiniz
3. Redis cache'i kontrol etmek için: `redis-cli GET places_cache`
4. Firestore Console'dan mekanları kontrol edin

## 📝 Lisans

Bu script TripMind projesi kapsamında geliştirilmiştir.

