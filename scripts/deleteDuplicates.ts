import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

const db = admin.firestore();

async function deleteDuplicatePlaces() {
  const placesRef = db.collection("places");
  const snapshot = await placesRef.get();

  if (snapshot.empty) {
    console.log("⚠️ Hiç kayıt bulunamadı.");
    return;
  }

  const seenNames = new Set<string>();
  let deletedCount = 0;

  for (const place of snapshot.docs) {
    const name = place.data().name;

    if (seenNames.has(name)) {
      await placesRef.doc(place.id).delete();
      console.log(`🗑️ Tekrarlanan silindi: ${name}`);
      deletedCount++;
    } else {
      seenNames.add(name);
    }
  }

  console.log(`✅ ${deletedCount} tekrarlanan kayıt silindi.`);
}

deleteDuplicatePlaces().catch((err) => console.error("❌ Hata:", err));
