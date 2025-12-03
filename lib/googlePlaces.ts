import path from "path";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("🧩 ENV test (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY):", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function fetchPlacesFromGoogle(query: string) {
  if (!apiKey) {
    console.error("❌ Google API anahtarı bulunamadı!");
    return [];
  }

  try {
    console.log(`🌍 ${query} için Google Places API çağrılıyor...`);
    const response = await axios.post(
      "https://places.googleapis.com/v1/places:searchText",
      {
        textQuery: query,
        languageCode: "tr",
        regionCode: "TR",
        maxResultCount: 20,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.location,places.photos,places.rating,places.types,places.googleMapsUri",
        },
      }
    );

    const places = response.data.places || [];
    console.log(`✅ ${places.length} mekan bulundu.`);
    return places.filter((p: any) =>
      p.formattedAddress?.includes("Antalya")
    );
  } catch (err: any) {
    console.error("❌ API hatası:", err.response?.data || err.message);
    return [];
  }
}

export async function fetchAllAntalyaPlaces(minResults = 100) {
  const categories = [
    "restoran",
    "kafe",
    "müze",
    "park",
    "sahil",
    "otel",
    "bar",
    "alışveriş merkezi",
    "kahvaltı mekanı",
    "gece kulübü",
    "plaj",
    "doğal güzellik",
    "tarihi yer",
  ];

  let allPlaces: any[] = [];

  for (const category of categories) {
    console.log(`\n📂 Antalya ${category} aranıyor...`);
    const results = await fetchPlacesFromGoogle(`Antalya ${category}`);

    for (const place of results) {
      const exists = allPlaces.some(
        (p) =>
          p.displayName?.text === place.displayName?.text &&
          p.formattedAddress === place.formattedAddress
      );
      if (!exists) allPlaces.push(place);
    }

    console.log(`✅ Şu ana kadar ${allPlaces.length} benzersiz mekan bulundu.`);
    await new Promise((r) => setTimeout(r, 2000)); // rate-limit koruması
  }

  console.log(`\n🎯 Antalya'dan toplam ${allPlaces.length} mekan çekildi!`);
  return allPlaces;
}
// ✅ Antalya'dan belirli bir kategoriye göre mekan çek
export async function fetchAntalyaPlacesByCategory(category: string, limit = 20) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("❌ Google API anahtarı bulunamadı!");
    return [];
  }

  try {
    console.log(`🌍 Antalya ${category} mekanları çekiliyor...`);

    const response = await axios.post(
      "https://places.googleapis.com/v1/places:searchText",
      {
        textQuery: `Antalya ${category}`,
        languageCode: "tr",
        regionCode: "TR",
        maxResultCount: limit,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.location,places.photos,places.rating,places.types,places.googleMapsUri",
        },
      }
    );

    const places = response.data.places || [];
    console.log(`✅ ${places.length} mekan bulundu (${category}).`);
    return places.filter((p: any) => p.formattedAddress?.includes("Antalya"));
  } catch (err: any) {
    console.error(`❌ ${category} API hatası:`, err.response?.data || err.message);
    return [];
  }
}
