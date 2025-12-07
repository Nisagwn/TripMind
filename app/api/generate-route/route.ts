import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { collection, query, limit as fsLimit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Initialize OpenAI client for Groq API
const openai = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || ''
})

interface RoutePreferences {
    activities: string[]
    province: string
    district: string
    days: number
    withAccommodation: boolean
    budget: 'Ucuz' | 'Orta' | 'Pahalı'
    latitude?: number
    longitude?: number
}

// Map activities to Firestore categories
const ACTIVITY_CATEGORY_MAP: Record<string, string[]> = {
    restaurant: ['fast_food_restaurant', 'pizza_restaurant', 'restaurant', 'turkish_restaurant', 'seafood_restaurant', 'steak_house', 'fine_dining_restaurant', 'food'],
    cafe: ['cafe', 'coffee_shop', 'bakery'],
    entertainment: ['shopping_mall', 'zoo', 'aquarium', 'bowling_alley', 'movie_theater', 'amusement_park', 'night_club', 'water_park', 'avm', 'park'],
    culture: ['historical_place', 'monument', 'museum', 'art_gallery', 'tourist_attraction', 'performing_arts_theater', 'opera_house', 'kultur', 'mosque', 'place_of_worship'],
    beach: ['beach'],
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

export async function POST(request: NextRequest) {
    try {
        const preferences: RoutePreferences = await request.json()

        // 1. Fetch matching places from Firestore
        const places = await fetchPlacesFromFirestore(preferences)

        if (places.length === 0) {
            return NextResponse.json({
                error: 'Bu kriterlere uygun mekan bulunamadı.',
                route: null
            }, { status: 404 })
        }

        // 2. Generate route with Gemini/Groq
        const route = await generateRouteWithGemini(places, preferences)

        return NextResponse.json({ route })
    } catch (error) {
        console.error('Route generation error:', error)
        return NextResponse.json({
            error: 'Rota oluşturulurken hata oluştu.',
            route: null
        }, { status: 500 })
    }
}

async function fetchPlacesFromFirestore(preferences: RoutePreferences) {
    const placesRef = collection(db, 'places')

    // Get all relevant categories
    const categories: string[] = []
    for (const activity of preferences.activities) {
        const cats = ACTIVITY_CATEGORY_MAP[activity] || []
        categories.push(...cats)
    }

    // Add accommodation if needed
    if (preferences.withAccommodation) {
        categories.push('lodging', 'hotel', 'resort_hotel', 'hostel', 'guest_house', 'bed_and_breakfast', 'konaklama', 'otel')
    }

    // Fetch places - getting more data to allow AI to filter better
    // Increase limit to 5000 to ensure we get all places for in-memory filtering
    const snapshot = await getDocs(query(placesRef, fsLimit(5000)))

    const places: any[] = []

    // Debug stats
    let totalScanned = 0;
    let categoryMatchCount = 0;
    let locationMatchCount = 0;
    let distanceMatchCount = 0;
    let finalAddedCount = 0;

    snapshot.docs.forEach(doc => {
        totalScanned++;
        const data = doc.data()

        // Check category match
        const placeCategory = data.category?.toLowerCase() || ''
        const categoryMatch = categories.some(cat =>
            placeCategory.includes(cat.toLowerCase()) || cat.toLowerCase().includes(placeCategory)
        )
        if (categoryMatch) categoryMatchCount++;

        // Check budget match (Relaxed slightly for hotels)
        const isHotel = ['hotel', 'otel', 'lodging'].some(t => placeCategory.includes(t))
        const budgetMatch = data.price === preferences.budget || !data.price || isHotel

        // Check location
        let locationMatch = false;
        let matchMethod = 'none';

        const placeProvince = (data.province || '').toLowerCase();
        const placeDistrict = (data.district || '').toLowerCase();
        const reqProvince = preferences.province.toLowerCase();
        const reqDistrict = preferences.district.toLowerCase();

        // 1. Priority: Explicit Province/District Match (Most Accurate)
        if (placeProvince && placeDistrict) {
            // data.province veya data.district varsa, kesinlikle bunlara uymalı
            locationMatch = placeProvince.includes(reqProvince) && placeDistrict.includes(reqDistrict);
            if (locationMatch) matchMethod = 'strict_admin';
        }
        // 2. Fallback: Distance based filtering (if lat/lng provided AND admin data missing)
        else if (preferences.latitude && preferences.longitude && data.latitude && data.longitude) {
            const dist = calculateHaversineDistance(
                preferences.latitude,
                preferences.longitude,
                data.latitude,
                data.longitude
            );

            // Eğer mesafe 100km'den azsa kabul et
            if (dist <= 100) {
                locationMatch = true;
                distanceMatchCount++;
                matchMethod = 'distance';
            }
        }
        // 3. Fallback: Address Text based filtering (Least accurate)
        else {
            const address = (data.address || '').toLowerCase()
            locationMatch = address.includes(reqDistrict) || address.includes(reqProvince)
            if (locationMatch) {
                locationMatchCount++;
                matchMethod = 'address_text';
            }
        }

        if ((categoryMatch && locationMatch) && budgetMatch) {
            places.push({
                id: doc.id,
                name: data.name,
                category: data.category,
                price: data.price,
                rating: data.rating,
                address: data.address,
                userRatingsTotal: data.userRatingsTotal,
                latitude: data.latitude,
                longitude: data.longitude,
                imageUrl: data.imageUrl,
                // Add debug info if needed, or keeping schema clean
            });
            finalAddedCount++;
            // console.log(`[Added] ${data.name} via ${matchMethod}`);
        }
    })

    console.log(`--- FETCH STATS ---`);
    console.log(`Total Docs Scanned: ${totalScanned}`);
    console.log(`Category Matched: ${categoryMatchCount}`);
    console.log(`Location Matched (Text/Dist): ${Math.max(locationMatchCount, distanceMatchCount)}`);
    console.log(`Final Candidates: ${finalAddedCount}`);
    console.log(`-------------------`);

    // Sort by rating * sqrt(reviewCount) to prioritize popular high-rated places
    places.sort((a, b) => {
        const scoreA = (a.rating || 0) * Math.sqrt(a.userRatingsTotal || 0)
        const scoreB = (b.rating || 0) * Math.sqrt(b.userRatingsTotal || 0)
        return scoreB - scoreA
    })

    return places.slice(0, 60) // Send top 60 places to AI
}

async function generateRouteWithGemini(places: any[], preferences: RoutePreferences) {
    // 1. AYRIŞTIRMA: Otelleri ve Aktiviteleri Ayır
    // AI'ya sadece aktiviteleri göndereceğiz, oteli biz seçeceğiz.
    const hotelKeywords = ['hotel', 'otel', 'lodging', 'hostel', 'resort', 'konaklama', 'pansiyon'];

    const hotelPlaces = places.filter(p => {
        const cat = (p.category || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return hotelKeywords.some(k => cat.includes(k) || name.includes(k));
    });

    const activityPlaces = places.filter(p => !hotelPlaces.includes(p));

    // Türkçe kategori isimlerini hazırla
    const activitiesText = preferences.activities.map(a => {
        const map: Record<string, string> = {
            restaurant: 'Yeme-İçme (Restoran)',
            cafe: 'Mola (Cafe)',
            entertainment: 'Eğlence/Aktivite',
            culture: 'Kültür ve Tarih',
            beach: 'Plaj/Deniz'
        }
        return map[a] || a
    }).join(', ')

    // Mekan listesini AI'ın anlayacağı formatta hazırla (Sadece aktiviteler)
    const placesText = activityPlaces.map(p =>
        `- ${p.name} || ID: ${p.id} || Kat: ${p.category} || Puan: ${p.rating} || Konum: ${p.latitude},${p.longitude}`
    ).join('\n')

    // Prompt - OTELDEN ARINDIRILMIŞ VERSİYON
    const prompt = `Sen dünyanın en iyi seyahat algoritmalarından birisin. Görevin, verilen veri setini kullanarak kusursuz, mantıklı ve kurallara %100 uyan bir JSON rotası oluşturmak.

PROJE DETAYLARI:
- Hedef: ${preferences.days} günlük, ${preferences.district}/${preferences.province} gezisi.
- Kullanıcı İlgi Alanları: ${activitiesText}
- ÖNEMLİ: Konaklama/Otel seçimi senin görevin DEĞİL. Sadece gezilecek yerleri planla.

MEKAN VERİ HAVUZU (Sadece buradakileri kullan):
${placesText}

---

### KESİN VE AŞILAMAZ KURALLAR (DİKKATLE UYGULA):

1. **GÜNLÜK AKIŞ VE ZAMANLAMA:**
   - Her gün için **SADECE 3** ana aktivite planla.
   - Bu aktiviteler mantıksal bir sırayla olmalıdır:
     - 1. Aktivite (Sabah/Öğle başı): Saat 10:00 gibi.
     - 2. Aktivite (Öğle/İkindi): Saat 14:00 gibi.
     - 3. Aktivite (Akşam): Saat 19:00 gibi.
   - "Time" alanlarına "Sabah", "Öğle" yazma; mutlaka "10:00", "14:00", "19:00" formatında saat ver.

2. **KATEGORİ DAĞILIMI VE ÇEŞİTLİLİK:**
   - Kullanıcının seçtiği kategorileri (${activitiesText}) **haftanın HER GÜNÜNE** yaymalısın.
   - **Yasak:** Bir gün içinde aynı kategoriden 2 mekan olamaz. (Örn: Sabah Cafe, Öğlen Cafe OLMAZ. Sabah Restoran, Akşam Restoran OLMAZ).
   - Kombinasyon Örneği: Sabah: Kültür -> Öğle: Restoran -> Akşam: Eğlence.

3. **MEKAN SEÇİMİ:**
   - Mekan isimlerini, ID'lerini listeden birebir kopyala.
   - Listede otel/konaklama geçen yerleri ASLA ve ASLA gezi rotasına ekleme.
   - Aynı mekanı farklı günlerde tekrar kullanma.

4. **JSON FORMATI:**
   - Sadece saf JSON döndür. Markdown, açıklama, \`\`\`json\`\`\` etiketi kullanma.
   - Açıklamalar (description) kısa, ilgi çekici ve Türkçe olsun.

BEKLENEN JSON ŞEMASI:
{
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "time": "10:00", 
          "place": "Mekan Adı Tam Hali", 
          "place_id": "Mekan ID", 
          "description": "Neden buraya gidildiğiyle ilgili 1 cümle.", 
          "category": "Mekanın kategorisi"
        },
        ...
      ]
    },
    ... (${preferences.days} gün boyunca devam et)
  ]
}`

    try {
        const completion = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'Sen JSON formatında çıktı veren, hatasız bir seyahat asistanısın.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 4000,
            response_format: { type: "json_object" }
        })

        let text = completion.choices[0]?.message?.content || ''
        const route = JSON.parse(text)

        // 2. MERKEZ HESAPLAMA VE OTEL SEÇİMİ
        let totalLat = 0;
        let totalLng = 0;
        let pointCount = 0;

        // Enrich route and collect coordinates
        if (route.days) {
            route.days.forEach((day: any) => {
                if (day.activities) {
                    // 1. Önce tüm aktiviteleri zenginleştir ve Merkezi Hesapla
                    day.activities.forEach((activity: any) => {
                        const placeDetails = places.find(p => p.id === activity.place_id) || places.find(p => p.name === activity.place)

                        if (placeDetails) {
                            activity.lat = placeDetails.latitude
                            activity.lng = placeDetails.longitude
                            activity.imageUrl = placeDetails.imageUrl
                            // ID eksikse tamamla
                            if (!activity.place_id) activity.place_id = placeDetails.id

                            // Add to center calculation
                            if (placeDetails.latitude && placeDetails.longitude) {
                                totalLat += placeDetails.latitude;
                                totalLng += placeDetails.longitude;
                                pointCount++;
                            }
                        }
                    })

                    // 2. TSP OPTİMİZASYONU (Nearest Neighbor)
                    // Aktivite sırasını coğrafi olarak en mantıklı hale getir
                    if (day.activities.length > 2) {
                        const original = [...day.activities];
                        const ordered = [original[0]]; // İlk aktivite sabit (Sabah)
                        const remaining = original.slice(1);

                        let current = original[0];

                        while (remaining.length > 0) {
                            let nearestIdx = -1;
                            let minDist = Infinity;

                            for (let i = 0; i < remaining.length; i++) {
                                const target = remaining[i];
                                if (current.lat && current.lng && target.lat && target.lng) {
                                    const d = calculateHaversineDistance(current.lat, current.lng, target.lat, target.lng);
                                    if (d < minDist) {
                                        minDist = d;
                                        nearestIdx = i;
                                    }
                                }
                            }

                            if (nearestIdx !== -1) {
                                const nextPlace = remaining[nearestIdx];
                                ordered.push(nextPlace);
                                remaining.splice(nearestIdx, 1);
                                current = nextPlace;
                            } else {
                                // Koordinat sorunu varsa kalanı olduğu gibi ekle
                                ordered.push(...remaining);
                                break;
                            }
                        }

                        // Saatleri düzelt (Sıra değiştiği için saatler de güncellenmeli)
                        const times = ["10:00", "14:00", "19:00", "21:00"];
                        ordered.forEach((act, idx) => {
                            if (idx < times.length) act.time = times[idx];
                        });

                        day.activities = ordered;
                    }
                }
            })
        }

        let selectedHotel: any = null;

        // Eğer konaklama isteniyorsa ve elimizde otel varsa
        if (preferences.withAccommodation && hotelPlaces.length > 0 && pointCount > 0) {
            const centerLat = totalLat / pointCount;
            const centerLng = totalLng / pointCount;

            console.log(`📍 [Hotel Selection] Activity Center: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)} (based on ${pointCount} points)`);

            // Otelleri puanla: (Uzaklık * X) - (Puan * Y) -> En düşük skor kazanır
            // Amacımız: Merkeze yakın VE Puanı yüksek
            const scoredHotels = hotelPlaces.map(h => {
                const dist = calculateHaversineDistance(centerLat, centerLng, h.latitude, h.longitude);
                // Skor formülü: Her 1km uzaklık 1 ceza puanı. Her 1 yıldız puanı 2 ödül puanı.
                // Düşük skor daha iyi olsun istiyoruz ama puan yüksek olmalı.
                // O yüzden: Distance - (Rating * Weight)
                const score = dist - ((h.rating || 0) * 0.5);
                return { hotel: h, score, dist };
            });

            // Skoru en düşük olanı seç (En iyi)
            scoredHotels.sort((a, b) => a.score - b.score);

            console.log(`🏨 [Hotel Selection] Evaluated ${scoredHotels.length} hotels.`);
            console.log(`🏆 [Hotel Selection] Top 3 Candidates:`);
            scoredHotels.slice(0, 3).forEach((h, i) => {
                console.log(`   ${i + 1}. ${h.hotel.name} (Score: ${h.score.toFixed(2)} | Dist: ${h.dist.toFixed(2)}km | Rating: ${h.hotel.rating})`);
            });

            selectedHotel = scoredHotels[0].hotel;
            console.log(`✅ [Hotel Selection] Selected: ${selectedHotel.name}`);

            // Route objesine ekle (Client tarafı kullanabilsin diye)
            route.day_1_hotel = selectedHotel.name;
        }

        // 3. OTELİ GÜNLÜK PLANLARA EKLE
        if (route.days && selectedHotel) {
            route.days.forEach((day: any) => {
                if (day.activities) {
                    day.activities.push({
                        time: "23:00",
                        place: selectedHotel.name,
                        place_id: selectedHotel.id,
                        description: "Günün yorgunluğunu atmak için rotanızın merkezindeki en uygun otele dönüş.",
                        category: "accommodation",
                        lat: selectedHotel.latitude,
                        lng: selectedHotel.longitude,
                        imageUrl: selectedHotel.imageUrl,
                        isHotelReturn: true
                    });
                }
            });
        }

        return route
    } catch (error) {
        console.error('AI API error:', error)
        return generateFallbackRoute(places, preferences)
    }
}

function generateFallbackRoute(places: any[], preferences: RoutePreferences) {
    // Fallback logic remains same just in case AI fails completely
    const days = []

    // Basit filtreleme ile otel olmayanları ayır
    const activityPlaces = places.filter(p => !p.category.includes('hotel') && !p.category.includes('lodging'))

    let placeIndex = 0

    for (let day = 1; day <= preferences.days; day++) {
        const activities = []
        const times = ['10:00', '14:00', '19:00']

        for (let i = 0; i < times.length; i++) {
            if (placeIndex >= activityPlaces.length) placeIndex = 0; // Başa dön

            const place = activityPlaces[placeIndex]
            activities.push({
                time: times[i],
                place: place.name,
                place_id: place.id,
                description: `${place.name} mekanında keyifli vakit geçirin.`,
                category: place.category || 'Gezi'
            })
            placeIndex++
        }
        days.push({ day, activities })
    }

    return {
        day_1_hotel: preferences.withAccommodation ? "Önerilen Otel (Sistem Hatası)" : null,
        days
    }
}
