import axios from "axios";
import { savePlacesToFirestore } from "../lib/savePlacesToFirestore";
import dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env.local` });

const log = console.log;

// ============================================
// TripMind Route Planning Categories
// Her kategori kendi içinde Ucuz/Orta/Pahalı olarak sınıflandırılmış
// ============================================

// YEMEK - KAFE TARZI (Hafif atıştırma, içecek)
const FOOD_CAFE = {
    ucuz: ["cafe"],
    orta: [],
    pahali: [] // Kafe kategorisinde pahalı yok
};

const ACCOMMODATION = {
    ucuz: ["guest_house"],
    orta: ["hostel", "bed_and_breakfast", "motel"],
    pahali: ["lodging", "hotel", "resort_hotel"]
};

// YEMEK - RESTORAN TARZI (Tam öğün)
const FOOD_RESTAURANT = {
    ucuz: ["fast_food_restaurant"],
    orta: ["pizza_restaurant", "restaurant", "turkish_restaurant", "seafood_restaurant",],
    pahali: ["steak_house", "fine_dining_restaurant"]
};

// KÜLTÜR - Tarihi ve Sanatsal Yerler
const CULTURE = {
    ucuz: ["historical_place", "monument"], // Genelde ücretsiz/düşük ücret
    orta: ["museum", "art_gallery"],
    pahali: ["tourist_attraction", "performing_arts_theater", "opera_house"] // Bilet fiyatları yüksek
};

// EĞLENCE
const ENTERTAINMENT = {
    ucuz: ["shopping_mall"], // Ücretsiz alanlar
    orta: ["zoo", "aquarium", "bowling_alley", "movie_theater"],
    pahali: ["amusement_park", "night_club", "water_park"]
};

// SAHİL / BEACH
const BEACH = {
    ucuz: ["beach"], // Halk plajları
    orta: [],
    pahali: [] // Beach club'lar ayrı düşünülmeli
};

// KONAKLAMA


// Type to price mapping for quick lookup
const TYPE_PRICE_MAP: Record<string, string> = {};

function buildPriceMap(category: { ucuz: string[], orta: string[], pahali: string[] }) {
    category.ucuz.forEach(t => TYPE_PRICE_MAP[t] = "Ucuz");
    category.orta.forEach(t => TYPE_PRICE_MAP[t] = "Orta");
    category.pahali.forEach(t => TYPE_PRICE_MAP[t] = "Pahalı");
}

buildPriceMap(FOOD_CAFE);
buildPriceMap(FOOD_RESTAURANT);
buildPriceMap(CULTURE);
buildPriceMap(ENTERTAINMENT);
buildPriceMap(BEACH);
buildPriceMap(ACCOMMODATION);

// All types combined - ACCOMMODATION first
const ALL_TYPES = [
    ...ACCOMMODATION.ucuz, ...ACCOMMODATION.orta, ...ACCOMMODATION.pahali,
    ...FOOD_CAFE.ucuz, ...FOOD_CAFE.orta, ...FOOD_CAFE.pahali,
    ...FOOD_RESTAURANT.ucuz, ...FOOD_RESTAURANT.orta, ...FOOD_RESTAURANT.pahali,
    ...CULTURE.ucuz, ...CULTURE.orta, ...CULTURE.pahali,
    ...ENTERTAINMENT.ucuz, ...ENTERTAINMENT.orta, ...ENTERTAINMENT.pahali,
    ...BEACH.ucuz, ...BEACH.orta, ...BEACH.pahali
];

async function fetchAndSave(type: string) {
    const address = "Gümbet Yel Değirmeni Cd. No:4 48400 Bodrum/Muğla Türkiye";
    const limit = 10;
    const radius = 10000;

    let url = `http://localhost:3001/api/places?address=${encodeURIComponent(address)}&limit=${limit}&radius=${radius}&type=${type}`;

    log(`🚀 Fetching (${type}): ${url}`);

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (!data.places || data.places.length === 0) {
            log(`❌ No places for ${type}.`);
            return;
        }

        log(`✅ Found ${data.places.length} for ${type}.`);

        const placesToSave = data.places
            .filter((p: any) => {
                const googleTypes = p.types || [];
                const normalizedType = type.replace(/_/g, '').toLowerCase();
                return googleTypes.some((t: string) =>
                    t.replace(/_/g, '').toLowerCase().includes(normalizedType) ||
                    normalizedType.includes(t.replace(/_/g, '').toLowerCase())
                );
            })
            .map((p: any) => {
                let priceStr = TYPE_PRICE_MAP[type] || "Bilinmiyor";

                // Override with Google's price if available
                if (p.priceLevel !== undefined && p.priceLevel !== null) {
                    if (p.priceLevel === 0) priceStr = "Bedava";
                    else if (p.priceLevel === 1) priceStr = "Ucuz";
                    else if (p.priceLevel === 2) priceStr = "Orta";
                    else if (p.priceLevel >= 3) priceStr = "Pahalı";
                }

                log(`💰 ${p.title} -> ${priceStr}`);

                return {
                    displayName: { text: p.title },
                    formattedAddress: p.location.address,
                    location: {
                        latitude: p.location.coordinates.latitude,
                        longitude: p.location.coordinates.longitude
                    },
                    province: p.location.province,
                    district: p.location.district,
                    preComputedPhotoUrls: p.media.photoUrls || (p.media.photoUrl ? [p.media.photoUrl] : []),
                    rating: p.rating,
                    userRatingsTotal: p.userRatingsTotal || 0, // Yorum sayısı
                    reviews: p.reviews || [], // Yorumlar
                    types: [type],
                    editorialSummary: { text: p.description || p.title },
                    price: priceStr,
                    websiteUri: "",
                    googleMapsUri: ""
                };
            });

        if (placesToSave.length === 0) {
            log(`⚠️ No matching places for ${type}. Skipping.`);
            return;
        }

        log(`💾 Saving ${placesToSave.length} places...`);
        await savePlacesToFirestore(placesToSave);
        log("🎉 Done!");

    } catch (err: any) {
        log(`❌ Error (${type}): ${err.message}`);
    }
}

