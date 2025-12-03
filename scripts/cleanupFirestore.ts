import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase.js";   // ✔ DOĞRU VE ÇALIŞAN IMPORT

// Bir alt koleksiyondaki tüm belgeleri siler
async function deleteSubcollection(path: string) {
  const colRef = collection(db, path);
  const snap = await getDocs(colRef);

  if (snap.empty) {
    console.log("⚪ Alt koleksiyon boş:", path);
    return;
  }

  for (const d of snap.docs) {
    console.log("🗑 Siliniyor:", path + "/" + d.id);
    await deleteDoc(doc(db, path, d.id));
  }
}

// Asıl temizlik işlemi
async function cleanup() {
  console.log("🔥 Firestore temizleme başlıyor...");

  // 1) Mekan yorumları silinsin
  const placesSnap = await getDocs(collection(db, "places"));

  for (const place of placesSnap.docs) {
    await deleteSubcollection(`places/${place.id}/comments`);
  }

  // 2) Bütün kullanıcıların visitedPlaces + favorites temizliği
  const usersSnap = await getDocs(collection(db, "users"));

  for (const user of usersSnap.docs) {
    await deleteSubcollection(`users/${user.id}/visitedPlaces`);
    await deleteSubcollection(`users/${user.id}/favorites`);
  }

  console.log("✔ Temizlik tamamlandı!");
}

cleanup().catch(console.error);
