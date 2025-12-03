import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

const db = admin.firestore();

async function deleteAllPlaces() {
  const placesRef = db.collection("places");
  const snapshot = await placesRef.get();

  if (snapshot.empty) {
    console.log("⚠️ Firestore'da kayıt bulunamadı.");
    return;
  }

  console.log(`🧹 ${snapshot.size} kayıt siliniyor...`);
  for (const place of snapshot.docs) {
    await placesRef.doc(place.id).delete();
    console.log(`🗑️ Silindi: ${place.data().name}`);
  }

  console.log("✅ Tüm mekanlar silindi!");
}

deleteAllPlaces().catch((err) => console.error("❌ Hata:", err));
