# Chatbot Sistemi Kurulum Rehberi

Bu doküman, Gemini Chatbot sisteminin kurulumu ve yapılandırması için gerekli adımları içerir.

## Mimari

Sistem 3 katmanlı bir mimariye sahiptir:

1. **API Gateway** (Next.js Route Handler) - `app/api/chat/route.ts`
   - Frontend'den gelen istekleri alır
   - Firebase Function'a yönlendirir
   - Ücretsiz

2. **Serverless Function** (Firebase Functions) - `functions/src/index.ts`
   - Prompt hazırlar
   - Google Gemini API'ye istek atar
   - Yanıtı işler ve döndürür
   - Spark Plan ile ücretsiz

3. **LLM** (Google Gemini API)
   - Kullanıcı mesajlarını analiz eder
   - Yanıt üretir
   - Ücretsiz katman

## Kurulum Adımları

### 1. Firebase Functions Bağımlılıklarını Yükle

```bash
cd functions
npm install
```

### 2. Firebase Functions'ı Build Et

```bash
cd functions
npm run build
```

### 3. Google Gemini API Key'i Al

1. [Google AI Studio](https://makersuite.google.com/app/apikey) adresine gidin
2. Yeni bir API key oluşturun
3. API key'i kopyalayın

### 4. Firebase Functions'a API Key'i Ekle

Firebase CLI ile API key'i yapılandırın:

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

Veya `.env` dosyası kullanıyorsanız, `functions/.env` dosyası oluşturun:

```env
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY
```

### 5. Firebase Functions'ı Deploy Et

```bash
firebase deploy --only functions
```

Deploy işlemi tamamlandıktan sonra, Firebase Console'dan function URL'ini kopyalayın. Format şu şekilde olacaktır:

```
https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/geminiChat
```

### 6. Next.js Environment Variable'ı Ayarla

`.env.local` dosyanıza şu satırı ekleyin:

```env
NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL=https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/geminiChat
```

### 7. Next.js Uygulamasını Çalıştır

```bash
npm run dev
```

## Kullanım

### Chat Sayfası

Chat sayfasına `/chat` route'undan erişebilirsiniz. Navigation menüsünden "Chat" linkine tıklayarak da ulaşabilirsiniz.

### Floating Chat Button

`ChatUI` bileşeni, sayfanın sağ alt köşesinde floating bir buton olarak görünür. Bu butona tıklayarak chat arayüzünü açabilirsiniz.

## Test Etme

1. Next.js uygulamasını çalıştırın: `npm run dev`
2. Tarayıcıda `http://localhost:3000/chat` adresine gidin
3. Bir mesaj yazın ve gönderin
4. Gemini API'den yanıt geldiğini kontrol edin

## Sorun Giderme

### Firebase Function'a Erişilemiyor

- Firebase Functions URL'inin doğru olduğundan emin olun
- `.env.local` dosyasında `NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL` değişkeninin tanımlı olduğunu kontrol edin
- Firebase Console'da function'ın deploy edildiğini doğrulayın

### API Key Hatası

- Firebase Functions config'de API key'in doğru ayarlandığını kontrol edin
- `firebase functions:config:get` komutu ile mevcut config'i görebilirsiniz

### CORS Hatası

- Firebase Function'da CORS middleware'inin doğru yapılandırıldığını kontrol edin
- `cors` paketinin yüklü olduğundan emin olun

## Dosya Yapısı

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API Gateway
│   └── chat/
│       └── page.tsx               # Chat sayfası
├── components/
│   └── ChatUI.tsx                 # Floating chat UI bileşeni
├── functions/
│   ├── src/
│   │   └── index.ts              # Firebase Function (Gemini entegrasyonu)
│   ├── package.json
│   └── tsconfig.json
└── firebase.json                  # Firebase yapılandırması
```

## Notlar

- Firebase Functions Spark Plan'da ücretsizdir
- Google Gemini API'nin ücretsiz katmanı yeterli olmalıdır
- Production'da rate limiting eklemeyi düşünün
- Error handling ve logging'i iyileştirmeyi düşünün

