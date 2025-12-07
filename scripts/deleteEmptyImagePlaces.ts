import admin from "firebase-admin";
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    let serviceAccount: any;

    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else {
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
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        console.error("❌ Firebase Admin could not be initialized.");
        process.exit(1);
    }
}

async function deleteEmptyImagePlaces() {
    const db = admin.firestore();
    const placesRef = db.collection("places");

    console.log("🔍 Resim içermeyen kayıtlar aranıyor...");

    const snapshot = await placesRef.get();
    let deletedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const photos = data.photos || [];
        const imageUrl = data.imageUrl || "";

        // Check if there are no photos and no imageUrl
        const hasNoPhotos = photos.length === 0;
        const hasNoImageUrl = !imageUrl || imageUrl === "" || imageUrl === "/default-place.jpg";

        if (hasNoPhotos && hasNoImageUrl) {
            console.log(`🗑️ Siliniyor: ${data.name} (ID: ${doc.id})`);
            await doc.ref.delete();
            deletedCount++;
        } else {
            skippedCount++;
        }
    }

    console.log(`\n✅ Tamamlandı!`);
    console.log(`🗑️ Silinen: ${deletedCount}`);
    console.log(`✓ Kalan: ${skippedCount}`);
}

deleteEmptyImagePlaces();
