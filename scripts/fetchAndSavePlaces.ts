import dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env.local` }); // ✅ Yol sabitlendi

console.log("📂 Working directory:", process.cwd());
console.log("🧩 ENV test (GOOGLE_MAPS_API_KEY):", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

import { fetchAllAntalyaPlaces, fetchAntalyaPlacesByCategory } from "../lib/googlePlaces";
import { savePlacesToFirestore } from "../lib/savePlacesToFirestore";
import redis from "../lib/redis";

async function main() {
  console.log("🚀 Antalya mekan verileri çekme işlemi başlatıldı...\n");

  // Fetch at least 100 places from Antalya with pagination
  const places = await fetchAllAntalyaPlaces(100);
  
  if (places.length === 0) {
    console.error("❌ Hiç mekan çekilemedi!");
    return;
  }

  console.log(`\n✅ Toplam ${places.length} mekan çekildi!`);
  console.log(`📊 Detaylar:`);
  console.log(`  - Ortalama puan: ${(places.reduce((sum, p) => sum + (p.rating || 0), 0) / places.length).toFixed(2)}`);
  console.log(`  - Puan alan mekan: ${places.filter(p => p.rating).length}`);
  console.log(`  - Fotoğraflı mekan: ${places.filter(p => p.photos && p.photos.length > 0).length}`);

  // Save to Firestore
  console.log("\n💾 Firestore'a kaydediliyor...");
  await savePlacesToFirestore(places);

  // Update Redis cache
  console.log("🧠 Redis cache güncelleniyor...");
  await redis.set("places_cache", JSON.stringify(places));
  await redis.set("last_update", new Date().toISOString());

  console.log("\n✅ İşlem tamamlandı!");
  console.log(`📍 ${places.length} mekan başarıyla Firestore ve Redis'e kaydedildi!`);
}

// Optional: Function to fetch by specific categories
async function fetchByCategories() {
  console.log("🚀 Kategorilere göre Antalya mekanları çekiliyor...\n");

  const categories = [
    "restoran",
    "kafe",
    "müze",
    "park",
    "sahil",
    "otel"
  ];

  let allPlaces: any[] = [];

  for (const category of categories) {
    console.log(`\n📂 "${category}" kategorisi işleniyor...`);
    const categoryPlaces = await fetchAntalyaPlacesByCategory(category, 20);
    
    // Merge and avoid duplicates
    for (const place of categoryPlaces) {
      const exists = allPlaces.some(
        (p) =>
          p.displayName?.text === place.displayName?.text &&
          p.formattedAddress === place.formattedAddress
      );
      if (!exists) {
        allPlaces.push(place);
      }
    }
    
    console.log(`  ✅ Toplam benzersiz mekan: ${allPlaces.length}`);
    
    // Wait between categories to avoid rate limiting
    if (category !== categories[categories.length - 1]) {
      console.log("⏳ Sonraki kategori için 3 saniye bekleniyor...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log(`\n✅ Kategorilerden toplam ${allPlaces.length} benzersiz mekan çekildi!`);

  // Save to Firestore
  console.log("\n💾 Firestore'a kaydediliyor...");
  await savePlacesToFirestore(allPlaces);

  // Update Redis cache
  console.log("🧠 Redis cache güncelleniyor...");
  await redis.set("places_cache", JSON.stringify(allPlaces));
  await redis.set("last_update", new Date().toISOString());

  console.log("\n✅ İşlem tamamlandı!");
  console.log(`📍 ${allPlaces.length} mekan başarıyla kaydedildi!`);
}

// Run main function (or use fetchByCategories for category-based fetching)
main().catch((err) => console.error("❌ Hata oluştu:", err));

// Uncomment below to fetch by categories instead:
// fetchByCategories().catch((err) => console.error("❌ Hata oluştu:", err));