// ============================================
// ZİNCİR MARKALAR (Brand Search)
// ============================================
const CHAIN_BRANDS = {
    kafe: ["Starbucks", "Gloria Jeans", "Kahve Dünyası", "Tchibo", "Caribou Coffee"],
    konaklama: ["Hilton", "Ramada", "Marriott", "Radisson", "Rixos"],
    avm: ["Forum", "Piazza", "Optimum", "ÖzdilekPark", "Viaport", "Cevahir", "Kanyon", "Zorlu Center"],
    // İstanbul Turistik Yerler
    kultur: [
        "Topkapi Palace", "Dolmabahce Palace", "Hagia Sophia", "Blue Mosque",
        "Basilica Cistern", "Grand Bazaar", "Galata Tower", "Maiden's Tower",
        "Istanbul Archaeology Museums", "Suleymaniye Mosque", "Chora Church",
        "Rumeli Fortress", "Miniaturk", "Rahmi Koç Museum", "Istanbul Modern",
        "Pera Museum", "Sakıp Sabancı Museum"
    ]
};

async function fetchByKeyword(keyword: string, category: string) {
    // Kültür için Istanbul, diğerleri için mevcut şehir
    const address = category === "kultur" ? "Sultanahmet, Istanbul" : "Beyoğlu, İstanbul";
    const limit = 10;
    const radius = 15000; // Istanbul için daha geniş radius

    let url = `http://localhost:3001/api/places?address=${encodeURIComponent(address)}&limit=${limit}&radius=${radius}&keyword=${encodeURIComponent(keyword)}`;

    log(`🏪 Fetching brand (${keyword}): ${url}`);

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (!data.places || data.places.length === 0) {
            log(`❌ No places for ${keyword}.`);
            return;
        }

        log(`✅ Found ${data.places.length} for ${keyword}.`);

        // Filter only places that actually contain the keyword in their name
        const placesToSave = data.places
            .filter((p: any) => p.title.toLowerCase().includes(keyword.toLowerCase()))
            .map((p: any) => {
                const priceStr = "Orta"; // Chain brands are typically mid-price

                log(`🏪 ${p.title} -> ${priceStr}`);

                return {
                    displayName: { text: p.title },
                    formattedAddress: p.location.address,
                    location: {
                        latitude: p.location.coordinates.latitude,
                        longitude: p.location.coordinates.longitude
                    },
                    preComputedPhotoUrls: p.media.photoUrls || (p.media.photoUrl ? [p.media.photoUrl] : []),
                    rating: p.rating,
                    userRatingsTotal: p.userRatingsTotal || 0,
                    reviews: p.reviews || [],
                    types: [category],
                    editorialSummary: { text: p.description || p.title },
                    price: priceStr,
                    websiteUri: "",
                    googleMapsUri: ""
                };
            });

        if (placesToSave.length === 0) {
            log(`⚠️ No matching places for ${keyword}. Skipping.`);
            return;
        }

        log(`💾 Saving ${placesToSave.length} places...`);
        await savePlacesToFirestore(placesToSave);
        log("🎉 Done!");

    } catch (err: any) {
        log(`❌ Error (${keyword}): ${err.message}`);
    }
}

async function main() {
    log("🏁 TripMind Data Import Starting...");
    log(`📍 Total categories: ${ALL_TYPES.length}`);

    // Fetch by type
    for (const type of ALL_TYPES) {
        await fetchAndSave(type);
        await new Promise(r => setTimeout(r, 1000));
    }

    // Fetch chain brands
    log("🏪 Fetching chain brands...");
    for (const [category, brands] of Object.entries(CHAIN_BRANDS)) {
        for (const brand of brands) {
            await fetchByKeyword(brand, category);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    log("🏁 All done!");
}

main();
