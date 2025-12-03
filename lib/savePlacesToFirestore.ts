import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

const db = admin.firestore();

export async function savePlacesToFirestore(places: any[]) {
  if (!places.length) return console.log("⚠️ Kayıt edilecek mekan yok.");

  console.log("🔥 Firestore'a veri kaydediliyor...");
  const placesRef = db.collection("places");

  for (const place of places) {
    try {
      const name = place.displayName?.text || "Bilinmeyen Mekan";
      const address = place.formattedAddress || "Adres yok";

      // 🔍 Aynı isimde mekan var mı kontrol et
      const existing = await placesRef.where("name", "==", name).get();

      if (!existing.empty) {
        console.log(`⚠️ Zaten kayıtlı: ${name}`);
        continue; // bu mekanı atla
      }

      // 📷 Fotoğrafları dönüştür
      const photoUrls =
        place.photos?.map((photo: any) => {
          const photoName = photo.name || "";
          return photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&maxHeightPx=1200&maxWidthPx=1200`
            : "";
        }).filter(Boolean) || [];

      // 🔥 Yeni kayıt ekle
      await placesRef.add({
        name,
        address,
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
        imageUrl: photoUrls[0] || "/default-place.jpg",
        photos: photoUrls,
        rating: place.rating || 0,
        userRatingCount: place.userRatingCount || 0,
        category: place.types?.[0] || "Genel",
        phone: place.internationalPhoneNumber || "",
        website: place.websiteUri || "",
        googleMapsUri: place.googleMapsUri || "",
        location: `${place.location?.latitude || 0}, ${place.location?.longitude || 0}`,
        description: place.editorialSummary?.text || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Kaydedildi: ${name}`);
    } catch (err) {
      console.error("❌ Kaydedilirken hata oluştu:", err);
    }
  }

  console.log(`✅ Firestore'a ${places.length} mekan kontrol edilip eklendi!`);
}
