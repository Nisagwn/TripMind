import admin from "firebase-admin";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { uploadImagesToFirebase } from './firebaseStorageClient';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  let serviceAccount: any;

  try {
    // Try to load from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Try to load from file
      let keyPath = path.resolve(process.cwd(), "serviceAccountKey.json");
      if (!fs.existsSync(keyPath)) {
        keyPath = path.resolve(process.cwd(), "serviceAccount.json");
      }

      if (fs.existsSync(keyPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      }
    }
  } catch (error) {
    console.error("Error loading service account:", error);
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tripmind-6e851.firebasestorage.app"
    });
  } else {
    console.warn("⚠️ Firebase Admin could not be initialized. Missing serviceAccountKey.json or FIREBASE_SERVICE_ACCOUNT env var.");
    // We might want to throw here if it's critical, but for now let's warn
  }
}

// const db = admin.firestore(); // Moved inside function

export async function savePlacesToFirestore(places: any[]) {
  if (!admin.apps.length) {
    console.error("❌ Firebase Admin not initialized. Cannot save to Firestore.");
    return;
  }
  const db = admin.firestore();

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
        // Eğer mevcut kayıtta reviews, userRatingsTotal, province veya district eksikse güncelle
        const doc = existing.docs[0];
        const existingData = doc.data();

        const updates: any = {};
        let needsUpdate = false;

        // Yorumlar veya puan eksikse
        if ((!existingData.reviews || existingData.reviews.length === 0) && place.reviews?.length > 0) {
          updates.reviews = place.reviews;
          updates.userRatingsTotal = place.userRatingsTotal || 0;
          needsUpdate = true;
        }

        // İl/İlçe eksikse
        if (!existingData.province && place.province) {
          updates.province = place.province;
          needsUpdate = true;
        }
        if (!existingData.district && place.district) {
          updates.district = place.district;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await doc.ref.update(updates);
          console.log(`🔄 Güncellendi (Veri zenginleştirildi): ${name}`);
        } else {
          console.log(`⚠️ Zaten güncel: ${name}`);
        }
        continue;
      }

      // 📷 Fotoğrafları işle
      let photoUrls: string[] = [];
      if (place.preComputedPhotoUrls) {
        photoUrls = place.preComputedPhotoUrls;
      } else {
        photoUrls = place.photos?.map((photo: any) => {
          const photoName = photo.name || "";
          return photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&maxHeightPx=1200&maxWidthPx=1200`
            : "";
        }).filter(Boolean) || [];
      }

      // 🪣 R2'ye yükle (ayarlandıysa)
      // 🪣 Firebase Storage'a yükle
      if (photoUrls.length > 0) {
        console.log(`  ☁️ Uploading ${photoUrls.length} images to Firebase Storage...`);
        const placeId = crypto.randomBytes(8).toString('hex');
        const storageUrls = await uploadImagesToFirebase(photoUrls.slice(0, 5), placeId); // Max 5 images
        if (storageUrls.length > 0) {
          photoUrls = storageUrls;
          console.log(`  ✅ Uploaded ${storageUrls.length} images to Firebase`);
        }
      }

      // 🔥 Yeni kayıt ekle
      await placesRef.add({
        name,
        address,
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
        imageUrl: photoUrls[0] || "/default-place.jpg",
        photos: photoUrls,
        rating: place.rating || 0,
        userRatingsTotal: place.userRatingsTotal || place.userRatingCount || 0, // Yorum sayısı
        reviews: place.reviews || [], // Google yorumları
        category: place.types?.[0] || "Genel",
        phone: place.internationalPhoneNumber || "",
        website: place.websiteUri || "",
        googleMapsUri: place.googleMapsUri || "",
        location: `${place.location?.latitude || 0}, ${place.location?.longitude || 0}`,
        district: place.district || "",
        province: place.province || "",
        description: place.editorialSummary?.text || "",
        price: place.price || "Bilinmiyor",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Kaydedildi: ${name}`);
    } catch (err) {
      console.error("❌ Kaydedilirken hata oluştu:", err);
    }
  }

  console.log(`✅ Firestore'a ${places.length} mekan kontrol edilip eklendi!`);
}
